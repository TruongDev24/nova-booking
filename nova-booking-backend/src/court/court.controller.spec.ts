import { Test, TestingModule } from '@nestjs/testing';
import { CourtController } from './court.controller';
import { CourtService } from './court.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('CourtController', () => {
  let controller: CourtController;

  const mockCourtService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadFiles: jest.fn(),
  };

  const mockUser = { sub: 'user-1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourtController],
      providers: [
        { provide: CourtService, useValue: mockCourtService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CourtController>(CourtController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should upload files to cloudinary and call service.create', async () => {
      const mockFiles = [
        { buffer: Buffer.from('test') },
      ] as Express.Multer.File[];
      const mockBody = {
        name: 'Sân 1',
        pricePerHour: '50000',
        amenities: '["wifi", "parking"]',
      };
      const mockUrls = ['http://cloud.com/img.jpg'];

      mockCloudinaryService.uploadFiles.mockResolvedValue(mockUrls);
      mockCourtService.create.mockResolvedValue({ id: '1', ...mockBody });

      await controller.create(mockBody, mockFiles, mockUser.sub);

      expect(mockCloudinaryService.uploadFiles).toHaveBeenCalledWith(mockFiles);
      expect(mockCourtService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sân 1',
          pricePerHour: 50000,
          amenities: ['wifi', 'parking'],
          images: mockUrls,
        }),
        mockUser.sub,
      );
    });

    it('should handle creation without files', async () => {
      const mockBody = { name: 'Sân 2', pricePerHour: '40000' };
      await controller.create(mockBody, [], mockUser.sub);
      expect(mockCloudinaryService.uploadFiles).not.toHaveBeenCalled();
      expect(mockCourtService.create).toHaveBeenCalledWith(
        expect.objectContaining({ images: [] }),
        mockUser.sub,
      );
    });
  });

  describe('update', () => {
    it('should only update images if new files are provided', async () => {
      const mockId = 'court-1';
      const mockBody = { name: 'New Name' };
      const mockFiles = [
        { buffer: Buffer.from('new') },
      ] as Express.Multer.File[];
      const mockUrls = ['http://cloud.com/new.jpg'];

      mockCloudinaryService.uploadFiles.mockResolvedValue(mockUrls);

      await controller.update(mockId, mockBody, mockFiles, mockUser.sub);

      expect(mockCourtService.update).toHaveBeenCalledWith(
        mockId,
        expect.objectContaining({
          name: 'New Name',
          images: mockUrls,
        }),
        mockUser.sub,
      );
    });
  });
});
