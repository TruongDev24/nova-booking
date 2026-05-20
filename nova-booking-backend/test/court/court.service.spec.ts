/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CourtService } from '../../src/court/court.service';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../../src/prisma/prisma.service';

import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient, Role } from '@prisma/client';
import { UserPayload } from '../../src/common/interfaces/user-payload.interface';
import { CreateCourtDto } from '../../src/court/dto/create-court.dto';
import { CloudinaryService } from '../../src/cloudinary/cloudinary.service';
import { PaginationQueryDto } from '../../src/common/dto/pagination-query.dto';
import { NotificationGateway } from '../../src/notification/notification.gateway';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('CourtService', () => {
  let service: CourtService;
  let prisma: DeepMockProxy<PrismaClient>;
  let mailerService: DeepMockProxy<MailerService>;
  let cloudinaryService: Partial<Record<keyof CloudinaryService, jest.Mock>>;
  let notificationGateway: DeepMockProxy<NotificationGateway>;

  const mockOwnerId = 'owner-uuid';
  const mockCourtId = 'court-uuid';

  const mockCourt = {
    id: mockCourtId,
    name: 'Test Stadium',
    location: 'District 1, HCM',
    description: 'Beautiful court',
    pricePerHour: 50000,
    openingTime: '05:00',
    closingTime: '22:00',
    amenities: ['Wifi'] as string[],
    images: [] as string[],
    ownerId: mockOwnerId,
    isDeleted: false,
    _count: { reviews: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    avgRating: 0,
    reviewCount: 0,
  };

  const mockRegularUser: UserPayload = {
    sub: 'user-uuid',
    email: 'user@example.com',
    role: Role.USER,
    fullName: 'Regular User',
  };

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();
    mailerService = mockDeep<MailerService>();
    notificationGateway = mockDeep<NotificationGateway>();

    prisma.$transaction.mockImplementation(async (arg) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(prisma);
    });

    cloudinaryService = {
      deleteFiles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailerService, useValue: mailerService },
        { provide: CloudinaryService, useValue: cloudinaryService },
        { provide: NotificationGateway, useValue: notificationGateway },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            stores: [
              {
                keys: jest.fn().mockResolvedValue([]),
              },
            ],
          },
        },
      ],
    }).compile();

    service = module.get<CourtService>(CourtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Soft Delete (remove method)', () => {
    const mockFutureBooking = {
      id: 'booking-1',
      bookingDate: '2099-01-01',
      startTime: '10:00',
      user: { email: 'user@test.com', fullName: 'Test User' },
      userId: 'user-uuid',
    };

    it('Scenario 1 (No Bookings): Successfully soft-deletes a court with no future bookings', async () => {
      prisma.court.findUnique.mockResolvedValue(mockCourt);
      prisma.booking.findMany.mockResolvedValue([]);

      await service.remove(mockCourtId, mockOwnerId);

      expect(prisma.court.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCourtId },
          data: { isDeleted: true },
        }),
      );
      expect(notificationGateway.emitToRoom).toHaveBeenCalledWith(
        'room_global_courts',
        'court_status_changed',
        expect.any(Object),
      );
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

      expect(prisma.booking.update).toHaveBeenCalled();
      expect(notificationGateway.emitToRoom).toHaveBeenCalledWith(
        expect.stringContaining('room_user_'),
        'booking_canceled',
        expect.any(Object),
      );
      expect(mailerService.sendMail).toHaveBeenCalledTimes(2);
    });
  });

  describe('2. Read Courts (findAll & findOne)', () => {
    describe('findAll', () => {
      it('should apply pagination and search logic correctly', async () => {
        prisma.court.findMany.mockResolvedValue([mockCourt]);
        prisma.court.count.mockResolvedValue(1);

        const query: PaginationQueryDto = {
          page: 2,
          limit: 5,
          search: 'Stadium',
        };
        await service.findAll(mockRegularUser, query);

        expect(prisma.court.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 5, take: 5 }),
        );
      });
    });

    describe('findOne', () => {
      it('should fetch the court if not deleted', async () => {
        prisma.court.findUnique.mockResolvedValue(mockCourt);
        const result = await service.findOne(mockCourtId);
        expect(result.id).toBe(mockCourtId);
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

      await service.create(dto, mockOwnerId);

      expect(prisma.court.create).toHaveBeenCalled();
      expect(notificationGateway.emitToRoom).toHaveBeenCalledWith(
        'room_global_courts',
        'court_added',
        expect.any(Object),
      );
    });
  });

  describe('4. Update Court (update)', () => {
    it('Happy Path: successfully updates court details', async () => {
      prisma.court.findUnique.mockResolvedValue(mockCourt);
      const updateDto = { name: 'Updated Name' };
      prisma.court.update.mockResolvedValue({
        ...mockCourt,
        ...updateDto,
      });

      await service.update(mockCourtId, updateDto, mockOwnerId);

      expect(prisma.court.update).toHaveBeenCalled();
      expect(notificationGateway.emitToRoom).toHaveBeenCalledWith(
        'room_global_courts',
        'court_updated',
        expect.any(Object),
      );
    });
  });
});
