import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { BOOKING_EXPIRATION_QUEUE } from '../booking/booking.constants';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: BOOKING_EXPIRATION_QUEUE,
    }),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
