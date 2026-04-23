import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { Court, Prisma } from '@prisma/client';

@Injectable()
export class CourtService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateCourtDto, ownerId: string): Promise<Court> {
    return this.prisma.court.create({
      data: {
        ...dto,
        description: dto.description ?? '',
        amenities: dto.amenities ?? [],
        images: dto.images ?? [],
        ownerId,
      },
    });
  }

  /**
   * Nâng cấp: Thêm Phân trang và Bộ lọc tìm kiếm
   */
  async findAll(
    ownerId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{ data: Court[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    // Xây dựng điều kiện lọc linh hoạt
    const where: Prisma.CourtWhereInput = {
      ownerId,
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.court.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.court.count({ where }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
    };
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

  /**
   * Nâng cấp: Xem lịch đặt sân của một ngày cụ thể
   */
  async getSchedule(courtId: string, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Lấy các slot đã được đặt (không tính các booking đã hủy)
    return this.prisma.booking.findMany({
      where: {
        courtId,
        startTime: { gte: startOfDay },
        endTime: { lte: endOfDay },
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

    try {
      return await this.prisma.court.update({
        where: { id },
        data: {
          ...dto,
        },
      });
    } catch (error) {
      console.error('CourtService Update Prisma Error:', error);
      throw error;
    }
  }

  async remove(id: string, ownerId: string): Promise<Court> {
    const court = await this.findOne(id);
    if (court.ownerId !== ownerId) {
      throw new ForbiddenException(
        'You do not have permission to delete this court',
      );
    }

    // Soft delete: Giữ lại dữ liệu để thống kê nhưng ẩn khỏi danh sách hiển thị
    return this.prisma.court.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
