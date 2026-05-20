import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
<<<<<<< Updated upstream
    // Configure direct connection using standard pg adapter since Prisma 7 removes `url` from schema
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
=======
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
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : undefined, // Disable SSL for development
    });
>>>>>>> Stashed changes
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
