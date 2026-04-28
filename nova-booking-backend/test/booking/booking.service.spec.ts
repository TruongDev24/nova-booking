import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from '../../src/booking/booking.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, BookingStatus } from '@prisma/client';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: DeepMockProxy<PrismaClient>;

  const FIXED_SYSTEM_TIME = '2026-04-25T10:00:00.000Z'; // 17:00 VN
  const mockUserId = 'user-uuid';
  const mockCourtId = 'court-uuid';

  beforeEach(async () => {
    // 1. Freeze System Time
    jest.useFakeTimers();
    jest.setSystemTime(new Date(FIXED_SYSTEM_TIME));

    prisma = mockDeep<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  afterEach(() => {
    // 2. Clean up timers
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('createMultiBooking', () => {
    const mockCourt = {
      id: mockCourtId,
      name: 'Professional Court',
      location: 'HCM',
      pricePerHour: 100000,
      openingTime: '05:00',
      closingTime: '22:00',
      ownerId: 'owner-id',
      isDeleted: false,
    };

    it('1. Happy Path (Success): User books a valid available future slot', async () => {
      // Mock Court: Open 05:00-22:00
      prisma.court.findUnique.mockResolvedValue(mockCourt as any);
      // Mock No Double Booking
      prisma.booking.findMany.mockResolvedValue([]);
      // Mock Transaction
      prisma.$transaction.mockImplementation(async (promises: any) => promises);

      const dto = {
        courtId: mockCourtId,
        bookingDate: '2026-04-25',
        slots: ['18:00'], // 18:00 VN = 11:00 UTC (Future)
        totalPrice: 100000,
      };

      await service.createMultiBooking(dto, mockUserId);

      // Verify prisma.booking.create was called inside transaction
      expect(prisma.booking.create).toHaveBeenCalledWith({
        data: {
          courtId: mockCourtId,
          userId: mockUserId,
          bookingDate: '2026-04-25',
          startTime: '18:00',
          endTime: '19:00',
          totalPrice: 100000,
          status: BookingStatus.PENDING,
        },
      });
    });

    it('2. Validation: Past Time Booking (The "Time Travel" Bug)', async () => {
      prisma.court.findUnique.mockResolvedValue(mockCourt as any);

      const dto = {
        courtId: mockCourtId,
        bookingDate: '2026-04-25',
        slots: ['08:00'], // 08:00 VN = 01:00 UTC (Past relative to 10:00 UTC)
        totalPrice: 100000,
      };

      await expect(service.createMultiBooking(dto, mockUserId)).rejects.toThrow(
        new BadRequestException('Khung giờ 08:00 đã trôi qua. Vui lòng chọn khung giờ khác.'),
      );

      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('3. Validation: Outside Operating Hours (The "Closed" Bug)', async () => {
      prisma.court.findUnique.mockResolvedValue(mockCourt as any);

      const dto = {
        courtId: mockCourtId,
        bookingDate: '2026-04-25',
        slots: ['03:00'], // 03:00 VN is outside 05:00-22:00
        totalPrice: 100000,
      };

      await expect(service.createMultiBooking(dto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );

      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('4. Validation: Double Booking / Conflict', async () => {
      prisma.court.findUnique.mockResolvedValue(mockCourt as any);
      // Mock existing booking
      prisma.booking.findMany.mockResolvedValue([
        { startTime: '19:00' } as any,
      ]);

      const dto = {
        courtId: mockCourtId,
        bookingDate: '2026-04-25',
        slots: ['19:00'],
        totalPrice: 100000,
      };

      await expect(service.createMultiBooking(dto, mockUserId)).rejects.toThrow(
        new ConflictException('Các khung giờ sau đã được đặt: 19:00'),
      );

      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('5. Edge Case: Cross-Day / 24h Court Success', async () => {
      // Mock Court: Cross-day 23:00 to 22:00 next day
      const crossDayCourt = {
        ...mockCourt,
        openingTime: '23:00',
        closingTime: '22:00',
      };
      prisma.court.findUnique.mockResolvedValue(crossDayCourt as any);
      prisma.booking.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation(async (promises: any) => promises);

      const dto = {
        courtId: mockCourtId,
        bookingDate: '2026-04-25',
        slots: ['02:00'], // 02:00 AM VN of April 25 (Started 23:00 April 24)
        totalPrice: 100000,
      };

      // Since system time is 10:00 UTC (17:00 VN) on April 25, 02:00 VN is in the past!
      // Wait, to test success of cross-day logic, I need a FUTURE slot in a cross-day setup.
      // Let's use April 26 02:00 AM VN.
      const futureDto = {
        ...dto,
        bookingDate: '2026-04-26', 
      };

      await service.createMultiBooking(futureDto, mockUserId);

      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingDate: '2026-04-26',
            startTime: '02:00',
          }),
        }),
      );
    });
  });
});
