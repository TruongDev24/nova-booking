import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    console.log('🚀 PrismaService: Initializing with DATABASE_URL...');
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error(
        '❌ PrismaService: DATABASE_URL is missing in environment!',
      );
    }

    // Configure direct connection using standard pg adapter
    const pool = new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 10000, // 10s timeout
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    console.log('🚀 PrismaService: Attempting to connect to database...');
    try {
      await this.$connect();
      console.log('✅ PrismaService: Connected to database successfully');
    } catch (error) {
      console.error('❌ PrismaService: Database connection failed:', error);
      // Don't throw here to allow Nest to finish starting and show logs,
      // but the app might fail later on queries.
    }
  }
}
