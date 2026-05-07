/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from '../../src/review/review.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: DeepMockProxy<PrismaClient>;

  // FIXED_SYSTEM_TIME: 2026-05-10 12:00:00 VN (GMT+7) = 05:00:00 UTC
  const FIXED_SYSTEM_TIME = '2026-05-10T05:00:00.000Z';
  const userId = 'user-1';
  const dto = {
    bookingId: 'booking-1',
    rating: 5,
    comment: 'Sân rất đẹp và sạch sẽ!',
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(FIXED_SYSTEM_TIME));

    prisma = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('1. Time-Based Security: Should throw if review is premature (now < endTime)', async () => {
      const mockBooking = {
        userId,
        status: 'COMPLETED',
        bookingDate: '2026-05-10',
        endTime: '15:00', // Play ends at 15:00 VN, but now is 12:00 VN
        court: { id: 'c1', avgRating: 5, reviewCount: 1 },
        review: null,
      };
      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);

      await expect(service.create(userId, dto)).rejects.toThrow(
        new BadRequestException(
          'Bạn chỉ có thể đánh giá sau khi thời gian chơi thực tế đã kết thúc.',
        ),
      );
    });

    it('2. Authorization Security: Should throw if user is not the booking owner', async () => {
      const mockBooking = {
        userId: 'other-user',
        status: 'COMPLETED',
        bookingDate: '2026-05-10',
        endTime: '08:00', // Play ended at 08:00 VN, now is 12:00 VN
        court: { id: 'c1', avgRating: 5, reviewCount: 1 },
        review: null,
      };
      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);

      await expect(service.create(userId, dto)).rejects.toThrow(
        new BadRequestException('Bạn không có quyền đánh giá đơn đặt sân này'),
      );
    });

    it('3. Idempotency (Double Review): Should throw if review already exists', async () => {
      const mockBooking = {
        userId,
        status: 'COMPLETED',
        bookingDate: '2026-05-10',
        endTime: '08:00',
        court: { id: 'c1', avgRating: 5, reviewCount: 1 },
        review: { id: 'existing-review' },
      };
      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);

      await expect(service.create(userId, dto)).rejects.toThrow(
        new ConflictException('Đơn đặt sân này đã được đánh giá trước đó'),
      );
    });

    it('4. Mathematical Accuracy (RCM & Transaction): Should calculate new average and total correctly', async () => {
      // Setup Old Data: 2 reviews, avg 4.0
      const mockBooking = {
        id: dto.bookingId,
        userId,
        status: 'COMPLETED',
        bookingDate: '2026-05-10',
        endTime: '08:00',
        court: {
          id: 'court-1',
          avgRating: 4.0,
          reviewCount: 2,
        },
        review: null,
      };
      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);

      // Mock Transaction to execute the callback
      prisma.$transaction.mockImplementation(async (callback) => {
        return await callback(prisma);
      });

      // Submit new rating: 5
      await service.create(userId, { ...dto, rating: 5 });

      // Verification
      // a. Transaction called
      expect(prisma.$transaction).toHaveBeenCalled();

      // b. Math Verification
      // ( (4.0 * 2) + 5 ) / 3 = 13 / 3 = 4.333333333333333
      expect(prisma.court.update).toHaveBeenCalledWith({
        where: { id: 'court-1' },
        data: {
          avgRating: 4.333333333333333,
          reviewCount: 3,
        },
      });

      // c. Review created
      expect(prisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rating: 5,
            courtId: 'court-1',
          }),
        }),
      );
    });
  });
});
