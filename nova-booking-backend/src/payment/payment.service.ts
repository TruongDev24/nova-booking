import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentService {
  private payos: PayOS;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.payos = new PayOS({
      clientId: this.configService.get<string>('PAYOS_CLIENT_ID'),
      apiKey: this.configService.get<string>('PAYOS_API_KEY'),
      checksumKey: this.configService.get<string>('PAYOS_CHECKSUM_KEY'),
    });
  }

  async createPaymentLink(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { court: true, user: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Cannot pay for a cancelled booking');
    }

    // Generate a unique numeric orderCode (max 53-bit for PayOS)
    const orderCode = Number(String(Date.now()).slice(-9));

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { payosOrderCode: orderCode },
    });

    const domain =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const body = {
      orderCode: orderCode,
      amount: booking.totalPrice,
      description: `Thanh toan san ${booking.court.name.slice(0, 15)}`,
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
    // For PayOS v2, verify returns a promise of WebhookData
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const verifiedData = await this.payos.webhooks.verify(body as any);

    if (verifiedData.code === '00') {
      const orderCode = verifiedData.orderCode;

      const booking = await this.prisma.booking.findUnique({
        where: { payosOrderCode: orderCode },
      });

      if (booking) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
          },
        });

        await this.prisma.payment.upsert({
          where: { bookingId: booking.id },
          update: { status: 'PAID' },
          create: {
            bookingId: booking.id,
            userId: booking.userId,
            amount: booking.totalPrice,
            method: 'BANK_TRANSFER',
            status: 'PAID',
            transactionId: verifiedData.paymentLinkId,
          },
        });
      }
    }

    return { success: true };
  }
}
