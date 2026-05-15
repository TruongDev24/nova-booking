import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationGateway } from '../notification/notification.gateway';

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
}
