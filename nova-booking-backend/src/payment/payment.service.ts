import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

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

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redisService: RedisService,
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
      console.error('PayOS Create Error:', error);
      throw new BadRequestException('Could not create payment link');
    }
  }

  async handleWebhook(body: unknown) {
    console.log('--- PAYOS WEBHOOK RECEIVED ---');
    console.log('Raw Body:', JSON.stringify(body, null, 2));

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const verifiedData = await this.payos.webhooks.verify(body as any);
      console.log(
        'Verification Success:',
        JSON.stringify(verifiedData, null, 2),
      );

      if (verifiedData.code === '00') {
        const orderCode = verifiedData.orderCode;
        console.log('Processing OrderCode:', orderCode);

        // 1. Idempotency Check
        const existingBooking = await this.prisma.booking.findFirst({
          where: { payosOrderCode: BigInt(orderCode) },
        });
        if (existingBooking) {
          console.log('Booking already exists for orderCode:', orderCode);
          return { success: true };
        }

        // 2. Get Payload from Redis
        const payloadKey = `temp_order:${orderCode}`;
        const payloadStr = await this.redisService.get(payloadKey);

        if (!payloadStr) {
          console.error(
            `CRITICAL: Payload not found in Redis for orderCode: ${orderCode}`,
          );
          return { success: true };
        }

        const payload = JSON.parse(payloadStr) as TempOrderPayload;
        const { userId, courtId, bookingDate, slots, totalPrice } = payload;
        console.log(
          'Retrieved Redis Payload:',
          JSON.stringify(payload, null, 2),
        );

        // 3. Insert into PostgreSQL (Prisma Transaction)
        console.log('Starting Prisma Transaction...');
        await this.prisma.$transaction(async (tx) => {
          const pricePerSlot = totalPrice / slots.length;

          for (const slot of slots) {
            console.log(`Creating booking for slot: ${slot.startTime}`);
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
                payosOrderCode: BigInt(orderCode),
              },
            });

            console.log(`Creating payment record for booking: ${booking.id}`);
            await tx.payment.create({
              data: {
                bookingId: booking.id,
                userId: userId,
                amount: pricePerSlot,
                method: 'BANK_TRANSFER',
                status: 'PAID',
                transactionId: String(verifiedData.paymentLinkId),
              },
            });
          }
        });
        console.log('Prisma Transaction Committed Successfully.');

        // 4. Cleanup Redis (Payload and Locks)
        console.log('Cleaning up Redis keys...');
        await this.redisService.del(payloadKey);
        for (const slot of slots) {
          const lockKey = `booking_lock:${courtId}:${bookingDate}:${slot.startTime}`;
          await this.redisService.del(lockKey);
          console.log(`Deleted lock: ${lockKey}`);
        }
        console.log('Webhook Fulfillment Complete.');
      } else {
        console.log('Payment status is not successful:', verifiedData.code);
      }
    } catch (error) {
      console.error('PAYOS WEBHOOK ERROR:', error);
      throw error; // Rethrow so the controller catches it
    }

    return { success: true };
  }
}
