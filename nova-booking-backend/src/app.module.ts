import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CourtModule } from './court/court.module';
import { BookingModule } from './booking/booking.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReviewModule } from './review/review.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('SMTP_HOST'),
          port: Number(config.get('SMTP_PORT')) || 465,
          secure: true, // port 465 requires secure: true
          auth: {
            user: config.get('SMTP_USER'),
            pass: config.get('SMTP_PASS'),
          },
        },
        defaults: {
          from: '"Nova Booking" <truongdaik90@gmail.com>',
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CourtModule,
    BookingModule,
    AnalyticsModule,
    ReviewModule,
    PaymentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
