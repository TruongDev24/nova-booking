import { Test, TestingModule } from '@nestjs/testing';
import { CourtService } from '../../src/court/court.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('CourtService', () => {
  let service: CourtService;

  const mockPrismaService = {
    court: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CourtService>(CourtService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new court linked to owner', async () => {
      const dto = {
        name: 'Sân số 1',
        location: 'Hà Nội',
        pricePerHour: 50000,
        description: 'Sân đẹp',
        openingTime: '05:00',
        closingTime: '22:00',
      };
      const ownerId = 'user-1';
      const expectedResult = { id: 'court-1', ...dto, ownerId };

      mockPrismaService.court.create.mockResolvedValue(expectedResult);

      const result = await service.create(dto, ownerId);

      expect(mockPrismaService.court.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          description: dto.description ?? '',
          amenities: [],
          images: [],
          ownerId,
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return all courts for a specific owner', async () => {
      const ownerId = 'user-1';
      const courts = [{ id: '1', name: 'Sân 1', ownerId }];
      mockPrismaService.court.findMany.mockResolvedValue(courts);

      const result = await service.findAll(ownerId);

      expect(mockPrismaService.court.findMany).toHaveBeenCalledWith({
        where: { ownerId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(courts);
    });
  });

  describe('update', () => {
    const courtId = 'court-1';
    const ownerId = 'user-1';
    const existingCourt = { id: courtId, ownerId, isDeleted: false };

    it('should update court if owner matches', async () => {
      const updateDto = { name: 'Sân mới' };
      mockPrismaService.court.findUnique.mockResolvedValue(existingCourt);
      mockPrismaService.court.update.mockResolvedValue({
        ...existingCourt,
        ...updateDto,
      });

      const result = await service.update(courtId, updateDto, ownerId);

      expect(result.name).toBe('Sân mới');
      expect(mockPrismaService.court.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if owner does not match', async () => {
      mockPrismaService.court.findUnique.mockResolvedValue(existingCourt);

      await expect(
        service.update(courtId, {}, 'wrong-owner-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if court not found', async () => {
      mockPrismaService.court.findUnique.mockResolvedValue(null);

      await expect(service.update(courtId, {}, ownerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    const courtId = 'court-1';
    const ownerId = 'user-1';
    const existingCourt = { id: courtId, ownerId, isDeleted: false };

    it('should soft delete court (isDeleted: true) if owner matches', async () => {
      mockPrismaService.court.findUnique.mockResolvedValue(existingCourt);
      mockPrismaService.court.update.mockResolvedValue({
        ...existingCourt,
        isDeleted: true,
      });

      const result = await service.remove(courtId, ownerId);

      expect(mockPrismaService.court.update).toHaveBeenCalledWith({
        where: { id: courtId },
        data: { isDeleted: true },
      });
      expect(result.isDeleted).toBe(true);
    });

    it('should throw ForbiddenException if trying to delete others court', async () => {
      mockPrismaService.court.findUnique.mockResolvedValue(existingCourt);

      await expect(service.remove(courtId, 'hacker-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
