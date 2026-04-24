import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus } from '@prisma/client';

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

    // Logic: Nếu closingTime là 00:00, ta coi đó là giờ thứ 24
    const openTimeStr = court.openingTime || '05:00';
    const closeTimeStr = court.closingTime || '22:00';

    let openingHour = parseInt(openTimeStr.split(':')[0], 10);
    let closingHour = parseInt(closeTimeStr.split(':')[0], 10);

    if (closeTimeStr === '00:00') closingHour = 24;

    // Fallbacks
    if (isNaN(openingHour)) openingHour = 5;
    if (isNaN(closingHour)) closingHour = 22;

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        courtId,
        bookingDate: date,
        status: { not: BookingStatus.CANCELLED },
      },
    });

    const now = new Date();
    // UTC+7 Offset calculation
    const vnNow = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const todayStr = now.toISOString().split('T')[0];
    const currentHour = now.getHours();

    const slots: Array<{
      startTime: string;
      endTime: string;
      isBooked: boolean;
      isPast: boolean;
      price: number;
    }> = [];

    for (let hour = openingHour; hour < closingHour; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const nextHour = hour + 1;
      const endTime = nextHour === 24 ? '00:00' : `${nextHour.toString().padStart(2, '0')}:00`;

      // Check if slot is in the past
      const isPast = date < todayStr || (date === todayStr && hour <= currentHour);
      const isBooked = existingBookings.some((b) => b.startTime === startTime);

      slots.push({
        startTime,
        endTime,
        isBooked: isBooked || isPast,
        isPast,
        price: court.pricePerHour,
      });
    }

    return slots;
  }

  async createMultiBooking(dto: CreateBookingDto, userId: string) {
    const { courtId, bookingDate, slots, totalPrice, startTime: dtStartTime } = dto;

    const court = await this.prisma.court.findUnique({ where: { id: courtId } });
    if (!court) {
      throw new NotFoundException('Court not found');
    }

    // Phase 1: Robust fallback logic for operating hours
    const courtOpen = court.openingTime || '05:00';
    const courtClose = court.closingTime === '00:00' ? '24:00' : (court.closingTime || '22:00');

    // Normalize slots
    const slotsToBook: string[] = [];
    if (slots && slots.length > 0) {
      slotsToBook.push(...slots);
    } else if (dtStartTime) {
      slotsToBook.push(dtStartTime);
    }

    if (slotsToBook.length === 0) {
       throw new BadRequestException('Vui lòng chọn khung giờ đặt sân');
    }

    // Phase 2: Enforce 1-hour interval and Validate Hours (Midnight-Safe)
    const finalBookings = slotsToBook.map((startTime) => {
      const startHour = parseInt(startTime.split(':')[0], 10);
      const nextHour = startHour + 1;
      
      const effectiveStartTime = startTime;
      const effectiveEndTime = nextHour === 24 ? '24:00' : `${nextHour.toString().padStart(2, '0')}:00`;
      const realEndTime = nextHour === 24 ? '00:00' : effectiveEndTime;

      // Validation using String Comparison (Midnight safe)
      if (effectiveStartTime < courtOpen || effectiveEndTime > courtClose) {
        throw new BadRequestException(`Khung giờ ${startTime}-${realEndTime} nằm ngoài giờ hoạt động (${courtOpen}-${court.closingTime})`);
      }

      return { startTime, endTime: realEndTime };
    });

    // 2. Concurrency Protection
    const existing = await this.prisma.booking.findMany({
      where: {
        courtId,
        bookingDate,
        startTime: { in: finalBookings.map(b => b.startTime) },
        status: { not: BookingStatus.CANCELLED },
      },
    });

    if (existing.length > 0) {
      const bookedSlots = existing.map((b) => b.startTime).join(', ');
      throw new ConflictException(`Các khung giờ sau đã được đặt: ${bookedSlots}`);
    }

    // 3. Atomic creation
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
        bookingDate: 'desc'
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
}
