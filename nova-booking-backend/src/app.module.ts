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
import { AppController } from './app.controller';

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
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          const parsed = new URL(redisUrl);
          return {
            connection: {
              host: parsed.hostname,
              port: parseInt(parsed.port, 10) || 6379,
              username: parsed.username || undefined,
              password: parsed.password || undefined,
              tls: parsed.protocol === 'rediss:' ? {} : undefined,
            },
          };
        }
        return {
          connection: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get('REDIS_PASSWORD') || undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    RedisModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('SMTP_HOST', 'smtp-relay.brevo.com');
        const port = config.get<number>('SMTP_PORT', 2525);
        const user = config.get<string>('SMTP_USER');
        const smtpFrom = config.get<string>('SMTP_FROM');
        const fromAddress = smtpFrom || `"Nova Booking" <${user}>`;

        return {
          transport: {
            host,
            port: Number(port),
            secure: Number(port) === 465,
            auth: {
              user,
              pass: config.get<string>('SMTP_PASS'),
            },
            tls: {
              rejectUnauthorized: false,
              minVersion: 'TLSv1.2',
            },
          },
          defaults: {
            from: fromAddress,
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
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
