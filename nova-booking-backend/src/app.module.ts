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
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        console.log('🚀 CacheModule: Initializing with Redis...');

        if (redisUrl) {
          console.log(
            '🚀 CacheModule: Using REDIS_URL (SSL/TLS support enabled)',
          );
          const store = await redisStore({
            url: redisUrl,
            // Render Redis (rediss://) needs TLS enabled
            socket: redisUrl.startsWith('rediss://')
              ? { tls: true, rejectUnauthorized: false }
              : undefined,
          });
          return { store };
        }

        console.log('🚀 CacheModule: Using Host/Port config');
        const store = await redisStore({
          socket: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
          },
          password: config.get('REDIS_PASSWORD'),
        });
        return { store };
      },
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        console.log('🚀 BullModule: Initializing with Redis...');

        if (redisUrl) {
          const isSsl = redisUrl.startsWith('rediss://');
          return {
            connection: {
              url: redisUrl,
              ...(isSsl ? { tls: { rejectUnauthorized: false } } : {}),
            },
          };
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
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('SMTP_HOST', 'smtp.gmail.com'),
          port: config.get<number>('SMTP_PORT', 465),
          secure: config.get<number>('SMTP_PORT', 465) === 465,
          auth: {
            user: config.get('SMTP_USER'),
            pass: config.get('SMTP_PASS'),
          },
          tls: {
            rejectUnauthorized: false,
          },
          family: 4,
        },
        defaults: {
          from: `"Nova Booking" <${config.get('SMTP_FROM') || config.get('SMTP_USER')}>`,
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
    NotificationModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
