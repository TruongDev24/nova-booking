import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
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
        ? (message as any).message
        : message;

    response.status(status).json({
      success: false,
      statusCode: status,
      message: cleanMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
