import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from '../../src/booking/booking.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/redis/redis.service';
import { PaymentService } from '../../src/payment/payment.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, Court } from '@prisma/client';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: DeepMockProxy<PrismaClient>;
  let redisService: DeepMockProxy<RedisService>;
  let paymentService: DeepMockProxy<PaymentService>;

  const FIXED_SYSTEM_TIME = '2026-04-25T10:00:00.000Z'; // 17:00 VN
  const mockUserId = 'user-uuid';
  const mockCourtId = 'court-uuid';

  beforeEach(async () => {
    // 1. Freeze System Time
    jest.useFakeTimers();
    jest.setSystemTime(new Date(FIXED_SYSTEM_TIME));

    prisma = mockDeep<PrismaClient>();
    redisService = mockDeep<RedisService>();
    paymentService = mockDeep<PaymentService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redisService },
        { provide: PaymentService, useValue: paymentService },
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
    const mockCourt: Court = {
      id: mockCourtId,
      name: 'Professional Court',
      location: 'HCM',
      pricePerHour: 100000,
      openingTime: '05:00',
      closingTime: '22:00',
      description: '',
      amenities: [],
      images: [],
      ownerId: 'owner-id',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('1. Happy Path: Should lock slots and return checkoutUrl without creating DB record', async () => {
      // Mock Court
      prisma.court.findUnique.mockResolvedValue(mockCourt);
      // Mock No Double Booking in DB
      prisma.booking.findMany.mockResolvedValue([]);
      // Mock Redis Lock Success
      redisService.setnxWithExpire.mockResolvedValue(true);
      // Mock PayOS Link
      paymentService.generatePayosLink.mockResolvedValue({
        checkoutUrl: 'http://pay.os/link',
        orderCode: 12345,
      } as never);

      const dto = {
        courtId: mockCourtId,
        bookingDate: '2026-04-25',
        slots: ['18:00'], // 18:00 VN = 11:00 UTC (Future)
        totalPrice: 100000,
      };

      const result = await service.createMultiBooking(dto, mockUserId);

      expect(result).toHaveProperty('checkoutUrl', 'http://pay.os/link');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(redisService.setnxWithExpire).toHaveBeenCalledWith(
        expect.stringContaining('booking_lock'),
        mockUserId,
        600,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining('temp_order'),
        expect.stringContaining(mockUserId),
        600,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('2. Conflict: Should throw error if slot is already locked in Redis', async () => {
      prisma.court.findUnique.mockResolvedValue(mockCourt);
      redisService.setnxWithExpire.mockResolvedValue(false);

      const dto = {
        courtId: mockCourtId,
        bookingDate: '2026-04-25',
        slots: ['18:00'],
        totalPrice: 100000,
      };

      await expect(service.createMultiBooking(dto, mockUserId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('3. Validation: Past Time Booking should fail and release locks', async () => {
      prisma.court.findUnique.mockResolvedValue(mockCourt);
      redisService.setnxWithExpire.mockResolvedValue(true);

      const dto = {
        courtId: mockCourtId,
        bookingDate: '2026-04-25',
        slots: ['08:00'],
        totalPrice: 100000,
      };

      await expect(service.createMultiBooking(dto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(redisService.del).toHaveBeenCalled();
    });

    it('4. Validation: Outside Operating Hours should fail', async () => {
      prisma.court.findUnique.mockResolvedValue(mockCourt);
      redisService.setnxWithExpire.mockResolvedValue(true);

      const dto = {
        courtId: mockCourtId,
        bookingDate: '2026-04-25',
        slots: ['03:00'],
        totalPrice: 100000,
      };

      await expect(service.createMultiBooking(dto, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
