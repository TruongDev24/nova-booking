import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';
import { RedisService } from '../redis/redis.service';
import { Logger } from '@nestjs/common';

@Processor('booking-expiration')
export class BookingExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingExpirationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {
    super();
  }

  async process(job: Job<{ bookingIds: string[] }>) {
    const data = job.data;
    const { bookingIds } = data;
    this.logger.log(
      `Checking expiration for bookings: ${bookingIds.join(', ')}`,
    );

    for (const id of bookingIds) {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
      });

      // If still PENDING after 10 mins, cancel it
      if (booking && booking.status === BookingStatus.PENDING) {
        await this.prisma.booking.update({
          where: { id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelReason: 'Hết hạn thanh toán (10 phút)',
          },
        });

        // Release the Redis lock
        const lockKey = `booking_lock:${booking.courtId}:${booking.bookingDate}:${booking.startTime}`;
        await this.redisService.del(lockKey);

        this.logger.log(
          `Booking ${id} expired and cancelled. Lock released: ${lockKey}`,
        );
      }
    }
  }
}
