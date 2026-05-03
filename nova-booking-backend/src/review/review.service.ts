import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    // 1. Kiểm tra đơn đặt sân
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { review: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân');
    }

    // 2. Kiểm tra quyền sở hữu
    if (booking.userId !== userId) {
      throw new BadRequestException(
        'Bạn không có quyền đánh giá đơn đặt sân này',
      );
    }

    // 3. Kiểm tra trạng thái
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Chỉ có thể đánh giá đơn đặt sân đã hoàn tất',
      );
    }

    // 4. Kiểm tra xem đã đánh giá chưa
    if (booking.review) {
      throw new ConflictException('Đơn đặt sân này đã được đánh giá trước đó');
    }

    // 5. Tạo đánh giá
    return this.prisma.review.create({
      data: {
        rating: dto.rating,
        comment: dto.comment,
        userId: userId,
        courtId: booking.courtId,
        bookingId: dto.bookingId,
      },
    });
  }

  async getCourtReviews(courtId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { courtId },
        include: {
          user: {
            select: {
              fullName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { courtId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }
}
