import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'NOVA Booking API',
      timestamp: new Date().toISOString(),
    };
  }
}
