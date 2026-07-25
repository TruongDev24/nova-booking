import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Extract exact message if it is formatted by validation pipes
    const cleanMessage =
      typeof message === 'object' && message !== null && 'message' in message
        ? message.message
        : message;

    // Log the full error to stdout for debugging
    this.logger.error(
      `Unhandled Exception [${status}]: ${JSON.stringify(cleanMessage)}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      message: cleanMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
