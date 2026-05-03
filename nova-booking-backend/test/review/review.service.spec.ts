import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from '../../src/review/review.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: PrismaService;

  const mockPrismaService = {
    booking: {
      findUnique: jest.fn(),
    },
    review: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    prisma = module.get<PrismaService>(PrismaService);
    
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-1';
    const dto = {
      bookingId: 'booking-1',
      rating: 5,
      comment: 'Tuyệt vời!',
    };

    it('Scenario 1 (Happy Path): Nên tạo đánh giá thành công', async () => {
      // Mock: Đơn hàng hợp lệ, đã hoàn tất, chưa có đánh giá
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: dto.bookingId,
        userId: userId,
        status: 'COMPLETED',
        courtId: 'court-1',
        review: null,
      });

      (prisma.review.create as jest.Mock).mockResolvedValue({
        id: 'review-1',
        ...dto,
        userId,
        courtId: 'court-1',
      });

      const result = await service.create(userId, dto);

      expect(result).toBeDefined();
      expect(prisma.review.create).toHaveBeenCalledWith({
        data: {
          rating: dto.rating,
          comment: dto.comment,
          userId: userId,
          courtId: 'court-1',
          bookingId: dto.bookingId,
        },
      });
    });

    it('Scenario 2 (Ownership Error): Nên báo lỗi nếu đơn hàng không phải của người dùng', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: dto.bookingId,
        userId: 'other-user',
        status: 'COMPLETED',
      });

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('Scenario 3 (Invalid Status Error): Nên báo lỗi nếu đơn hàng chưa hoàn tất', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: dto.bookingId,
        userId: userId,
        status: 'CONFIRMED',
      });

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('Scenario 4 (Duplicate Review Error): Nên báo lỗi nếu đã có đánh giá cho đơn hàng này', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: dto.bookingId,
        userId: userId,
        status: 'COMPLETED',
        review: { id: 'existing-review' },
      });

      await expect(service.create(userId, dto)).rejects.toThrow(ConflictException);
    });

    it('Nên báo lỗi nếu không tìm thấy đơn hàng', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCourtReviews', () => {
    it('Scenario 5 (Pagination): Nên trả về danh sách đánh giá có phân trang', async () => {
      const courtId = 'court-1';
      const mockReviews = [
        { id: 'r1', rating: 5, comment: 'Good', user: { fullName: 'User A', avatar: null } },
      ];
      const mockCount = 1;

      (prisma.review.findMany as jest.Mock).mockResolvedValue(mockReviews);
      (prisma.review.count as jest.Mock).mockResolvedValue(mockCount);

      const result = await service.getCourtReviews(courtId, 1, 10);

      expect(result).toEqual({
        data: mockReviews,
        meta: {
          total: mockCount,
          page: 1,
          limit: 10,
          lastPage: 1,
        },
      });
      expect(prisma.review.findMany).toHaveBeenCalled();
    });
  });
});
