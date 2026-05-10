import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from './redis/redis.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CourtModule } from './court/court.module';
import { BookingModule } from './booking/booking.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReviewModule } from './review/review.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return { connection: { url: redisUrl } };
        }
        return {
          connection: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get('REDIS_PORT', 6379),
            password: config.get('REDIS_PASSWORD'),
          },
        };
      },
      inject: [ConfigService],
    }),
    RedisModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const port = Number(config.get('SMTP_PORT')) || 587;
        const service = config.get<string>('SMTP_SERVICE'); // Add this to Render env

        return {
          transport: {
            service: service === 'gmail' ? 'gmail' : undefined,
            host: service === 'gmail' ? undefined : config.get('SMTP_HOST'),
            port: port,
            secure: port === 465,
            auth: {
              user: config.get('SMTP_USER'),
              pass: config.get('SMTP_PASS'),
            },
            tls: {
              rejectUnauthorized: false,
              // Forced IPv4 for TLS as well
              servername: service === 'gmail' ? 'smtp.gmail.com' : undefined,
            },
            family: 4, // Force IPv4
            connectionTimeout: 15000, // 15 seconds
            greetingTimeout: 15000,
            socketTimeout: 15000,
          },
          defaults: {
            from: `"Nova Booking" <${config.get('SMTP_USER')}>`,
          },
        };
      },
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
    NotificationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
