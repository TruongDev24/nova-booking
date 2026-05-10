import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
      });
    } else {
      this.redis = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        maxRetriesPerRequest: 3,
      });
    }

    this.redis.on('connect', () => {
      console.log('🚀 Redis Service: Connected to Redis successfully');
    });

    let lastErrorLog = 0;
    this.redis.on('error', (err) => {
      const now = Date.now();
      if (now - lastErrorLog > 30000) {
        // 30 seconds
        console.warn(
          'Redis Connection Error (will log again in 30s):',
          err.message,
        );
        lastErrorLog = now;
      }
    });
  }

  async setnxWithExpire(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async multiSetnxWithExpire(
    locks: Array<{ key: string; value: string; ttl: number }>,
  ): Promise<boolean[]> {
    const pipeline = this.redis.pipeline();
    locks.forEach((lock) => {
      pipeline.set(lock.key, lock.value, 'EX', lock.ttl, 'NX');
    });
    const results = await pipeline.exec();
    if (!results) return locks.map(() => false);
    return results.map(([err, res]) => !err && res === 'OK');
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async getKeys(pattern: string): Promise<string[]> {
    return this.redis.keys(pattern);
  }

  async sadd(key: string, value: string): Promise<void> {
    await this.redis.sadd(key, value);
  }

  async scard(key: string): Promise<number> {
    return this.redis.scard(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  async srem(key: string, value: string): Promise<void> {
    await this.redis.srem(key, value);
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
