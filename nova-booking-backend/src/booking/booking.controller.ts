import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  Patch,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, BookingStatus } from '@prisma/client';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { UserPayload } from '../common/interfaces/user-payload.interface';
import { Public } from '../auth/decorators/public.decorator';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // API xem slot phải là PUBLIC
  @Public()
  @Get('courts/:courtId/slots')
  getSlots(@Param('courtId') courtId: string, @Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('Date query is required (YYYY-MM-DD)');
    }
    return this.bookingService.getDailySlots(courtId, date);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createBookingDto: CreateBookingDto,
    @GetUser() user: UserPayload,
  ) {
    return this.bookingService.createMultiBooking(createBookingDto, user.sub);
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  findMy(@GetUser() user: UserPayload) {
    return this.bookingService.findMyBookings(user.sub);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @GetUser() user: UserPayload) {
    return this.bookingService.cancelBooking(id, user.sub);
  }

  // --- Admin Routes ---

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAllAdmin(
    @GetUser() user: UserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: BookingStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bookingService.findAllAdmin(
      user.sub,
      page,
      limit,
      search,
      status,
      startDate,
      endDate,
    );
  }

  @Patch('admin/:id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  confirm(@Param('id') id: string, @GetUser() user: UserPayload) {
    return this.bookingService.confirmBooking(id, user.sub);
  }

  @Patch('admin/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  cancelAdmin(@Param('id') id: string, @GetUser() user: UserPayload) {
    return this.bookingService.cancelBookingAdmin(id, user.sub);
  }
}
