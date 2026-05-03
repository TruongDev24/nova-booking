/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { CourtService } from '../../src/court/court.service';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, Role } from '@prisma/client';
import { UserPayload } from '../../src/common/interfaces/user-payload.interface';
import { CreateCourtDto } from '../../src/court/dto/create-court.dto';
import { CloudinaryService } from '../../src/cloudinary/cloudinary.service';
import { PaginationQueryDto } from '../../src/common/dto/pagination-query.dto';

// Define interface for Prisma error to avoid unsafe casting
interface PrismaError extends Error {
  code?: string;
}

describe('CourtService', () => {
  let service: CourtService;
  let prisma: DeepMockProxy<PrismaClient>;
  let mailerService: DeepMockProxy<MailerService>;
  let cloudinaryService: Partial<Record<keyof CloudinaryService, jest.Mock>>;

  const mockOwnerId = 'owner-uuid';
  const mockCourtId = 'court-uuid';

  // FIX: Added 'description' and explicitly typed arrays
  const mockCourt = {
    id: mockCourtId,
    name: 'Test Stadium',
    location: 'District 1, HCM',
    description: 'Beautiful court', // Added missing field
    pricePerHour: 50000,
    openingTime: '05:00',
    closingTime: '22:00',
    amenities: ['Wifi'] as string[], // Typed as string[]
    images: [] as string[], // Typed as string[] (fixed never[])
    ownerId: mockOwnerId,
    isDeleted: false,
    _count: { reviews: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser: UserPayload = {
    sub: mockOwnerId,
    email: 'owner@example.com',
    role: Role.ADMIN,
    fullName: 'Owner Name',
  };

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();
    mailerService = mockDeep<MailerService>();

    // Mock $transaction to handle both Array and Callback versions
    prisma.$transaction.mockImplementation(async (arg) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(prisma);
    });

    // Default mock for ratings to avoid undefined errors in CourtService.findAll/findOne
    prisma.review.aggregate.mockResolvedValue({
      _avg: { rating: 0 },
      _count: { _all: 0 },
      _min: { rating: 0 },
      _max: { rating: 0 },
      _sum: { rating: 0 }
    } as any);

    cloudinaryService = {
      deleteFiles: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailerService, useValue: mailerService },
        { provide: CloudinaryService, useValue: cloudinaryService },
      ],
    }).compile();

    service = module.get<CourtService>(CourtService);
  });

  describe('1. Soft Delete (remove method)', () => {
    const mockFutureBooking = {
      id: 'booking-1',
      bookingDate: '2099-01-01',
      startTime: '10:00',
      user: { email: 'user@test.com', fullName: 'Test User' },
    };

    it('Scenario 1 (No Bookings): Successfully soft-deletes a court with no future bookings', async () => {
      // Giả lập tìm thấy sân
      prisma.court.findUnique.mockResolvedValue(mockCourt);
      // Giả lập KHÔNG có đơn đặt sân tương lai
      prisma.booking.findMany.mockResolvedValue([]);

      await service.remove(mockCourtId, mockOwnerId);

      // Kiểm tra sân được update thành deleted
      expect(prisma.court.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCourtId },
          data: { isDeleted: true },
        }),
      );

      // Kiểm tra không có mail nào được gửi
      expect(mailerService.sendMail).not.toHaveBeenCalled();
    });

    it('Scenario 2 (With Future Bookings - Happy Path): Successfully cancels bookings and sends emails', async () => {
      const futureBookings = [
        {
          ...mockFutureBooking,
          id: 'b1',
          user: { email: 'u1@t.com', fullName: 'U1' },
        },
        {
          ...mockFutureBooking,
          id: 'b2',
          user: { email: 'u2@t.com', fullName: 'U2' },
        },
      ];

      prisma.court.findUnique.mockResolvedValue(mockCourt);
      prisma.booking.findMany.mockResolvedValue(futureBookings as any);

      await service.remove(mockCourtId, mockOwnerId);

      // Kiểm tra transaction thực hiện hủy đơn
      expect(prisma.booking.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['b1', 'b2'] } },
          data: {
            status: 'CANCELLED',
            cancelReason: expect.stringContaining(mockCourt.name),
          },
        }),
      );

      // Kiểm tra mail được gửi đúng 2 lần
      expect(mailerService.sendMail).toHaveBeenCalledTimes(2);
      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'u1@t.com' }),
      );
    });

    it('Scenario 3 (Resilience Test - Partial Email Failure): Should not crash if one email fails', async () => {
      const futureBookings = [
        {
          ...mockFutureBooking,
          id: 'b1',
          user: { email: 'success@t.com', fullName: 'S' },
        },
        {
          ...mockFutureBooking,
          id: 'b2',
          user: { email: 'fail@t.com', fullName: 'F' },
        },
      ];

      prisma.court.findUnique.mockResolvedValue(mockCourt);
      prisma.booking.findMany.mockResolvedValue(futureBookings as any);

      // Mail 1 thành công, Mail 2 thất bại
      mailerService.sendMail
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('SMTP Error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Thực thi - không được throw error ra ngoài
      await service.remove(mockCourtId, mockOwnerId);

      // Vẫn thực hiện soft-delete và cancel bookings
      expect(prisma.court.update).toHaveBeenCalled();
      expect(prisma.booking.updateMany).toHaveBeenCalled();

      // Kiểm tra mailer được gọi cả 2 lần (không dừng lại ở mail 1)
      expect(mailerService.sendMail).toHaveBeenCalledTimes(2);

      // Chờ cho Promise.allSettled xử lý xong (vì nó chạy async sau transaction)
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send apology email to fail@t.com'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('Exception: should throw NotFoundException if court ID does not exist', async () => {
      prisma.court.findUnique.mockResolvedValue(null);
      await expect(service.remove('invalid-id', mockOwnerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Exception: should throw ForbiddenException if user is not the owner', async () => {
      prisma.court.findUnique.mockResolvedValue(mockCourt);
      await expect(service.remove(mockCourtId, 'wrong-owner')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('2. Read Courts (findAll & findOne)', () => {
    describe('findAll', () => {
      it('should filter out soft-deleted courts (isDeleted: false)', async () => {
        prisma.court.findMany.mockResolvedValue([mockCourt]);
        prisma.court.count.mockResolvedValue(1);

        await service.findAll(mockUser, {});

        expect(prisma.court.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              isDeleted: false,
            }),
          }),
        );
      });

      it('should apply pagination and search logic correctly', async () => {
        prisma.court.findMany.mockResolvedValue([mockCourt]);
        prisma.court.count.mockResolvedValue(1);

        const query: PaginationQueryDto = {
          page: 2,
          limit: 5,
          search: 'Stadium',
        };
        await service.findAll(mockUser, query);

        expect(prisma.court.findMany).toHaveBeenCalledWith({
          where: expect.objectContaining({
            isDeleted: false,
            OR: [
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ location: expect.any(Object) }),
            ],
          }),
          skip: 5,
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { reviews: true },
            },
          },
        });
      });
    });

    describe('findOne', () => {
      it('should fetch the court if not deleted', async () => {
        prisma.court.findUnique.mockResolvedValue(mockCourt);
        const result = await service.findOne(mockCourtId);
        expect(result).toEqual({
          ...mockCourt,
          avgRating: 0,
          totalReviews: 0,
        });
      });

      it('should throw NotFoundException for a soft-deleted court', async () => {
        prisma.court.findUnique.mockResolvedValue({
          ...mockCourt,
          isDeleted: true,
        });
        await expect(service.findOne(mockCourtId)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('3. Create Court (create)', () => {
    it('Happy Path: creates a court successfully', async () => {
      const dto: CreateCourtDto = {
        name: 'New Court',
        location: 'Address',
        description: 'New Description',
        pricePerHour: 60000,
        openingTime: '06:00',
        closingTime: '23:00',
      };
      prisma.court.create.mockResolvedValue({ ...mockCourt, ...dto });

      const result = await service.create(dto, mockOwnerId);

      expect(prisma.court.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...dto,
          ownerId: mockOwnerId,
        }),
      });
      expect(result.name).toBe(dto.name);
    });

    it('Edge Case (24/24 Hours): processes 00:00 to 00:00 successfully', async () => {
      const dto: CreateCourtDto = {
        name: '24h Court',
        location: 'Address',
        description: '24h',
        pricePerHour: 100000,
        openingTime: '00:00',
        closingTime: '00:00',
      };
      prisma.court.create.mockResolvedValue({ ...mockCourt, ...dto });

      await service.create(dto, mockOwnerId);

      expect(prisma.court.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          openingTime: '00:00',
          closingTime: '00:00',
        }),
      });
    });

    it('Edge Case (Fallback Hours): falls back to 05:00 and 22:00 if times are missing', async () => {
      // FIX: Used unknown as CreateCourtDto more safely
      const dto = {
        name: 'Fallback Court',
        location: 'Address',
        description: 'Fallback',
        pricePerHour: 50000,
      } as unknown as CreateCourtDto;

      prisma.court.create.mockResolvedValue({
        ...mockCourt,
        ...dto,
        openingTime: '05:00',
        closingTime: '22:00',
      });

      await service.create(dto, mockOwnerId);

      expect(prisma.court.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          openingTime: '05:00',
          closingTime: '22:00',
        }),
      });
    });
  });

  describe('4. Update Court (update)', () => {
    it('Happy Path: successfully updates court details', async () => {
      prisma.court.findUnique.mockResolvedValue(mockCourt);
      const updateDto = { name: 'Updated Name', pricePerHour: 75000 };
      prisma.court.update.mockResolvedValue({ ...mockCourt, ...updateDto });

      const result = await service.update(mockCourtId, updateDto, mockOwnerId);

      expect(prisma.court.update).toHaveBeenCalledWith({
        where: { id: mockCourtId },
        data: updateDto,
      });
      expect(result.name).toBe('Updated Name');
    });

    it('Exception: throws NotFoundException if court does not exist', async () => {
      prisma.court.findUnique.mockResolvedValue(null);
      await expect(
        service.update('invalid-id', {}, mockOwnerId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('5. Advanced Prisma Failure Handling', () => {
    it('should throw BadRequestException when database connection fails in findAll', async () => {
      prisma.court.findMany.mockRejectedValue(
        new Error('DB Connection Failed'),
      );

      await expect(service.findAll(mockUser, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle Prisma P2002 Unique Constraint error (Duplicate Name)', async () => {
      const prismaError: PrismaError = new Error(
        'Unique constraint failed on the fields: (`name`)',
      );
      prismaError.code = 'P2002'; // Safe assignment with interface

      prisma.court.create.mockRejectedValue(prismaError);

      await expect(
        service.create(
          { name: 'Existing Court' } as CreateCourtDto,
          mockOwnerId,
        ),
      ).rejects.toThrow();
    });
  });

  describe('6. Strict Ownership Validation (RBAC)', () => {
    it('Update: should throw ForbiddenException when updating a court owned by someone else', async () => {
      prisma.court.findUnique.mockResolvedValue({
        ...mockCourt,
        ownerId: 'other-user-uuid',
      });

      await expect(
        service.update(mockCourtId, { name: 'Hack' }, mockOwnerId),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.court.update).not.toHaveBeenCalled();
    });

    it('Delete: should throw ForbiddenException when deleting a court owned by someone else', async () => {
      prisma.court.findUnique.mockResolvedValue({
        ...mockCourt,
        ownerId: 'other-user-uuid',
      });

      await expect(service.remove(mockCourtId, mockOwnerId)).rejects.toThrow(
        ForbiddenException,
      );

      expect(prisma.court.update).not.toHaveBeenCalled();
    });
  });

  describe('7. Pagination & Meta Logic Edge Cases', () => {
    it('should default to page 1 if a negative page number is provided', async () => {
      prisma.court.findMany.mockResolvedValue([]);
      prisma.court.count.mockResolvedValue(0);

      const result = await service.findAll(mockUser, { page: -5, limit: 10 });

      expect(result.meta.page).toBe(1);
      expect(prisma.court.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('should correctly calculate lastPage (Rounding Up)', async () => {
      prisma.court.findMany.mockResolvedValue(
        new Array(10).fill(mockCourt) as (typeof mockCourt)[],
      );
      prisma.court.count.mockResolvedValue(11);

      const result = await service.findAll(mockUser, { page: 1, limit: 10 });

      expect(result.meta.lastPage).toBe(2);
      expect(result.meta.total).toBe(11);
    });
  });
});
