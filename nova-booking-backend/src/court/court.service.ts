import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { Court, Prisma, Role } from '@prisma/client';
import type { UserPayload } from '../common/interfaces/user-payload.interface';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class CourtService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
    private mailerService: MailerService,
    private notificationGateway: NotificationGateway,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async clearCourtCache() {
    // Clear all court-related cache keys
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const store = (this.cacheManager as any).stores?.[0];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (store && typeof store.keys === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const keys = (await store.keys('courts_*')) as string[];
      for (const key of keys) {
        await this.cacheManager.del(key);
      }
    }
    await this.cacheManager.del('all_courts');
  }

  async create(dto: CreateCourtDto, ownerId: string): Promise<Court> {
    const result = await this.prisma.court.create({
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

    await this.clearCourtCache();

    // Trigger: Global - Court Added
    this.notificationGateway.emitToRoom(
      'room_global_courts',
      'court_added',
      result,
    );

    return result;
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
    const cacheKey = `courts_${user.role}_${user.sub}_${page}_${limit}_${search || ''}_${sortBy || ''}_${sortOrder || ''}`;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cachedData = await this.cacheManager.get<any>(cacheKey);
    if (cachedData) {
      return cachedData as {
        data: Court[];
        meta: { total: number; page: number; limit: number; lastPage: number };
      };
    }

    const where: Prisma.CourtWhereInput = {};

    if (user.role === Role.ADMIN) {
      where.ownerId = user.sub;
    } else {
      where.isDeleted = false;
    }

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
      const [data, total] = await Promise.all([
        this.prisma.court.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
        }),
        this.prisma.court.count({ where }),
      ]);

      const response = {
        data,
        meta: {
          total,
          page,
          limit,
          lastPage: Math.ceil(total / limit) || 1,
        },
      };

      await this.cacheManager.set(cacheKey, response, 60000); // Cache for 1 minute
      return response;
    } catch (error) {
      console.error('Prisma FindAll Error:', error);
      throw new BadRequestException('Lỗi truy vấn dữ liệu sân');
    }
  }

  async findOne(id: string): Promise<Court> {
    const cacheKey = `court_detail_${id}`;
    const cached = await this.cacheManager.get<Court>(cacheKey);
    if (cached) return cached;

    const court = await this.prisma.court.findUnique({
      where: { id },
    });

    if (!court || court.isDeleted) {
      throw new NotFoundException(`Sân với ID ${id} không tồn tại`);
    }

    await this.cacheManager.set(cacheKey, court, 60000);
    return court;
  }

  async update(
    id: string,
    dto: UpdateCourtDto,
    ownerId: string,
  ): Promise<Court> {
    const court = await this.findOne(id);
    if (court.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật thông tin sân này',
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

    const result = await this.prisma.court.update({
      where: { id },
      data: dto,
    });

    await this.clearCourtCache();
    await this.cacheManager.del(`court_detail_${id}`);

    // Trigger: Court Status Changed
    this.notificationGateway.emitToRoom(
      'room_global_courts',
      'court_updated',
      result,
    );

    return result;
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

    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = vnTime.toISOString().split('T')[0];
    const currentHour = vnTime.getUTCHours().toString().padStart(2, '0');
    const currentMin = vnTime.getUTCMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMin}`;

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

    const cancelReason = `Sân ${court.name} tạm đóng cửa bảo trì.`;

    await this.prisma.$transaction(async (tx) => {
      await tx.court.update({
        where: { id },
        data: { isDeleted: true },
      });

      for (const booking of futureBookings) {
        const isPaid = booking.paymentStatus === 'PAID';
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: 'CANCELLED',
            cancelReason: cancelReason,
            refundStatus: isPaid ? 'PENDING' : 'NONE',
          },
        });
      }
    });

    await this.clearCourtCache();
    await this.cacheManager.del(`court_detail_${id}`);

    // Trigger: Private Alerts for affected users
    for (const booking of futureBookings) {
      this.notificationGateway.emitToRoom(
        `room_user_${booking.userId}`,
        'booking_canceled',
        {
          id: booking.id,
          courtName: court.name,
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
          reason: cancelReason,
        },
      );
    }

    // Trigger: Global Status Update
    this.notificationGateway.emitToRoom(
      'room_global_courts',
      'court_status_changed',
      {
        id: court.id,
        isDeleted: true,
        name: court.name,
      },
    );

    if (futureBookings.length > 0) {
      const emailPromises = futureBookings.map((booking) => {
        const isPaid = booking.paymentStatus === 'PAID';
        return this.mailerService.sendMail({
          to: booking.user.email,
          subject: `[Nova Booking] Thông báo hủy lịch đặt sân ${court.name} (Bảo trì)`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #e11d48;">Thông báo hủy lịch do bảo trì sân</h2>
              <p>Xin chào <strong>${booking.user.fullName}</strong>,</p>
              <p>Chúng tôi rất tiếc phải thông báo rằng sân <strong>${court.name}</strong> sẽ tạm đóng cửa để bảo trì đột xuất.</p>
              <p>Lịch đặt của bạn vào ngày <strong>${booking.bookingDate}</strong> lúc <strong>${booking.startTime}</strong> đã bị hủy.</p>
              ${
                isPaid
                  ? '<p style="color: #059669; font-weight: bold;">Vì bạn đã thanh toán, hệ thống đã ghi nhận yêu cầu hoàn tiền. Admin sẽ xử lý và hoàn tiền cho bạn trong thời gian sớm nhất.</p>'
                  : '<p>Vì đơn hàng chưa được thanh toán thành công, hệ thống chỉ thực hiện hủy lịch.</p>'
              }
              <br />
              <p>Trân trọng,</p>
              <p><strong>Nova Booking Team</strong></p>
            </div>
          `,
        });
      });

      void Promise.allSettled(emailPromises);
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

    const result = await this.prisma.court.update({
      where: { id },
      data: { isDeleted: false },
    });

    await this.clearCourtCache();
    await this.cacheManager.del(`court_detail_${id}`);

    // Trigger: Global Status Update
    this.notificationGateway.emitToRoom(
      'room_global_courts',
      'court_status_changed',
      {
        id: result.id,
        isDeleted: false,
        name: result.name,
      },
    );

    return result;
  }
}
