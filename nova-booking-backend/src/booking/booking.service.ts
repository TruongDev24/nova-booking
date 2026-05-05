import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RedisService } from '../redis/redis.service';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private paymentService: PaymentService,
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
    console.log('--- DEBUG TIME ---');
    console.log('Raw Server Time (now):', now.toISOString());
    console.log('Server Timezone Offset:', now.getTimezoneOffset());

    // ALWAYS generate 24 slots (00:00 to 23:00)
    for (let h = 0; h < 24; h++) {
      const startTime = `${h.toString().padStart(2, '0')}:00`;
      const endTime = `${(h + 1).toString().padStart(2, '0')}:00`;

      // 1. Check if Closed (Outside operating hours)
      let isClosed = false;
      if (!is24Hours) {
        if (openHour < closeHour) {
          // Normal day (e.g., 05:00 to 22:00)
          if (h < openHour || h >= closeHour) isClosed = true;
        } else {
          // Cross-day (e.g., 23:00 to 22:00)
          if (h >= closeHour && h < openHour) isClosed = true;
        }
      }

      // 2. Check if Past Time (Real-time comparison)
      const [year, month, day] = date.split('-').map(Number);
      // `date` and slot hours are interpreted as Asia/Ho_Chi_Minh (UTC+7).
      // Convert slot time to UTC millis for a timezone-stable comparison (Docker often runs UTC).
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
      const slotDateTime = new Date(slotUtcMs);
      // If it's exactly at slot start time, slot should be considered past/closed.
      const isPast = slotUtcMs <= now.getTime();

      if (h < 3) {
        console.log(
          `Slot: ${startTime}, SlotDateTime: ${slotDateTime.toISOString()}, isPast: ${isPast}`,
        );
      }

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
    const {
      courtId,
      bookingDate,
      slots,
      totalPrice,
      startTime: dtStartTime,
    } = dto;

    const court = await this.prisma.court.findUnique({
      where: { id: courtId },
    });
    if (!court) {
      throw new NotFoundException('Court not found');
    }

    const courtOpen = court.openingTime || '05:00';
    const courtClose = court.closingTime || '22:00';

    const cOpen = parseInt(courtOpen.split(':')[0], 10);
    let cClose = parseInt(courtClose.split(':')[0], 10);
    if (cClose <= cOpen) cClose += 24;

    const slotsToBook: string[] = [];
    if (slots && slots.length > 0) {
      slotsToBook.push(...slots);
    } else if (dtStartTime) {
      slotsToBook.push(dtStartTime);
    }

    if (slotsToBook.length === 0) {
      throw new BadRequestException('Vui lòng chọn khung giờ đặt sân');
    }

    // 1. Redis Distributed Lock Check
    for (const startTime of slotsToBook) {
      const lockKey = `booking_lock:${courtId}:${bookingDate}:${startTime}`;
      const isAcquired = await this.redisService.setnxWithExpire(
        lockKey,
        userId,
        600, // 10 minutes TTL
      );
      if (!isAcquired) {
        // Rollback any locks already acquired in this loop
        await this.releaseLocks(courtId, bookingDate, slotsToBook);
        throw new ConflictException(
          `Khung giờ ${startTime} đang có người thực hiện giao dịch. Vui lòng thử lại sau 10 phút.`,
        );
      }
    }

    const now = new Date();
    const [year, month, day] = bookingDate.split('-').map(Number);
    const VN_UTC_OFFSET_HOURS = 7;

    const finalBookings: Array<{ startTime: string; endTime: string }> = [];
    for (const startTime of slotsToBook) {
      let bStart = parseInt(startTime.split(':')[0], 10);
      let bEnd = bStart + 1;

      if (bStart < cOpen && cClose > 24) {
        bStart += 24;
        bEnd += 24;
      }

      // Check if Past Time (Real-time comparison)
      const slotUtcMs = Date.UTC(
        year,
        month - 1,
        day,
        (bStart % 24) - VN_UTC_OFFSET_HOURS,
        0,
        0,
        0,
      );
      if (slotUtcMs <= now.getTime()) {
        // Release locks on error
        await this.releaseLocks(courtId, bookingDate, slotsToBook);
        throw new BadRequestException(
          `Khung giờ ${startTime} đã trôi qua. Vui lòng chọn khung giờ khác.`,
        );
      }

      if (bStart < cOpen || bEnd > cClose) {
        await this.releaseLocks(courtId, bookingDate, slotsToBook);
        const realEndHour = (bStart + 1) % 24;
        const realEndTime = `${realEndHour.toString().padStart(2, '0')}:00`;
        throw new BadRequestException(
          `Khung giờ ${startTime}-${realEndTime} nằm ngoài giờ hoạt động (${courtOpen}-${court.closingTime})`,
        );
      }

      const realEndHour = bEnd % 24;
      const formattedEndTime = `${realEndHour.toString().padStart(2, '0')}:00`;

      finalBookings.push({ startTime, endTime: formattedEndTime });
    }

    const existing = await this.prisma.booking.findMany({
      where: {
        courtId,
        bookingDate,
        startTime: { in: finalBookings.map((b) => b.startTime) },
        status: { not: BookingStatus.CANCELLED },
      },
    });

    if (existing.length > 0) {
      await this.releaseLocks(courtId, bookingDate, slotsToBook);
      const bookedSlots = existing.map((b) => b.startTime).join(', ');
      throw new ConflictException(
        `Các khung giờ sau đã được đặt: ${bookedSlots}`,
      );
    }

    const pricePerSlot = court.pricePerHour;
    // totalPriceCalculated is used for verification logic if needed,
    // for now we trust the frontend price or can add a check here.
    const _totalPriceCalculated = pricePerSlot * slotsToBook.length;
    if (Math.abs(_totalPriceCalculated - totalPrice) > 1) {
      this.logger.warn(
        `Price mismatch for user ${userId}: Frontend=${totalPrice}, Backend=${_totalPriceCalculated}`,
      );
    }
    // 3. Generate Safe Order Code (Safe integer < 2^53 - 1)
    const orderCode = Number(
      `${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`,
    );

    try {
      // 2. Store Temp Payload in Redis (10 minutes TTL)
      const payload = {
        userId,
        courtId,
        courtName: court.name,
        bookingDate,
        slots: finalBookings,
        totalPrice,
      };

      await this.redisService.set(
        `temp_order:${orderCode}`,
        JSON.stringify(payload),
        600, // 10 minutes
      );

      // 5. Generate PayOS Payment Link
      const description = `Thanh toan ${slotsToBook.length} ca san`.slice(
        0,
        25,
      );
      const paymentLink = await this.paymentService.generatePayosLink(
        orderCode,
        totalPrice,
        description,
      );

      return {
        orderCode,
        checkoutUrl: paymentLink.checkoutUrl,
      };
    } catch (error) {
      await this.releaseLocks(courtId, bookingDate, slotsToBook);
      throw error;
    }
  }

  private async releaseLocks(courtId: string, date: string, slots: string[]) {
    for (const startTime of slots) {
      await this.redisService.del(
        `booking_lock:${courtId}:${date}:${startTime}`,
      );
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
        'Cannot cancel within 12 hours of playtime',
      );
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
  }

  // --- Admin Methods with Isolation ---

  async findAllAdmin(
    userId: string,
    query: PaginationQueryDto,
    status?: BookingStatus,
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
            select: { id: true, fullName: true, phone: true, email: true },
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

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Đơn hàng này đã được hủy trước đó');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
  }
}
