import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking, BookingStatus, Prisma, RefundStatus } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RedisService } from '../redis/redis.service';
import { PaymentService } from '../payment/payment.service';
import { NotificationGateway } from '../notification/notification.gateway';
import {
  BOOKING_CHECKOUT_TTL_MS,
  BOOKING_EXPIRATION_JOB,
  BOOKING_EXPIRATION_QUEUE,
} from './booking.constants';
import { BookingExpirationJobData } from './interfaces/booking-expiration-job.interface';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private paymentService: PaymentService,
    private notificationGateway: NotificationGateway,
    @InjectQueue(BOOKING_EXPIRATION_QUEUE)
    private expirationQueue: Queue<BookingExpirationJobData>,
    private mailerService: MailerService,
  ) {}

  async getDailySlots(courtId: string, date: string) {
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    const courtOpen = court.openingTime || '05:00';
    const courtClose = court.closingTime || '22:00';

    const openHour = parseInt(courtOpen.split(':')[0], 10);
    const closeHour = parseInt(courtClose.split(':')[0], 10);
    const is24Hours = courtOpen === '00:00' && courtClose === '00:00';

    const dateParts = date.split('-').map(Number);
    if (dateParts.some(isNaN) || dateParts.length < 3) {
      throw new BadRequestException(
        'Định dạng ngày không hợp lệ (YYYY-MM-DD).',
      );
    }
    const [year, month, day] = dateParts;
    const normalizedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        courtId,
        bookingDate: normalizedDate,
        status: { not: BookingStatus.CANCELLED },
      },
    });

    // Get active locks from Redis (Pending payments)
    let lockedStartTimes: string[] = [];
    try {
      const lockPattern = `booking_lock:${courtId}:${normalizedDate}:*`;
      // Use a timeout to prevent Redis latency from blocking the entire request
      const lockedSlots = await Promise.race([
        this.redisService.getKeys(lockPattern),
        new Promise<string[]>((_, reject) =>
          setTimeout(() => reject(new Error('Redis Timeout')), 2000),
        ),
      ]);
      lockedStartTimes = lockedSlots
        .map((key) => {
          const parts = key.split(':');
          // Format is booking_lock:courtId:date:HH:mm
          // So HH is at index 3 and mm is at index 4
          if (parts.length >= 5) {
            return `${parts[3]}:${parts[4]}`;
          }
          return '';
        })
        .filter(Boolean);
    } catch (error) {
      this.logger.warn(
        `Redis lock fetch failed or timed out: ${error instanceof Error ? error.message : 'Unknown error'}. Continuing with DB data only.`,
      );
    }

    const slots: Array<{
      startTime: string;
      endTime: string;
      isBooked: boolean;
      isPending: boolean;
      isPast: boolean;
      isClosed: boolean;
      available: boolean;
      price: number;
    }> = [];

    const now = new Date();

    // ALWAYS generate 24 slots (00:00 to 23:00)
    for (let h = 0; h < 24; h++) {
      const startTime = `${h.toString().padStart(2, '0')}:00`;
      const endTime = `${(h + 1).toString().padStart(2, '0')}:00`;

      // 1. Check if Closed (Outside operating hours)
      let isClosed = false;
      if (!is24Hours) {
        if (openHour < closeHour) {
          if (h < openHour || h >= closeHour) isClosed = true;
        } else {
          if (h >= closeHour && h < openHour) isClosed = true;
        }
      }

      // 2. Check if Past Time (Real-time comparison)
      const [year, month, day] = date.split('-').map(Number);
      const VN_UTC_OFFSET_HOURS = 7;
      const slotUtcMs = Date.UTC(
        year,
        month - 1,
        day,
        h - VN_UTC_OFFSET_HOURS,
        0,
        0,
        0,
      );
      const isPast = slotUtcMs <= now.getTime();

      // 3. Check if Booked (DB) or Pending (Redis Lock)
      const isBooked = existingBookings.some((b) => b.startTime === startTime);
      const isPending = lockedStartTimes.includes(startTime);

      slots.push({
        startTime,
        endTime,
        isBooked,
        isPending,
        isPast,
        isClosed,
        available: !isBooked && !isPending && !isPast && !isClosed,
        price: court.pricePerHour,
      });
    }

    return slots;
  }

  async createMultiBooking(dto: CreateBookingDto, userId: string) {
    const { courtId, bookingDate, slots } = dto;

    // 1. Anti-Spam / Slot Hostage Prevention (Execute First)
    const pendingOrdersKey = `user_pending_orders:${userId}`;
    let pendingCount = 0;
    try {
      pendingCount = await this.redisService.scard(pendingOrdersKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Redis scard failure: ${message}`);
      throw new ServiceUnavailableException(
        'Hệ thống giữ chỗ đang bận, vui lòng thử lại sau',
      );
    }

    if (pendingCount >= 3) {
      throw new BadRequestException(
        'Bạn đã đạt giới hạn đơn hàng đang chờ thanh toán. Vui lòng thanh toán hoặc đợi các đơn hàng cũ hết hạn.',
      );
    }

    // 2. Database Validation (Before Locking)
    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
    });
    if (!court || court.isDeleted) {
      throw new NotFoundException(
        'Sân không tồn tại hoặc đã bị ngừng hoạt động.',
      );
    }

    // 3. Time & Business Rules Validation
    const courtOpen = court.openingTime || '05:00';
    const courtClose = court.closingTime || '22:00';
    const cOpen = parseInt(courtOpen.split(':')[0], 10);
    let cClose = parseInt(courtClose.split(':')[0], 10);
    if (cClose <= cOpen) cClose += 24;

    const now = new Date();
    const dateParts = bookingDate.split('-').map(Number);
    if (dateParts.some(isNaN) || dateParts.length < 3) {
      throw new BadRequestException(
        'Định dạng ngày không hợp lệ (YYYY-MM-DD).',
      );
    }
    const [year, month, day] = dateParts;
    const normalizedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const VN_UTC_OFFSET_HOURS = 7;

    const normalizedSlots: Array<{ startTime: string; endTime: string }> = [];

    for (const slotStartTime of slots) {
      const bStart = parseInt(slotStartTime.split(':')[0], 10);

      // Validation: Within operating hours
      let checkStart = bStart;
      if (checkStart < cOpen && cClose > 24) checkStart += 24;
      if (checkStart < cOpen || checkStart + 1 > cClose) {
        throw new BadRequestException(
          `Khung giờ ${slotStartTime} nằm ngoài giờ hoạt động của sân (${courtOpen} - ${court.closingTime}).`,
        );
      }

      // Validation: Future time check (Asia/Ho_Chi_Minh)
      const slotUtcMs = Date.UTC(
        year,
        month - 1,
        day,
        bStart - VN_UTC_OFFSET_HOURS,
        0,
        0,
        0,
      );
      if (slotUtcMs <= now.getTime()) {
        throw new BadRequestException(
          `Khung giờ ${slotStartTime} đã trôi qua. Vui lòng chọn khung giờ khác.`,
        );
      }

      const formattedEndTime = `${((bStart + 1) % 24)
        .toString()
        .padStart(2, '0')}:00`;
      normalizedSlots.push({
        startTime: slotStartTime,
        endTime: formattedEndTime,
      });
    }

    // 4. Secure Price Recalculation (The "1-Cent Hack" Fix)
    const calculatedTotalPrice = slots.length * court.pricePerHour;

    // 5. Robust Redis Locking (Atomic Batch)
    const lockRequests = slots.map((slotStartTime) => ({
      key: `booking_lock:${courtId}:${normalizedDate}:${slotStartTime}`,
      value: userId,
      ttl: 600, // 10 minutes
    }));

    let results: boolean[] = [];
    try {
      results = await this.redisService.multiSetnxWithExpire(lockRequests);
    } catch (error) {
      this.logger.error(
        `Redis multi-lock failure: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new ServiceUnavailableException(
        'Hệ thống giữ chỗ đang bận, vui lòng thử lại sau',
      );
    }

    const acquiredLocks: string[] = [];
    const failedIndices: number[] = [];

    results.forEach((isAcquired, index) => {
      if (isAcquired) {
        acquiredLocks.push(lockRequests[index].key);
      } else {
        failedIndices.push(index);
      }
    });

    if (failedIndices.length > 0) {
      // Rollback any locks that were acquired
      if (acquiredLocks.length > 0) {
        await Promise.all(
          acquiredLocks.map((key) => this.redisService.del(key)),
        );

        const releasedSlots = acquiredLocks
          .map((l) => {
            const parts = l.split(':');
            return parts.length >= 5 ? `${parts[3]}:${parts[4]}` : '';
          })
          .filter(Boolean);
        this.notificationGateway.emitToRoom(
          `room_court_${courtId}`,
          'slots_released',
          {
            bookingDate: normalizedDate,
            slots: releasedSlots,
          },
        );
      }

      throw new ConflictException(
        'Một hoặc nhiều khung giờ đã có người đặt hoặc đang thanh toán. Vui lòng thử lại sau.',
      );
    }

    // Trigger 2: Inventory Sync - Slots Locked
    this.notificationGateway.emitToRoom(
      `room_court_${courtId}`,
      'slots_locked',
      {
        bookingDate: normalizedDate,
        slots: slots,
      },
    );

    // Double check DB for existing bookings after locking
    const existing = await this.prisma.booking.findMany({
      where: {
        courtId,
        bookingDate: normalizedDate,
        startTime: { in: slots },
        status: { not: BookingStatus.CANCELLED },
      },
    });

    if (existing.length > 0) {
      for (const key of acquiredLocks) await this.redisService.del(key);
      const bookedSlots = existing.map((b) => b.startTime).join(', ');
      throw new ConflictException(
        `Các khung giờ sau đã được đặt: ${bookedSlots}`,
      );
    }

    // 6. PENDING bookings + temp order + delayed expiration job
    const orderCode = Math.floor(Math.random() * 9007199254740991);
    const expiresAt = new Date(Date.now() + BOOKING_CHECKOUT_TTL_MS);
    const pricePerSlot = calculatedTotalPrice / normalizedSlots.length;
    const checkoutTtlSeconds = BOOKING_CHECKOUT_TTL_MS / 1000;
    let bookingIds: string[] = [];

    try {
      const pendingBookings = await this.prisma.$transaction(async (tx) => {
        const created: Booking[] = [];
        for (const slot of normalizedSlots) {
          const booking = await tx.booking.create({
            data: {
              userId,
              courtId,
              bookingDate: normalizedDate,
              startTime: slot.startTime,
              endTime: slot.endTime,
              totalPrice: pricePerSlot,
              status: BookingStatus.PENDING,
              payosOrderCode: BigInt(orderCode),
              expiresAt,
            },
          });
          created.push(booking);
        }
        return created;
      });
      bookingIds = pendingBookings.map((b) => b.id);

      const payload = {
        userId,
        courtId,
        courtName: court.name,
        bookingDate: normalizedDate,
        slots: normalizedSlots,
        totalPrice: calculatedTotalPrice,
      };

      await this.redisService.set(
        `temp_order:${orderCode}`,
        JSON.stringify(payload),
        checkoutTtlSeconds,
      );

      await this.redisService.sadd(pendingOrdersKey, orderCode.toString());
      await this.redisService.expire(pendingOrdersKey, checkoutTtlSeconds);

      await this.expirationQueue.add(
        BOOKING_EXPIRATION_JOB,
        {
          bookingIds,
          orderCode,
          userId,
          courtId,
          courtName: court.name,
          bookingDate: normalizedDate,
          slots: normalizedSlots.map((s) => s.startTime),
        },
        {
          delay: BOOKING_CHECKOUT_TTL_MS,
          jobId: `expire-order-${orderCode}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      // 7. PayOS Link Generation
      const description = `Thanh toan ${slots.length} ca san`.slice(0, 25);
      const paymentLink = await this.paymentService.generatePayosLink(
        orderCode,
        calculatedTotalPrice,
        description,
      );

      // 8. Notify Owner in Real-time (Pending)
      this.notificationGateway.notifyOwner(court.ownerId, 'booking_initiated', {
        orderCode,
        courtName: court.name,
        totalPrice: calculatedTotalPrice,
        bookingDate: normalizedDate,
        slots: slots,
      });

      return {
        orderCode,
        checkoutUrl: paymentLink.checkoutUrl,
      };
    } catch (error) {
      await this.cleanupPendingCheckout(
        bookingIds,
        orderCode,
        acquiredLocks,
        pendingOrdersKey,
      );
      this.logger.error(`Booking creation failed for user ${userId}:`, error);
      throw error;
    }
  }

  private async cleanupPendingCheckout(
    bookingIds: string[],
    orderCode: number,
    acquiredLocks: string[],
    pendingOrdersKey: string,
  ) {
    if (bookingIds.length > 0) {
      await this.prisma.booking.deleteMany({
        where: {
          id: { in: bookingIds },
          status: BookingStatus.PENDING,
        },
      });
    }
    for (const key of acquiredLocks) {
      await this.redisService.del(key);
    }
    await this.redisService.del(`temp_order:${orderCode}`);
    await this.redisService.srem(pendingOrdersKey, orderCode.toString());
    try {
      const job = await this.expirationQueue.getJob(
        `expire-order-${orderCode}`,
      );
      if (job) await job.remove();
    } catch {
      // Job may not exist if failure happened before enqueue
    }
  }

  async completePastBookings() {
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = vnTime.toISOString().split('T')[0];
    const currentHour = vnTime.getUTCHours().toString().padStart(2, '0');
    const currentMin = vnTime.getUTCMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMin}`;

    try {
      const result = await this.prisma.booking.updateMany({
        where: {
          status: BookingStatus.CONFIRMED,
          OR: [
            { bookingDate: { lt: todayStr } },
            {
              bookingDate: todayStr,
              endTime: { lt: currentTimeStr },
            },
          ],
        },
        data: {
          status: BookingStatus.COMPLETED,
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Successfully completed ${result.count} past bookings.`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to update past bookings status:', error);
    }
  }

  async findMyBookings(userId: string) {
    await this.completePastBookings();
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        court: true,
        review: true,
      },
      orderBy: {
        bookingDate: 'desc',
      },
    });
  }

  async cancelBooking(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { court: true, user: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy lịch đặt');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền hủy lịch này');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Lịch này đã được hủy trước đó');
    }

    // Allow cancellation for PENDING or PAID (Confirmed)
    const isPaid = booking.paymentStatus === 'PAID';
    const isPending = booking.status === BookingStatus.PENDING;

    if (!isPending && !isPaid) {
      throw new BadRequestException(
        'Chỉ có thể hủy đơn đang chờ thanh toán hoặc đã thanh toán thành công.',
      );
    }

    // Additional checks for PAID bookings (cancellation policy)
    if (isPaid) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { bankAccountNumber: true, bankName: true },
      });

      if (!user?.bankAccountNumber || !user?.bankName) {
        throw new BadRequestException(
          'Vui lòng cập nhật thông tin ngân hàng trong trang Cá nhân trước khi thực hiện hủy đơn để chúng tôi có thể hoàn tiền cho bạn.',
        );
      }

      // 12-hour cancellation policy
      const [year, month, day] = booking.bookingDate.split('-').map(Number);
      const [hour, minute] = booking.startTime.split(':').map(Number);
      const VN_UTC_OFFSET_HOURS = 7;

      const playTimeMs = Date.UTC(
        year,
        month - 1,
        day,
        hour - VN_UTC_OFFSET_HOURS,
        minute,
        0,
        0,
      );

      const hoursDiff = (playTimeMs - Date.now()) / (1000 * 60 * 60);
      if (hoursDiff < 12) {
        throw new BadRequestException(
          'Không thể hủy lịch trong vòng 12 giờ trước giờ bắt đầu chơi.',
        );
      }
    }

    // --- BATCH CANCELLATION FOR PENDING ORDERS ---
    let bookingsToCancel = [booking];
    if (isPending && booking.payosOrderCode) {
      bookingsToCancel = await this.prisma.booking.findMany({
        where: {
          payosOrderCode: booking.payosOrderCode,
          status: BookingStatus.PENDING,
        },
        include: { court: true, user: true },
      });
    }

    const bookingIds = bookingsToCancel.map((b) => b.id);

    await this.prisma.booking.updateMany({
      where: { id: { in: bookingIds } },
      data: {
        status: BookingStatus.CANCELLED,
        cancelReason: isPending
          ? 'Người dùng chủ động hủy thanh toán.'
          : 'Người dùng chủ động hủy.',
        refundStatus: isPaid ? 'PENDING' : 'NONE',
      },
    });

    // --- RELEASE ALL REDIS LOCKS ---
    for (const b of bookingsToCancel) {
      const lockKey = `booking_lock:${b.courtId}:${b.bookingDate}:${b.startTime}`;
      await this.redisService.del(lockKey);

      // Notify real-time for each slot
      this.notificationGateway.emitToRoom(
        `room_court_${b.courtId}`,
        'slots_released',
        {
          bookingDate: b.bookingDate,
          slots: [b.startTime],
        },
      );
    }

    // --- CLEANUP ORDER STATE ---
    if (isPending && booking.payosOrderCode) {
      const orderCode = booking.payosOrderCode?.toString();
      if (orderCode) {
        await this.redisService.del(`temp_order:${orderCode}`);
        await this.redisService.srem(
          `user_pending_orders:${userId}`,
          orderCode,
        );
      }
    }

    // --- NOTIFY OWNER ---
    this.notificationGateway.notifyOwner(
      booking.court.ownerId,
      'booking_canceled',
      {
        id: booking.id,
        courtName: booking.court.name,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        reason: isPending ? 'Khách hủy thanh toán.' : 'Khách chủ động hủy đơn.',
        canceledBy: 'CUSTOMER',
      },
    );

    // --- EMAIL NOTIFICATION ---
    try {
      await this.mailerService.sendMail({
        to: booking.user.email,
        subject: `[Nova Booking] Thông báo hủy đơn đặt sân thành công`,
        html: `
          <h3>Thông báo hủy đơn thành công</h3>
          <p>Chào <b>${booking.user.fullName}</b>,</p>
          <p>Yêu cầu hủy đơn đặt sân <b>${booking.court.name}</b> của bạn đã được thực hiện thành công.</p>
          <ul>
            <li><b>Ngày chơi:</b> ${booking.bookingDate}</li>
            <li><b>Các khung giờ:</b> ${bookingsToCancel.map((b) => b.startTime).join(', ')}</li>
            ${isPaid ? '<li><b>Trạng thái hoàn tiền:</b> Đang chờ xử lý.</li>' : ''}
          </ul>
          <p>Cảm ơn bạn đã sử dụng dịch vụ của Nova Booking!</p>
        `,
      });
    } catch (mailError) {
      this.logger.error(`Failed to send cancellation email: ${mailError}`);
    }

    return { success: true, cancelledCount: bookingsToCancel.length };
  }

  // --- Admin Methods with Isolation ---

  async findAllAdmin(
    userId: string,
    query: PaginationQueryDto,
    status?: BookingStatus,
    refundStatus?: string,
    startDate?: string,
    endDate?: string,
  ) {
    await this.completePastBookings();
    const { page = 1, limit = 10, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // STRICT ISOLATION: Only bookings for courts owned by this user
    const where: Prisma.BookingWhereInput = {
      court: { ownerId: userId },
    };

    if (status) {
      where.status = status;
    }

    if (refundStatus) {
      where.refundStatus = refundStatus as RefundStatus;
    }

    // Date Range Filtering
    const start = startDate?.trim();
    const end = endDate?.trim();
    if (start || end) {
      const dateFilter: Prisma.StringFilter = {};
      if (start) dateFilter.gte = start;
      if (end) dateFilter.lte = end;
      where.bookingDate = dateFilter;
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim().startsWith('#')
        ? search.trim().slice(1)
        : search.trim();

      where.OR = [
        {
          id: { contains: cleanSearch, mode: 'insensitive' },
        },
        {
          user: {
            fullName: { contains: cleanSearch, mode: 'insensitive' },
          },
        },
        {
          user: {
            phone: { contains: cleanSearch },
          },
        },
        {
          court: {
            name: { contains: cleanSearch, mode: 'insensitive' },
          },
        },
      ];
    }

    const orderBy: Prisma.BookingOrderByWithRelationInput = {};
    if (sortBy) {
      if (sortBy === 'userName') {
        orderBy.user = { fullName: sortOrder || 'asc' };
      } else if (sortBy === 'courtName') {
        orderBy.court = { name: sortOrder || 'asc' };
      } else {
        orderBy[sortBy] = sortOrder || 'asc';
      }
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              bankName: true,
              bankAccountNumber: true,
              bankAccountName: true,
            },
          },
          court: {
            select: { id: true, name: true, location: true },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit) || 1,
      },
    };
  }

  async confirmBooking(id: string, ownerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { court: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân');
    }

    // Ownership check
    if (booking.court.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không có quyền xác nhận đơn hàng này');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể xác nhận đơn hàng đang ở trạng thái chờ',
      );
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CONFIRMED },
    });
  }

  async cancelBookingAdmin(id: string, ownerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { court: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân');
    }

    // Ownership check
    if (booking.court.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn hàng này');
    }

    // Business Rule: Admins cannot cancel bookings anymore. Only Users can cancel.
    throw new ForbiddenException(
      'Chủ sân không được phép tự ý hủy đơn của khách',
    );
  }

  async markAsRefunded(id: string, adminId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        court: true,
        user: {
          select: {
            bankName: true,
            bankAccountNumber: true,
            bankAccountName: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân');
    }

    // Ownership check: Admin or Court Owner
    if (booking.court.ownerId !== adminId) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    if (booking.status !== BookingStatus.CANCELLED) {
      throw new BadRequestException(
        'Chỉ có thể hoàn tiền cho những đơn đã bị hủy',
      );
    }

    if (booking.refundStatus !== 'PENDING') {
      throw new BadRequestException('Đơn này không ở trạng thái chờ hoàn tiền');
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        refundStatus: 'COMPLETED',
        paymentStatus: 'REFUNDED',
      },
    });
  }
}
