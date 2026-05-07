import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Refactored Review Creation (Phase 3 - Step 2)
   * Implements strict eligibility, atomic transactions, and RCM formula.
   */
  async create(userId: string, dto: CreateReviewDto) {
    const { bookingId, rating, comment } = dto;

    // 1. Fetch booking with court details for formula calc
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        review: true,
        court: {
          select: {
            id: true,
            avgRating: true,
            reviewCount: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy đơn đặt sân');
    }

    // 2. Eligibility & Ownership Check
    if (booking.userId !== userId) {
      throw new BadRequestException(
        'Bạn không có quyền đánh giá đơn đặt sân này',
      );
    }

    // 3. Status Check
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Chỉ có thể đánh giá đơn đặt sân đã hoàn tất',
      );
    }

    // 4. Idempotency Check (No Spam)
    if (booking.review) {
      throw new ConflictException('Đơn đặt sân này đã được đánh giá trước đó');
    }

    // 5. Strict Sub-Second Time Validation (now() > playEndTime)
    const [year, month, day] = booking.bookingDate.split('-').map(Number);
    const [hour, minute] = booking.endTime.split(':').map(Number);
    const VN_UTC_OFFSET = 7;

    // Construct playEndTime in UTC
    const playEndTimeMs = Date.UTC(
      year,
      month - 1,
      day,
      hour - VN_UTC_OFFSET,
      minute,
      0,
    );
    const nowMs = Date.now();

    if (nowMs <= playEndTimeMs) {
      throw new BadRequestException(
        'Bạn chỉ có thể đánh giá sau khi thời gian chơi thực tế đã kết thúc.',
      );
    }

    // 6. Reactive Cache Management (RCM) Formula Calculation
    const {
      avgRating: oldAvg,
      reviewCount: oldTotal,
      id: courtId,
    } = booking.court;

    // Formula: ((oldAvg * oldTotal) + newRating) / (oldTotal + 1)
    const newTotal = oldTotal + 1;
    const newAvg = (oldAvg * oldTotal + rating) / newTotal;

    // 7. Atomic Prisma Transaction
    try {
      return await this.prisma.$transaction(async (tx) => {
        // a. Create Review record
        const review = await tx.review.create({
          data: {
            rating,
            comment,
            userId,
            courtId,
            bookingId,
          },
        });

        // b. Update Court cache (Atomic)
        await tx.court.update({
          where: { id: courtId },
          data: {
            avgRating: newAvg,
            reviewCount: newTotal,
          },
        });

        this.logger.log(
          `Review created for booking ${bookingId}. New Court Rating: ${newAvg.toFixed(2)} (${newTotal} reviews)`,
        );

        return review;
      });
    } catch (error) {
      this.logger.error(
        `Failed to create review for booking ${bookingId}:`,
        error,
      );
      throw error;
    }
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
