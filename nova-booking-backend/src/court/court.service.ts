import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { Court, Prisma, Role } from '@prisma/client';
import type { UserPayload } from '../common/interfaces/user-payload.interface';

@Injectable()
export class CourtService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCourtDto, ownerId: string): Promise<Court> {
    return this.prisma.court.create({
      data: {
        ...dto,
        openingTime: dto.openingTime || '05:00',
        closingTime: dto.closingTime || '22:00',
        description: dto.description ?? '',
        amenities: dto.amenities ?? [],
        images: dto.images ?? [],
        ownerId,
      },
    });
  }

  async findAll(
    user: UserPayload,
    page: any = 1,
    limit: any = 10,
    search?: string,
  ): Promise<{
    data: Court[];
    meta: { total: number; page: number; limit: number; lastPage: number };
  }> {
    if (!user) {
      throw new UnauthorizedException('Thông tin người dùng không hợp lệ');
    }

    const validPage = Math.max(
      1,
      typeof page === 'string' ? parseInt(page, 10) : Number(page) || 1,
    );
    const validLimit = Math.max(
      1,
      typeof limit === 'string' ? parseInt(limit, 10) : Number(limit) || 10,
    );
    const skip = (validPage - 1) * validLimit;

    // Build WHERE clause safely
    const where: Prisma.CourtWhereInput = {
      isDeleted: false,
    };

    if (user.role === Role.ADMIN) {
      where.ownerId = user.sub;
    }

    // Explicit search validation to prevent crashes
    if (typeof search === 'string' && search.trim() !== '') {
      const searchLower = search.trim();
      where.OR = [
        { name: { contains: searchLower, mode: 'insensitive' } },
        { location: { contains: searchLower, mode: 'insensitive' } },
      ];
    }

    try {
      const [data, total] = await Promise.all([
        this.prisma.court.findMany({
          where,
          skip,
          take: validLimit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.court.count({ where }),
      ]);

      return {
        data,
        meta: {
          total,
          page: validPage,
          limit: validLimit,
          lastPage: Math.ceil(total / validLimit) || 1,
        },
      };
    } catch (error) {
      console.error('Prisma FindAll Error:', error);
      throw new BadRequestException('Lỗi truy vấn dữ liệu sân');
    }
  }

  async findOne(id: string): Promise<Court> {
    const court = await this.prisma.court.findUnique({
      where: { id },
    });
    if (!court || court.isDeleted) {
      throw new NotFoundException(`Court with ID ${id} not found`);
    }
    return court;
  }

  async getSchedule(courtId: string, date: string) {
    return this.prisma.booking.findMany({
      where: {
        courtId,
        bookingDate: date,
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async update(
    id: string,
    dto: UpdateCourtDto,
    ownerId: string,
  ): Promise<Court> {
    const court = await this.findOne(id);
    if (court.ownerId !== ownerId) {
      throw new ForbiddenException(
        'You do not have permission to update this court',
      );
    }

    return this.prisma.court.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const court = await this.findOne(id);
    if (court.ownerId !== ownerId) {
      throw new ForbiddenException(
        'You do not have permission to delete this court',
      );
    }

    await this.prisma.court.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
