import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookingService } from './booking.service';

@Injectable()
export class BookingCronService {
  private readonly logger = new Logger(BookingCronService.name);

  constructor(private readonly bookingService: BookingService) {}

  @Cron('0 */30 * * * *') // Run every 30 minutes
  async handleBookingCompletion() {
    this.logger.log('Running automated booking completion task...');
    await this.bookingService.completePastBookings();
  }
}
