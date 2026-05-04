import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { Court, Prisma, Role } from '@prisma/client';
import type { UserPayload } from '../common/interfaces/user-payload.interface';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class CourtService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
    private mailerService: MailerService,
  ) {}

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
    query: PaginationQueryDto,
  ): Promise<{
    data: Court[];
    meta: { total: number; page: number; limit: number; lastPage: number };
  }> {
    if (!user) {
      throw new UnauthorizedException('Thông tin người dùng không hợp lệ');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const { search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // Build WHERE clause safely
    const where: Prisma.CourtWhereInput = {};

    if (user.role === Role.ADMIN) {
      where.ownerId = user.sub;
    } else {
      where.isDeleted = false;
    }

    // Explicit search validation to prevent crashes
    if (typeof search === 'string' && search.trim() !== '') {
      const searchLower = search.trim();
      where.OR = [
        { name: { contains: searchLower, mode: 'insensitive' } },
        { location: { contains: searchLower, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.CourtOrderByWithRelationInput = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    try {
      const [courts, total] = await Promise.all([
        this.prisma.court.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            _count: {
              select: { reviews: true },
            },
          },
        }),
        this.prisma.court.count({ where }),
      ]);

      // Fetch avg rating for each court (simplified for MVP)
      const data = await Promise.all(
        courts.map(async (court) => {
          const aggregation = await this.prisma.review.aggregate({
            where: { courtId: court.id },
            _avg: { rating: true },
          });
          return {
            ...court,
            avgRating: aggregation._avg.rating || 0,
            totalReviews: court._count.reviews,
          };
        }),
      );

      return {
        data,
        meta: {
          total,
          page,
          limit,
          lastPage: Math.ceil(total / limit) || 1,
        },
      };
    } catch (error) {
      console.error('Prisma FindAll Error:', error);
      throw new BadRequestException('Lỗi truy vấn dữ liệu sân');
    }
  }

  async findOne(
    id: string,
  ): Promise<Court & { avgRating: number; totalReviews: number }> {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: {
        _count: {
          select: { reviews: true },
        },
      },
    });
    if (!court || court.isDeleted) {
      throw new NotFoundException(`Court with ID ${id} not found`);
    }

    const aggregation = await this.prisma.review.aggregate({
      where: { courtId: id },
      _avg: { rating: true },
    });

    return {
      ...court,
      avgRating: aggregation._avg.rating || 0,
      totalReviews: court._count.reviews,
    };
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

    if (
      dto.images &&
      dto.images.length > 0 &&
      court.images &&
      court.images.length > 0
    ) {
      await this.cloudinaryService.deleteFiles(court.images);
    }

    return this.prisma.court.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: {
        owner: true,
      },
    });

    if (!court || court.isDeleted) {
      throw new NotFoundException(`Sân với ID ${id} không tồn tại`);
    }

    if (court.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Bạn không có quyền ngừng hoạt động sân này',
      );
    }

    // --- Logic xử lý thời gian GMT+7 ---
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = vnTime.toISOString().split('T')[0];
    const currentHour = vnTime.getUTCHours().toString().padStart(2, '0');
    const currentMin = vnTime.getUTCMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMin}`;

    // Tìm các đơn đặt sân trong tương lai
    const futureBookings = await this.prisma.booking.findMany({
      where: {
        courtId: id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        OR: [
          { bookingDate: { gt: todayStr } },
          {
            bookingDate: todayStr,
            startTime: { gt: currentTimeStr },
          },
        ],
      },
      include: {
        user: true,
      },
    });

    // --- Thực thi Transaction ---
    await this.prisma.$transaction([
      // 1. Ngừng hoạt động sân
      this.prisma.court.update({
        where: { id },
        data: { isDeleted: true },
      }),
      // 2. Hủy các đơn đặt sân tương lai
      this.prisma.booking.updateMany({
        where: {
          id: { in: futureBookings.map((b) => b.id) },
        },
        data: {
          status: 'CANCELLED',
          cancelReason: `Sân ${court.name} ngừng hoạt động.`,
        },
      }),
    ]);

    // --- Gửi Email thông báo (Resilient with Promise.allSettled) ---
    if (futureBookings.length > 0) {
      const emailPromises = futureBookings.map((booking) => {
        return this.mailerService.sendMail({
          to: booking.user.email,
          subject: `[Nova Booking] Thông báo hủy lịch đặt sân ${court.name}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #e11d48;">Thông báo hủy lịch đặt sân</h2>
              <p>Xin chào <strong>${booking.user.fullName}</strong>,</p>
              <p>Chúng tôi rất tiếc phải thông báo rằng sân <strong>${court.name}</strong> đã ngừng hoạt động.</p>
              <p>Lịch đặt của bạn vào ngày <strong>${booking.bookingDate}</strong> lúc <strong>${booking.startTime}</strong> đã bị hủy.</p>
              <p>Chúng tôi rất xin lỗi vì sự bất tiện này. Nếu bạn đã thanh toán, vui lòng liên hệ với chủ sân để được hoàn tiền.</p>
              <br />
              <p>Trân trọng,</p>
              <p><strong>Nova Booking Team</strong></p>
            </div>
          `,
        });
      });

      // Thực thi gửi mail song song, không làm fail transaction nếu 1 mail lỗi
      void Promise.allSettled(emailPromises).then((results) => {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(
              `Failed to send apology email to ${futureBookings[index].user.email}:`,
              result.reason,
            );
          }
        });
      });
    }
  }

  async reactivate(id: string, ownerId: string): Promise<Court> {
    const court = await this.prisma.court.findUnique({
      where: { id },
    });

    if (!court) {
      throw new NotFoundException(`Sân với ID ${id} không tồn tại`);
    }

    if (court.ownerId !== ownerId) {
      throw new ForbiddenException('Bạn không có quyền kích hoạt lại sân này');
    }

    return this.prisma.court.update({
      where: { id },
      data: { isDeleted: false },
    });
  }
}
