import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BookingStatus } from '@prisma/client';
import {
  BOOKING_EXPIRATION_QUEUE,
  BOOKING_EXPIRATION_JOB,
  BOOKING_CHECKOUT_TTL_MS,
} from '../booking/booking.constants';
import { BookingExpirationJobData } from '../booking/interfaces/booking-expiration-job.interface';

interface TempOrderPayload {
  userId: string;
  courtId: string;
  courtName: string;
  bookingDate: string;
  slots: Array<{
    startTime: string;
    endTime: string;
  }>;
  totalPrice: number;
}

@Injectable()
export class PaymentService {
  private payos: PayOS;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redisService: RedisService,
    private notificationGateway: NotificationGateway,
    @InjectQueue(BOOKING_EXPIRATION_QUEUE)
    private expirationQueue: Queue<BookingExpirationJobData>,
  ) {
    this.payos = new PayOS({
      clientId: this.configService.get<string>('PAYOS_CLIENT_ID'),
      apiKey: this.configService.get<string>('PAYOS_API_KEY'),
      checksumKey: this.configService.get<string>('PAYOS_CHECKSUM_KEY'),
    });
  }

  async generatePayosLink(
    orderCode: number,
    amount: number,
    description: string,
  ) {
    const domain =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const body = {
      orderCode: orderCode,
      amount: amount,
      description: description.slice(0, 25),
      returnUrl: `${domain}/user/bookings/payment-success`,
      cancelUrl: `${domain}/user/bookings/payment-cancel`,
    };

    try {
      const paymentLinkResponse = await this.payos.paymentRequests.create(body);
      return paymentLinkResponse;
    } catch (error) {
      this.logger.error('Lỗi khi tạo PayOS:', error);
      throw new BadRequestException('Không thể tạo liên kết thanh toán');
    }
  }

  /**
   * Refactored Webhook Handler (Phase 3)
   * Implements strict idempotency, amount verification, and atomic fulfillment.
   */
  async handleWebhook(body: unknown) {
    this.logger.log('--- PAYOS WEBHOOK RECEIVED ---');

    try {
      // 1. PayOS Signature Verification (Strict)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const verifiedData = (await this.payos.webhooks.verify(body as any)) as {
        orderCode: number;
        amount: number;
        description: string;
        paymentLinkId: string;
      };
      const orderCode = verifiedData.orderCode;

      // Skip processing for test transactions if necessary, but log them
      if (verifiedData.description === 'ma giao dich thu nghiem') {
        this.logger.log(
          `Test transaction received for orderCode: ${orderCode}`,
        );
        return { success: true };
      }

      // 2. Webhook Idempotency Lock (Redis)
      // Prevents race conditions if PayOS sends multiple webhooks rapidly
      const processingLockKey = `webhook_processing:${orderCode}`;
      const isLockAcquired = await this.redisService.setnxWithExpire(
        processingLockKey,
        'processing',
        30, // 30 seconds TTL
      );

      if (!isLockAcquired) {
        this.logger.warn(
          `Webhook for orderCode ${orderCode} is already being processed by another instance.`,
        );
        return { success: true };
      }

      try {
        // 3. Database Idempotency Check
        const existingBooking = await this.prisma.booking.findFirst({
          where: { payosOrderCode: BigInt(orderCode) },
        });

        if (
          existingBooking &&
          (existingBooking.status === 'CONFIRMED' ||
            existingBooking.paymentStatus === 'PAID')
        ) {
          this.logger.log(
            `Order ${orderCode} already fulfilled in database. Skipping.`,
          );
          return { success: true };
        }

        // 4. Retrieve Temp Order Payload from Redis
        const payloadKey = `temp_order:${orderCode}`;
        const payloadStr = await this.redisService.get(payloadKey);

        if (!payloadStr) {
          this.logger.warn(
            `Fulfillment failed: Payload for order ${orderCode} not found (expired or already processed).`,
          );
          return { success: true };
        }

        const payload = JSON.parse(payloadStr) as TempOrderPayload;
        const { userId, courtId, bookingDate, slots, totalPrice } = payload;

        // 5. CRITICAL: Amount Verification (Security Check)
        if (verifiedData.amount !== totalPrice) {
          this.logger.error(
            `SECURITY ALERT: Payment amount mismatch for order ${orderCode}. Expected: ${totalPrice}, Actual Paid: ${verifiedData.amount}`,
          );
          // Return 200 OK to stop PayOS retries, but do NOT fulfill the order
          return { success: true };
        }

        // 6. Prisma Transaction (Atomic Fulfillment)
        this.logger.log(
          `Starting atomic fulfillment for order ${orderCode}...`,
        );
        await this.prisma.$transaction(async (tx) => {
          const pricePerSlot = totalPrice / slots.length;
          const payosCode = BigInt(orderCode);

          const pendingBookings = await tx.booking.findMany({
            where: {
              payosOrderCode: payosCode,
              status: 'PENDING',
            },
          });

          if (pendingBookings.length > 0) {
            if (pendingBookings.length !== slots.length) {
              throw new Error(
                `PENDING booking count mismatch for order ${orderCode}. Expected ${slots.length}, got ${pendingBookings.length}`,
              );
            }

            for (const slot of slots) {
              const booking = pendingBookings.find(
                (b) => b.startTime === slot.startTime,
              );
              if (!booking) {
                throw new Error(
                  `Missing PENDING booking for slot ${slot.startTime}, order ${orderCode}`,
                );
              }

              await tx.booking.update({
                where: { id: booking.id },
                data: {
                  status: 'CONFIRMED',
                  paymentStatus: 'PAID',
                  expiresAt: null,
                },
              });

              await tx.payment.create({
                data: {
                  bookingId: booking.id,
                  userId,
                  amount: pricePerSlot,
                  method: 'BANK_TRANSFER',
                  status: 'PAID',
                  transactionId: String(verifiedData.paymentLinkId),
                },
              });
            }
            return;
          }

          // Fallback: legacy orders without PENDING rows (pre-migration clients)
          for (const slot of slots) {
            const booking = await tx.booking.create({
              data: {
                courtId,
                userId,
                bookingDate,
                startTime: slot.startTime,
                endTime: slot.endTime,
                totalPrice: pricePerSlot,
                status: 'CONFIRMED',
                paymentStatus: 'PAID',
                payosOrderCode: payosCode,
              },
            });

            await tx.payment.create({
              data: {
                bookingId: booking.id,
                userId,
                amount: pricePerSlot,
                method: 'BANK_TRANSFER',
                status: 'PAID',
                transactionId: String(verifiedData.paymentLinkId),
              },
            });
          }
        });
        this.logger.log(`Order ${orderCode} fulfilled successfully.`);

        // 7. Strict Cleanup (Post-Commit Only)
        this.logger.log(`Cleaning up Redis state for order ${orderCode}...`);

        // Remove individual slot locks
        for (const slot of slots) {
          const slotLockKey = `booking_lock:${courtId}:${bookingDate}:${slot.startTime}`;
          await this.redisService.del(slotLockKey);
        }

        // Remove temp order payload
        await this.redisService.del(payloadKey);

        // Remove from user's pending limit set
        const userPendingKey = `user_pending_orders:${userId}`;
        await this.redisService.srem(userPendingKey, orderCode.toString());

        // 8. TRIGGER: Real-time Notification to Owner
        try {
          const court = await this.prisma.court.findUnique({
            where: { id: courtId },
            select: { ownerId: true, name: true },
          });

          if (court) {
            const user = await this.prisma.user.findUnique({
              where: { id: userId },
              select: { fullName: true },
            });

            this.notificationGateway.notifyOwner(court.ownerId, 'new_booking', {
              orderCode,
              courtName: court.name,
              customerName: user?.fullName || 'Khách hàng',
              totalPrice,
              bookingDate,
              slots: slots.map((s) => s.startTime),
            });
          }
        } catch (error) {
          this.logger.error(
            'Failed to send real-time notification to owner:',
            error,
          );
        }
      } finally {
        // 8. Final Cleanup: Release processing lock
        await this.redisService.del(processingLockKey);
      }
    } catch (error) {
      this.logger.error(`PAYOS WEBHOOK ERROR for order:`, error);
      // We don't rethrow because we want the controller to return 200 OK to PayOS
    }

    return { success: true };
  }

  async recreatePaymentLink(bookingId: string, userId: string) {
    // 1. Tìm booking chính kèm theo thông tin của Sân (Court) để lấy tên sân bóng
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { court: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân');
    }

    // 2. Kiểm tra quyền sở hữu
    if (booking.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    // 3. Kiểm tra trạng thái booking
    if (
      booking.status !== BookingStatus.PENDING ||
      booking.paymentStatus !== 'UNPAID'
    ) {
      throw new BadRequestException(
        'Đơn đặt sân không ở trạng thái chờ thanh toán hoặc đã được thanh toán',
      );
    }

    const oldOrderCode = booking.payosOrderCode;
    if (!oldOrderCode) {
      throw new BadRequestException('Đơn hàng không có mã thanh toán cũ');
    }

    // 4. Tìm tất cả các booking có cùng payosOrderCode cũ (để xử lý theo nhóm đặt nhiều ca)
    const relatedBookings = await this.prisma.booking.findMany({
      where: { payosOrderCode: oldOrderCode },
    });

    const totalPrice = relatedBookings.reduce(
      (sum, b) => sum + b.totalPrice,
      0,
    );
    const slots = relatedBookings.map((b) => ({
      startTime: b.startTime,
      endTime: b.endTime,
    }));

    // 5. Sinh orderCode mới
    const newOrderCode = Math.floor(Math.random() * 9007199254740991);
    const expiresAt = new Date(Date.now() + BOOKING_CHECKOUT_TTL_MS);

    // 6. Xóa Expiration Job cũ trong Bull Queue (nếu có)
    try {
      const oldJobId = `expire-order-${oldOrderCode}`;
      const oldJob = await this.expirationQueue.getJob(oldJobId);
      if (oldJob) {
        await oldJob.remove();
        this.logger.log(`Đã xóa job hết hạn cũ: ${oldJobId}`);
      }
    } catch (err) {
      this.logger.error('Lỗi khi xóa job hết hạn cũ:', err);
    }

    // 7. Cập nhật cơ sở dữ liệu: đổi payosOrderCode thành mã mới và gia hạn expiresAt
    await this.prisma.booking.updateMany({
      where: { payosOrderCode: oldOrderCode },
      data: {
        payosOrderCode: BigInt(newOrderCode),
        expiresAt,
      },
    });

    // 8. Đăng ký Expiration Job mới vào Bull Queue
    await this.expirationQueue.add(
      BOOKING_EXPIRATION_JOB,
      {
        bookingIds: relatedBookings.map((b) => b.id),
        orderCode: newOrderCode,
        userId,
        courtId: booking.courtId,
        courtName: booking.court.name,
        bookingDate: booking.bookingDate,
        slots: relatedBookings.map((b) => b.startTime),
      },
      {
        delay: BOOKING_CHECKOUT_TTL_MS,
        jobId: `expire-order-${newOrderCode}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    // 9. Dọn dẹp Redis cũ & Cập nhật dữ liệu tạm thời mới
    const checkoutTtlSeconds = BOOKING_CHECKOUT_TTL_MS / 1000;

    // Xóa temp_order cũ
    await this.redisService.del(`temp_order:${oldOrderCode}`);

    // Lưu temp_order mới
    const payload = {
      userId,
      courtId: booking.courtId,
      courtName: booking.court.name,
      bookingDate: booking.bookingDate,
      slots,
      totalPrice,
    };
    await this.redisService.set(
      `temp_order:${newOrderCode}`,
      JSON.stringify(payload),
      checkoutTtlSeconds,
    );

    // Cập nhật danh sách đơn hàng chờ thanh toán của User trong Redis
    const pendingOrdersKey = `user_pending_orders:${userId}`;
    await this.redisService.srem(pendingOrdersKey, oldOrderCode.toString());
    await this.redisService.sadd(pendingOrdersKey, newOrderCode.toString());
    await this.redisService.expire(pendingOrdersKey, checkoutTtlSeconds);

    // 10. Tạo link thanh toán mới qua PayOS
    const description = `Thanh toan ${slots.length} ca san`.slice(0, 25);
    const paymentLink = await this.generatePayosLink(
      newOrderCode,
      totalPrice,
      description,
    );

    return {
      orderCode: newOrderCode,
      checkoutUrl: paymentLink.checkoutUrl,
    };
  }
}
