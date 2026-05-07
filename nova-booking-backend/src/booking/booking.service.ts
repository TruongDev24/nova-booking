import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus, Prisma, RefundStatus } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RedisService } from '../redis/redis.service';
import { PaymentService } from '../payment/payment.service';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private paymentService: PaymentService,
    private notificationGateway: NotificationGateway,
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

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        courtId,
        bookingDate: date,
        status: { not: BookingStatus.CANCELLED },
      },
    });

    // Get active locks from Redis (Pending payments)
    let lockedStartTimes: string[] = [];
    try {
      const lockPattern = `booking_lock:${courtId}:${date}:*`;
      const lockedSlots = await this.redisService.getKeys(lockPattern);
      lockedStartTimes = lockedSlots.map((key) => key.split(':').pop() || '');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        'Failed to fetch Redis locks, continuing with DB data only:',
        message,
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
    const [year, month, day] = bookingDate.split('-').map(Number);
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

    // 5. Robust Redis Locking (All or Nothing)
    const acquiredLocks: string[] = [];
    for (const slotStartTime of slots) {
      const lockKey = `booking_lock:${courtId}:${bookingDate}:${slotStartTime}`;
      let isAcquired = false;
      try {
        isAcquired = await this.redisService.setnxWithExpire(
          lockKey,
          userId,
          600, // 10 minutes TTL
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Redis locking failure: ${message}`);
        throw new ServiceUnavailableException(
          'Hệ thống giữ chỗ đang bận, vui lòng thử lại sau',
        );
      }

      if (!isAcquired) {
        // CRITICAL: Release all acquired locks if any single one fails
        for (const key of acquiredLocks) {
          try {
            await this.redisService.del(key);
          } catch {
            // Silent catch on cleanup
          }
        }

        // Trigger 3: Inventory Sync - Slots Released (Partial Rollback)
        if (acquiredLocks.length > 0) {
          const releasedSlots = acquiredLocks.map((l) => l.split(':').pop());
          this.notificationGateway.emitToRoom(
            `room_court_${courtId}`,
            'slots_released',
            {
              bookingDate,
              slots: releasedSlots,
            },
          );
        }

        throw new ConflictException(
          'Sân đã có người đặt hoặc đang trong quá trình thanh toán. Vui lòng thử lại sau.',
        );
      }
      acquiredLocks.push(lockKey);
    }

    // Trigger 2: Inventory Sync - Slots Locked
    this.notificationGateway.emitToRoom(
      `room_court_${courtId}`,
      'slots_locked',
      {
        bookingDate,
        slots: slots,
      },
    );

    // Double check DB for existing bookings after locking
    const existing = await this.prisma.booking.findMany({
      where: {
        courtId,
        bookingDate,
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

    // 6. Save Temp Order & Register User Lock
    const orderCode = Math.floor(Math.random() * 9007199254740991);

    try {
      const payload = {
        userId,
        courtId,
        courtName: court.name,
        bookingDate,
        slots: normalizedSlots,
        totalPrice: calculatedTotalPrice,
      };

      await this.redisService.set(
        `temp_order:${orderCode}`,
        JSON.stringify(payload),
        600, // 10 minutes TTL
      );

      // Add to user's pending set
      await this.redisService.sadd(pendingOrdersKey, orderCode.toString());
      await this.redisService.expire(pendingOrdersKey, 600);

      // 7. PayOS Link Generation
      const description = `Thanh toan ${slots.length} ca san`.slice(0, 25);
      const paymentLink = await this.paymentService.generatePayosLink(
        orderCode,
        calculatedTotalPrice,
        description,
      );

      return {
        orderCode,
        checkoutUrl: paymentLink.checkoutUrl,
      };
    } catch (error) {
      // Cleanup on failure
      for (const key of acquiredLocks) await this.redisService.del(key);
      await this.redisService.srem(pendingOrdersKey, orderCode.toString());
      this.logger.error(`Booking creation failed for user ${userId}:`, error);
      throw error;
    }
  }

  async findMyBookings(userId: string) {
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
      include: { court: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy lịch đặt');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền hủy lịch này');
    }

    // Only PAID bookings can be cancelled by user
    if (booking.paymentStatus !== 'PAID') {
      throw new BadRequestException(
        'Chỉ có thể hủy những lịch đã thanh toán thành công.',
      );
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Lịch này đã được hủy trước đó');
    }

    // --- NEW: Hard Lock - Must have bank info to cancel PAID booking ---
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

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        refundStatus: 'PENDING', // Initialize refund workflow
      },
    });

    // --- REAL-TIME EMISSIONS ---
    this.notificationGateway.emitToRoom(
      `room_court_${booking.courtId}`,
      'slots_released',
      {
        bookingDate: booking.bookingDate,
        slots: [booking.startTime],
      },
    );

    this.notificationGateway.notifyOwner(
      booking.court.ownerId,
      'booking_canceled',
      {
        id: booking.id,
        courtName: booking.court.name,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        reason: 'Khách hàng chủ động hủy lịch.',
        canceledBy: 'CUSTOMER',
      },
    );

    return updatedBooking;
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
    if (startDate || endDate) {
      const dateFilter: Prisma.StringFilter = {};
      if (startDate) dateFilter.gte = startDate;
      if (endDate) dateFilter.lte = endDate;
      where.bookingDate = dateFilter;
    }

    if (search && search.trim()) {
      where.OR = [
        {
          user: {
            fullName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          user: {
            phone: { contains: search },
          },
        },
        {
          court: {
            name: { contains: search, mode: 'insensitive' },
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
