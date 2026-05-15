import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BOOKING_EXPIRATION_QUEUE } from './booking.constants';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingCronService } from './booking.cron';
import { BookingExpirationProcessor } from './processors/booking-expiration.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    PrismaModule,
    PaymentModule,
    BullModule.registerQueue({
      name: BOOKING_EXPIRATION_QUEUE,
    }),
  ],
  controllers: [BookingController],
  providers: [BookingService, BookingCronService, BookingExpirationProcessor],
  exports: [BookingService],
})
export class BookingModule {}
