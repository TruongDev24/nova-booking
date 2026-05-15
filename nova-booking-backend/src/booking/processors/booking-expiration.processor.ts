import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';
import { RedisService } from '../../redis/redis.service';
import { Logger } from '@nestjs/common';
import { NotificationGateway } from '../../notification/notification.gateway';
import { BookingExpirationJobData } from '../interfaces/booking-expiration-job.interface';
import {
  BOOKING_EXPIRATION_QUEUE,
  BOOKING_EXPIRATION_JOB,
} from '../booking.constants';
import { MailerService } from '@nestjs-modules/mailer';

@Processor(BOOKING_EXPIRATION_QUEUE)
export class BookingExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingExpirationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private notificationGateway: NotificationGateway,
    private mailerService: MailerService,
  ) {
    super();
  }

  async process(job: Job<BookingExpirationJobData>) {
    if (job.name !== BOOKING_EXPIRATION_JOB) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return;
    }

    const { bookingIds, orderCode, userId, courtId, bookingDate, slots } =
      job.data;

    this.logger.log(
      `Processing checkout expiration for order ${orderCode}, bookings: ${bookingIds.join(', ')}`,
    );

    const releasedSlots: string[] = [];

    for (const id of bookingIds) {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
      });

      if (booking && booking.status === BookingStatus.PENDING) {
        await this.prisma.booking.update({
          where: { id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelReason: 'Hết hạn thanh toán',
          },
        });

        const lockKey = `booking_lock:${booking.courtId}:${booking.bookingDate}:${booking.startTime}`;
        await this.redisService.del(lockKey);
        releasedSlots.push(booking.startTime);

        this.logger.log(
          `Booking ${id} expired and cancelled. Lock released: ${lockKey}`,
        );
      }
    }

    if (releasedSlots.length === 0) {
      return;
    }

    await this.redisService.del(`temp_order:${orderCode}`);
    await this.redisService.srem(
      `user_pending_orders:${userId}`,
      orderCode.toString(),
    );

    this.notificationGateway.emitToRoom(
      `room_court_${courtId}`,
      'slots_released',
      {
        bookingDate,
        slots: releasedSlots,
      },
    );

    // --- EMAIL NOTIFICATION ---
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await this.mailerService.sendMail({
          to: user.email,
          subject: `[Nova Booking] Thông báo đơn đặt sân hết hạn thanh toán`,
          html: `
            <h3>Thông báo đơn hàng hết hạn</h3>
            <p>Chào <b>${user.fullName}</b>,</p>
            <p>Đơn đặt sân <b>${job.data.courtName}</b> ngày <b>${bookingDate}</b> (${slots.join(', ')}) của bạn đã bị hủy do hết hạn thanh toán (10 phút).</p>
            <p>Vui lòng thực hiện đặt lại nếu bạn vẫn có nhu cầu sử dụng sân.</p>
            <p>Trân trọng,<br/>Nova Booking Team</p>
          `,
        });
      }
    } catch (mailError) {
      const message =
        mailError instanceof Error ? mailError.message : String(mailError);
      this.logger.error(`Failed to send expiration email: ${message}`);
    }
  }
}
