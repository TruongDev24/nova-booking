/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { CourtService } from '../../src/court/court.service';
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

// Define interface for Prisma error to avoid unsafe casting
interface PrismaError extends Error {
  code?: string;
}

describe('CourtService', () => {
  let service: CourtService;
  let prisma: DeepMockProxy<PrismaClient>;

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourtService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CourtService>(CourtService);
  });

  describe('1. Soft Delete (remove method)', () => {
    it('Happy Path: should successfully soft-delete the court', async () => {
      prisma.court.findUnique.mockResolvedValue(mockCourt);
      prisma.court.update.mockResolvedValue({ ...mockCourt, isDeleted: true });

      await service.remove(mockCourtId, mockOwnerId);

      expect(prisma.court.update).toHaveBeenCalledWith({
        where: { id: mockCourtId },
        data: { isDeleted: true },
      });

      expect(prisma.court.delete).not.toHaveBeenCalled();
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

        await service.findAll(mockUser);

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

        const search = 'Stadium';
        await service.findAll(mockUser, 2, 5, search);

        expect(prisma.court.findMany).toHaveBeenCalledWith({
          where: expect.objectContaining({
            isDeleted: false,
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { location: { contains: search, mode: 'insensitive' } },
            ],
          }),
          skip: 5,
          take: 5,
          orderBy: { createdAt: 'desc' },
        });
      });
    });

    describe('findOne', () => {
      it('should fetch the court if not deleted', async () => {
        prisma.court.findUnique.mockResolvedValue(mockCourt);
        const result = await service.findOne(mockCourtId);
        expect(result).toEqual(mockCourt);
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

      await expect(service.findAll(mockUser)).rejects.toThrow(
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

      const result = await service.findAll(mockUser, -5, 10);

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

      const result = await service.findAll(mockUser, 1, 10);

      expect(result.meta.lastPage).toBe(2);
      expect(result.meta.total).toBe(11);
    });
  });
});
