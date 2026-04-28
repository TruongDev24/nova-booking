import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus, Prisma } from '@prisma/client';

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

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

    const slots: Array<{
      startTime: string;
      endTime: string;
      isBooked: boolean;
      isPast: boolean;
      isClosed: boolean;
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

      // 3. Check if Booked
      const isBooked = existingBookings.some((b) => b.startTime === startTime);

      slots.push({
        startTime,
        endTime,
        isBooked,
        isPast,
        isClosed,
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

    const now = new Date();
    const [year, month, day] = bookingDate.split('-').map(Number);
    const VN_UTC_OFFSET_HOURS = 7;

    const finalBookings = slotsToBook.map((startTime) => {
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
        throw new BadRequestException(
          `Khung giờ ${startTime} đã trôi qua. Vui lòng chọn khung giờ khác.`,
        );
      }

      if (bStart < cOpen || bEnd > cClose) {
        const realEndHour = (bStart + 1) % 24;
        const realEndTime = `${realEndHour.toString().padStart(2, '0')}:00`;
        throw new BadRequestException(
          `Khung giờ ${startTime}-${realEndTime} nằm ngoài giờ hoạt động (${courtOpen}-${court.closingTime})`,
        );
      }

      const realEndHour = bEnd % 24;
      const formattedEndTime = `${realEndHour.toString().padStart(2, '0')}:00`;

      return { startTime, endTime: formattedEndTime };
    });

    const existing = await this.prisma.booking.findMany({
      where: {
        courtId,
        bookingDate,
        startTime: { in: finalBookings.map((b) => b.startTime) },
        status: { not: BookingStatus.CANCELLED },
      },
    });

    if (existing.length > 0) {
      const bookedSlots = existing.map((b) => b.startTime).join(', ');
      throw new ConflictException(
        `Các khung giờ sau đã được đặt: ${bookedSlots}`,
      );
    }

    const pricePerSlot = totalPrice / finalBookings.length;

    return this.prisma.$transaction(
      finalBookings.map((slot) => {
        return this.prisma.booking.create({
          data: {
            courtId,
            userId,
            bookingDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            totalPrice: pricePerSlot,
            status: BookingStatus.PENDING,
          },
        });
      }),
    );
  }

  async findMyBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { court: true },
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

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
  }

  // --- Admin Methods with Isolation ---

  async findAllAdmin(
    userId: string,
    page = 1,
    limit = 10,
    search = '',
    status?: BookingStatus,
    startDate?: string,
    endDate?: string,
  ) {
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

    if (search.trim()) {
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
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
