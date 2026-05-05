import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Public } from '../auth/decorators/public.decorator';
import * as express from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    const body = req.body as unknown;
    try {
      // We still use the service for the heavy lifting, but we control the response here
      await this.paymentService.handleWebhook(body);
      return res.status(200).json({ success: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        'PayOS Webhook Verification Note/Error (Expected during test ping):',
        errorMessage,
      );
      // CRITICAL: Always return 200 OK so PayOS dashboard accepts the URL setup
      return res.status(200).json({
        success: true,
        message: 'Webhook received (registration mode)',
      });
    }
  }
}
