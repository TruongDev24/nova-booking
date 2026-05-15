import { Controller, Logger, Post, Req, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Public } from '../common/decorators/public.decorator';
import * as express from 'express';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    const body = req.body as unknown;

    try {
      // Fulfillment logic is encapsulated in the service
      await this.paymentService.handleWebhook(body);

      // Always return 200 OK to PayOS to stop retries
      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        'Unexpected Error in PaymentController.handleWebhook:',
        errorMessage,
      );

      // CRITICAL: Always return 200 OK so PayOS dashboard accepts the URL setup
      // and stops retrying failed/unauthorized webhooks.
      return res.status(200).json({
        success: true,
        message: 'Webhook received (error logged)',
      });
    }
  }
}
