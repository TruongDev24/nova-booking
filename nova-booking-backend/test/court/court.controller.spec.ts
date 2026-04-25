/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CourtController } from '../../src/court/court.controller';
import { CourtService } from '../../src/court/court.service';
import { CloudinaryService } from '../../src/cloudinary/cloudinary.service';
import { Role } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserPayload } from '../../src/common/interfaces/user-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

describe('CourtController', () => {
  let controller: CourtController;
  let service: CourtService;
  let cloudinary: CloudinaryService;

  const mockUser: UserPayload = {
    sub: 'user-id',
    email: 'test@example.com',
    role: Role.ADMIN,
    fullName: 'Admin User',
  };

  // FIX: Added missing 'description' field and typed arrays correctly to avoid never[]
  const mockCourt = {
    id: 'court-id',
    name: 'Test Court',
    location: 'Test Location',
    description: 'A professional badminton court', // Added required field
    pricePerHour: 50000,
    openingTime: '05:00',
    closingTime: '22:00',
    amenities: ['Wifi'] as string[], // Explicitly typed
    images: [] as string[], // Explicitly typed
    ownerId: 'user-id',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourtController],
      providers: [
        {
          provide: CourtService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: CloudinaryService,
          useValue: {
            uploadFiles: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CourtController>(CourtController);
    service = module.get<CourtService>(CourtService);
    cloudinary = module.get<CloudinaryService>(CloudinaryService);
  });

  describe('1. Create & Update (Parsing & Exceptions)', () => {
    it('should create a court with correctly parsed price and amenities', async () => {
      const body = {
        name: 'New Court',
        location: 'Location',
        pricePerHour: '60000',
        amenities: JSON.stringify(['Wifi', 'Parking']),
      };
      const files: Express.Multer.File[] = [];

      jest.spyOn(service, 'create').mockResolvedValue(mockCourt);

      await controller.create(body, files, mockUser.sub);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pricePerHour: 60000,
          amenities: ['Wifi', 'Parking'],
        }),
        mockUser.sub,
      );
    });

    it('should propagate errors from Cloudinary or Service during creation', async () => {
      const body = {};
      const files: Express.Multer.File[] = [{} as Express.Multer.File];
      jest
        .spyOn(cloudinary, 'uploadFiles')
        .mockRejectedValue(new Error('Upload failed'));

      await expect(
        controller.create(body, files, mockUser.sub),
      ).rejects.toThrow('Upload failed');
    });

    it('should update a court and parse fields correctly', async () => {
      const body = { pricePerHour: '75000' };
      jest.spyOn(service, 'update').mockResolvedValue(mockCourt);

      await controller.update('court-id', body, [], mockUser.sub);

      expect(service.update).toHaveBeenCalledWith(
        'court-id',
        expect.objectContaining({ pricePerHour: 75000 }),
        mockUser.sub,
      );
    });
  });

  describe('2. findAll Endpoint', () => {
    it('Happy Path: should return paginated courts', async () => {
      const mockResult = {
        data: [mockCourt],
        meta: { total: 1, page: 1, limit: 10, lastPage: 1 },
      };
      jest.spyOn(service, 'findAll').mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser, 1, 10, 'Test');

      expect(service.findAll).toHaveBeenCalledWith(mockUser, 1, 10, 'Test');
      expect(result).toEqual(mockResult);
    });

    it('should handle large limits safely via service propagation', async () => {
      await controller.findAll(mockUser, 1, 9999);
      expect(service.findAll).toHaveBeenCalledWith(
        mockUser,
        1,
        9999,
        undefined,
      );
    });
  });

  describe('3. findOne Endpoint', () => {
    it('Happy Path: should return a single court', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockCourt);
      const result = await controller.findOne('court-id');
      expect(result).toEqual(mockCourt);
    });

    it('Exception: should propagate NotFoundException from service', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new NotFoundException('Not found'));
      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('4. remove Endpoint', () => {
    it('Happy Path: should successfully call remove', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);
      await controller.remove('court-id', mockUser.sub);
      expect(service.remove).toHaveBeenCalledWith('court-id', mockUser.sub);
    });

    it('Exception: should propagate ForbiddenException when user is not owner', async () => {
      jest
        .spyOn(service, 'remove')
        .mockRejectedValue(new ForbiddenException('Forbidden'));
      await expect(controller.remove('court-id', 'wrong-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
