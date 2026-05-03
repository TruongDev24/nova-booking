import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingCronService {
  private readonly logger = new Logger(BookingCronService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('0 */30 * * * *') // Run every 30 minutes
  async handleBookingCompletion() {
    this.logger.log('Running automated booking completion task...');

    // Logic xử lý thời gian GMT+7
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = vnTime.toISOString().split('T')[0];
    const currentHour = vnTime.getUTCHours().toString().padStart(2, '0');
    const currentMin = vnTime.getUTCMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMin}`;

    try {
      // Tìm và cập nhật các đơn hàng đã kết thúc
      // Điều kiện: status là CONFIRMED và (ngày < hôm nay HOẶC (ngày == hôm nay và giờ kết thúc < giờ hiện tại))
      const result = await this.prisma.booking.updateMany({
        where: {
          status: 'CONFIRMED',
          OR: [
            { bookingDate: { lt: todayStr } },
            {
              bookingDate: todayStr,
              endTime: { lt: currentTimeStr },
            },
          ],
        },
        data: {
          status: 'COMPLETED',
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Successfully completed ${result.count} bookings automatically.`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to run automated booking completion:', error);
    }
  }
}
