/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from '../../src/booking/booking.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/redis/redis.service';
import { PaymentService } from '../../src/payment/payment.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, Court } from '@prisma/client';
import { NotificationGateway } from '../../src/notification/notification.gateway';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: DeepMockProxy<PrismaClient>;
  let redisService: DeepMockProxy<RedisService>;
  let paymentService: DeepMockProxy<PaymentService>;
  let notificationGateway: DeepMockProxy<NotificationGateway>;

  // FIXED_SYSTEM_TIME: 2026-04-25 10:00:00 UTC = 17:00:00 VN (GMT+7)
  const FIXED_SYSTEM_TIME = '2026-04-25T10:00:00.000Z';
  const mockUserId = 'user-uuid';
  const mockCourtId = 'court-uuid';

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(FIXED_SYSTEM_TIME));

    prisma = mockDeep<PrismaClient>();
    redisService = mockDeep<RedisService>();
    paymentService = mockDeep<PaymentService>();
    notificationGateway = mockDeep<NotificationGateway>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redisService },
        { provide: PaymentService, useValue: paymentService },
        { provide: NotificationGateway, useValue: notificationGateway },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  afterEach(() => {
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
      avgRating: 4.5,
      reviewCount: 10,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validDto = {
      courtId: mockCourtId,
      bookingDate: '2026-04-25',
      slots: ['19:00', '20:00'], // Future slots (Current time is 17:00 VN)
    };

    it('1. Happy Path: Should succeed when all conditions are met', async () => {
      // Mocks
      redisService.scard.mockResolvedValue(0); // 0 pending orders
      prisma.court.findUnique.mockResolvedValue(mockCourt);
      redisService.multiSetnxWithExpire.mockResolvedValue([true, true]); // Lock success
      prisma.booking.findMany.mockResolvedValue([]); // No DB conflicts
      paymentService.generatePayosLink.mockResolvedValue({
        checkoutUrl: 'https://pay.os/checkout/123',
        orderCode: 123456789,
      } as any);

      const result = await service.createMultiBooking(validDto, mockUserId);

      expect(result).toHaveProperty(
        'checkoutUrl',
        'https://pay.os/checkout/123',
      );
      expect(redisService.scard).toHaveBeenCalled();
      expect(redisService.multiSetnxWithExpire).toHaveBeenCalled();
      expect(notificationGateway.emitToRoom).toHaveBeenCalled();
    });

    it('2. Security (Anti-Spam): Should throw if user has >= 3 pending orders', async () => {
      redisService.scard.mockResolvedValue(3);

      await expect(
        service.createMultiBooking(validDto, mockUserId),
      ).rejects.toThrow(
        new BadRequestException(
          'Bạn đã đạt giới hạn đơn hàng đang chờ thanh toán. Vui lòng thanh toán hoặc đợi các đơn hàng cũ hết hạn.',
        ),
      );

      expect(prisma.court.findUnique).not.toHaveBeenCalled();
    });

    it('3. Security (Time Travel): Should throw if slot is in the past', async () => {
      redisService.scard.mockResolvedValue(0);
      prisma.court.findUnique.mockResolvedValue(mockCourt);

      const pastDto = {
        ...validDto,
        slots: ['08:00'], // 08:00 VN is in the past relative to 17:00 VN
      };

      await expect(
        service.createMultiBooking(pastDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
      expect(redisService.multiSetnxWithExpire).not.toHaveBeenCalled();
    });

    it('4. Concurrency/Locks: Should rollback acquired locks if one fails', async () => {
      redisService.scard.mockResolvedValue(0);
      prisma.court.findUnique.mockResolvedValue(mockCourt);

      // First slot succeeds, second fails in the batch
      redisService.multiSetnxWithExpire.mockResolvedValue([true, false]);

      await expect(
        service.createMultiBooking(validDto, mockUserId),
      ).rejects.toThrow(ConflictException);

      // Verify cleanup of the first acquired lock (index 0)
      expect(redisService.del).toHaveBeenCalledWith(
        `booking_lock:${mockCourtId}:${validDto.bookingDate}:19:00`,
      );
      expect(notificationGateway.emitToRoom).toHaveBeenCalledWith(
        expect.any(String),
        'slots_released',
        expect.any(Object),
      );
    });

    it('5. Validation: Should throw if court is deleted or missing', async () => {
      redisService.scard.mockResolvedValue(0);
      prisma.court.findUnique.mockResolvedValue({
        ...mockCourt,
        isDeleted: true,
      });

      await expect(
        service.createMultiBooking(validDto, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('6. Concurrency: Should cleanup locks if DB check finds conflict after locking', async () => {
      redisService.scard.mockResolvedValue(0);
      prisma.court.findUnique.mockResolvedValue(mockCourt);
      redisService.multiSetnxWithExpire.mockResolvedValue([true, true]);

      // Simulate another booking found in DB
      prisma.booking.findMany.mockResolvedValue([{ id: 'existing' } as any]);

      await expect(
        service.createMultiBooking(validDto, mockUserId),
      ).rejects.toThrow(ConflictException);

      // Verify cleanup of ALL locks
      expect(redisService.del).toHaveBeenCalled();
    });
  });

  describe('cancelBooking (Edge Cases)', () => {
    const mockBooking = {
      id: 'booking-id',
      userId: mockUserId,
      courtId: mockCourtId,
      bookingDate: '2026-04-26',
      startTime: '10:00',
      paymentStatus: 'PAID',
      status: 'CONFIRMED',
      court: { id: mockCourtId },
    };

    it('1. 12-Hour Rule: Should throw BadRequestException if cancelled < 12h before play', async () => {
      // Fixed time is 17:00 VN. Play time 20:00 VN (3 hours diff)
      const nearBooking = {
        ...mockBooking,
        bookingDate: '2026-04-25',
        startTime: '20:00',
      };

      prisma.booking.findUnique.mockResolvedValue(nearBooking as any);
      prisma.user.findUnique.mockResolvedValue({
        bankName: 'VCB',
        bankAccountNumber: '123456',
      } as any);

      await expect(
        service.cancelBooking('booking-id', mockUserId),
      ).rejects.toThrow(
        new BadRequestException(
          'Không thể hủy lịch trong vòng 12 giờ trước giờ bắt đầu chơi.',
        ),
      );
    });

    it('2. Authorization: Should throw ForbiddenException if user cancels others booking', async () => {
      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);

      await expect(
        service.cancelBooking('booking-id', 'intruder-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('3. Happy Path: Should set refundStatus to PENDING on successful cancellation', async () => {
      prisma.booking.findUnique.mockResolvedValue(mockBooking as any);
      prisma.user.findUnique.mockResolvedValue({
        bankName: 'VCB',
        bankAccountNumber: '123456',
      } as any);
      prisma.booking.update.mockResolvedValue({
        ...mockBooking,
        status: 'CANCELLED',
        refundStatus: 'PENDING',
      } as any);

      await service.cancelBooking('booking-id', mockUserId);

      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: 'CANCELLED',
            refundStatus: 'PENDING',
          },
        }),
      );
    });
  });

  describe('markAsRefunded (Admin Flow)', () => {
    const mockBookingForRefund = {
      id: 'booking-id',
      status: 'CANCELLED',
      refundStatus: 'PENDING',
      court: { ownerId: 'owner-id' },
    };

    it('1. Authorization: Should throw ForbiddenException if not the court owner', async () => {
      prisma.booking.findUnique.mockResolvedValue(mockBookingForRefund as any);

      await expect(
        service.markAsRefunded('booking-id', 'stranger-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('2. State Validation: Should throw BadRequestException if booking not PENDING refund', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...mockBookingForRefund,
        refundStatus: 'COMPLETED',
      } as any);

      await expect(
        service.markAsRefunded('booking-id', 'owner-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('3. Happy Path: Should update refundStatus to COMPLETED', async () => {
      prisma.booking.findUnique.mockResolvedValue(mockBookingForRefund as any);
      prisma.booking.update.mockResolvedValue({
        ...mockBookingForRefund,
        refundStatus: 'COMPLETED',
      } as any);

      const result = await service.markAsRefunded('booking-id', 'owner-id');

      expect(result.refundStatus).toBe('COMPLETED');
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            refundStatus: 'COMPLETED',
            paymentStatus: 'REFUNDED',
          },
        }),
      );
    });
  });
});
