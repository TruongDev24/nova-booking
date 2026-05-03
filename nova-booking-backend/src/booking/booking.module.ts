import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingCronService } from './booking.cron';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BookingController],
  providers: [BookingService, BookingCronService],
  exports: [BookingService],
})
export class BookingModule {}
