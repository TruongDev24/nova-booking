import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { UserPayload } from '../common/interfaces/user-payload.interface';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COURT_MANAGER)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getAnalytics(
    @Req() req: Request & { user: UserPayload },
    @Query('period') period?: string,
  ) {
    const userId = req.user.sub;
    const days = period ? parseInt(period, 10) : 7;
    return this.analyticsService.getAdminAnalytics(userId, days);
  }
}
