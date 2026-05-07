/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '../../src/payment/payment.service';
import { PaymentController } from '../../src/payment/payment.controller';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { Response } from 'express';
import { NotificationGateway } from '../../src/notification/notification.gateway';

// Mock PayOS
jest.mock('@payos/node', () => {
  return {
    PayOS: jest.fn().mockImplementation(() => ({
      webhooks: {
        verify: jest.fn(),
      },
    })),
  };
});

describe('Payment Webhook Integration', () => {
  let service: PaymentService;
  let controller: PaymentController;
  let prisma: DeepMockProxy<PrismaClient>;
  let redisService: DeepMockProxy<RedisService>;
  let configService: DeepMockProxy<ConfigService>;
  let notificationGateway: DeepMockProxy<NotificationGateway>;
  let mockPayOS: any;

  const mockOrderCode = 123456789;
  const mockWebhookBody = { data: { orderCode: mockOrderCode } };

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();
    redisService = mockDeep<RedisService>();
    configService = mockDeep<ConfigService>();
    notificationGateway = mockDeep<NotificationGateway>();

    configService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        PAYOS_CLIENT_ID: 'id',
        PAYOS_API_KEY: 'key',
        PAYOS_CHECKSUM_KEY: 'checksum',
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redisService },
        { provide: ConfigService, useValue: configService },
        { provide: NotificationGateway, useValue: notificationGateway },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    controller = module.get<PaymentController>(PaymentController);
    mockPayOS = (service as any).payos;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PaymentController.handleWebhook', () => {
    it('1. Security: Should return 200 OK even if signature verification fails', async () => {
      mockPayOS.webhooks.verify.mockRejectedValue(
        new Error('Invalid signature'),
      );

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await controller.handleWebhook({ body: 'bad' } as any, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('PaymentService.handleWebhook', () => {
    it('2. Idempotency: Should skip if another thread is processing the same order', async () => {
      mockPayOS.webhooks.verify.mockResolvedValue({ orderCode: mockOrderCode });
      // Simulate lock failure
      redisService.setnxWithExpire.mockResolvedValue(false);

      const result = await service.handleWebhook(mockWebhookBody);

      expect(result).toEqual({ success: true });
      expect(redisService.setnxWithExpire).toHaveBeenCalledWith(
        `webhook_processing:${mockOrderCode}`,
        expect.any(String),
        30,
      );
      expect(prisma.booking.findFirst).not.toHaveBeenCalled();
    });

    it('3. Security (Amount Mismatch): Should abort if paid amount differs from cached totalPrice', async () => {
      mockPayOS.webhooks.verify.mockResolvedValue({
        orderCode: mockOrderCode,
        amount: 2000, // Manipulated small amount
      });
      redisService.setnxWithExpire.mockResolvedValue(true);

      // Mock cached order with higher price
      const mockPayload = {
        totalPrice: 50000,
        userId: 'u1',
        courtId: 'c1',
        slots: [{ startTime: '10:00', endTime: '11:00' }],
      };
      redisService.get.mockResolvedValue(JSON.stringify(mockPayload));

      const result = await service.handleWebhook(mockWebhookBody);

      expect(result).toEqual({ success: true });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      // Ensure processing lock is still released in finally block
      expect(redisService.del).toHaveBeenCalledWith(
        `webhook_processing:${mockOrderCode}`,
      );
    });

    it('4. Happy Path & Cleanup: Should fulfill booking and clean up all Redis keys', async () => {
      const mockPrice = 100000;
      const mockPayload = {
        userId: 'user-1',
        courtId: 'court-1',
        bookingDate: '2026-05-10',
        slots: [{ startTime: '10:00', endTime: '11:00' }],
        totalPrice: mockPrice,
      };

      mockPayOS.webhooks.verify.mockResolvedValue({
        orderCode: mockOrderCode,
        amount: mockPrice,
        paymentLinkId: 'link-123',
      });
      redisService.setnxWithExpire.mockResolvedValue(true);
      redisService.get.mockResolvedValue(JSON.stringify(mockPayload));
      prisma.booking.findFirst.mockResolvedValue(null); // No previous fulfillment

      // Mock Court and User for Notification
      prisma.court.findUnique.mockResolvedValue({
        ownerId: 'owner-1',
        name: 'Court A',
      } as any);
      prisma.user.findUnique.mockResolvedValue({
        fullName: 'Customer A',
      } as any);

      // Execute webhook
      const result = await service.handleWebhook(mockWebhookBody);

      expect(result).toEqual({ success: true });

      // Verify Transaction
      expect(prisma.$transaction).toHaveBeenCalled();

      // Verify Notification
      expect(notificationGateway.notifyOwner).toHaveBeenCalled();

      // Verify Cleanup
      // a. Temp Order payload
      expect(redisService.del).toHaveBeenCalledWith(
        `temp_order:${mockOrderCode}`,
      );
      // b. Slot locks
      expect(redisService.del).toHaveBeenCalledWith(
        `booking_lock:court-1:2026-05-10:10:00`,
      );
      // c. User pending set
      expect(redisService.srem).toHaveBeenCalledWith(
        `user_pending_orders:user-1`,
        mockOrderCode.toString(),
      );
      // d. Webhook processing lock (from finally)
      expect(redisService.del).toHaveBeenCalledWith(
        `webhook_processing:${mockOrderCode}`,
      );
    });
  });
});
