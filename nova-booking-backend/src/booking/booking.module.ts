import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingCronService } from './booking.cron';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PrismaModule, PaymentModule],
  controllers: [BookingController],
  providers: [BookingService, BookingCronService],
  exports: [BookingService],
})
export class BookingModule {}
