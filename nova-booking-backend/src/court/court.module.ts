import { Module } from '@nestjs/common';
import { CourtService } from './court.service';
import { CourtController } from './court.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [PrismaModule, CloudinaryModule, MailerModule],
  controllers: [CourtController],
  providers: [CourtService],
})
export class CourtModule {}
