import { Test, TestingModule } from '@nestjs/testing';
import { CourtService } from './court.service';
import { PrismaService } from '../prisma/prisma.service';
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

  const mockUser = { sub: 'owner-123', email: 'owner@example.com' };
  const mockCourt = {
    id: 'court-1',
    name: 'Sân số 1',
    ownerId: 'owner-123',
    isDeleted: false,
    pricePerHour: 50000,
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

  describe('findAll', () => {
    it('should return only active courts for the current owner', async () => {
      mockPrismaService.court.findMany.mockResolvedValue([mockCourt]);

      const result = await service.findAll(mockUser.sub);

      expect(mockPrismaService.court.findMany).toHaveBeenCalledWith({
        where: { ownerId: mockUser.sub, isDeleted: false },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockCourt]);
    });
  });

  describe('create', () => {
    it('should create a court with ownerId and default empty fields', async () => {
      const dto = { name: 'New Court', pricePerHour: 60000 };
      mockPrismaService.court.create.mockResolvedValue({
        ...mockCourt,
        ...dto,
      });

      const result = await service.create(dto, mockUser.sub);

      expect(mockPrismaService.court.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          description: '',
          amenities: [],
          images: [],
          ownerId: mockUser.sub,
        },
      });
      expect(result.name).toBe('New Court');
    });
  });

  describe('update', () => {
    it('should update court if user is the owner', async () => {
      mockPrismaService.court.findUnique.mockResolvedValue(mockCourt);
      mockPrismaService.court.update.mockResolvedValue({
        ...mockCourt,
        name: 'Updated',
      });

      const result = await service.update(
        mockCourt.id,
        { name: 'Updated' },
        mockUser.sub,
      );

      expect(result.name).toBe('Updated');
    });

    it('should throw ForbiddenException if user is NOT the owner', async () => {
      mockPrismaService.court.findUnique.mockResolvedValue(mockCourt);

      await expect(
        service.update(mockCourt.id, {}, 'wrong-owner'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if court is deleted', async () => {
      mockPrismaService.court.findUnique.mockResolvedValue({
        ...mockCourt,
        isDeleted: true,
      });

      await expect(
        service.update(mockCourt.id, {}, mockUser.sub),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove (Soft Delete)', () => {
    it('should set isDeleted to true and not delete from DB', async () => {
      mockPrismaService.court.findUnique.mockResolvedValue(mockCourt);
      mockPrismaService.court.update.mockResolvedValue({
        ...mockCourt,
        isDeleted: true,
      });

      await service.remove(mockCourt.id, mockUser.sub);

      expect(mockPrismaService.court.update).toHaveBeenCalledWith({
        where: { id: mockCourt.id },
        data: { isDeleted: true },
      });
    });
  });
});
