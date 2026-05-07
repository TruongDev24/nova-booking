import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BookingStatus, Role } from '@prisma/client';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { UserPayload } from '../common/interfaces/user-payload.interface';
import { Public } from '../auth/decorators/public.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Bookings')
@Controller('bookings')
@ApiBearerAuth()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // API xem slot phải là PUBLIC
  @Public()
  @Get('courts/:courtId/slots')
  @ApiOperation({ summary: 'View available slots for a specific court and date' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' })
  @ApiResponse({ status: 200, description: 'Returns array of time slots' })
  getSlots(@Param('courtId') courtId: string, @Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('Date query is required (YYYY-MM-DD)');
    }
    return this.bookingService.getDailySlots(courtId, date);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new multi-slot booking' })
  @ApiResponse({ status: 201, description: 'Booking created and payment link generated' })
  @ApiResponse({ status: 409, description: 'Slots are already locked or booked' })
  create(
    @Body() createBookingDto: CreateBookingDto,
    @GetUser() user: UserPayload,
  ) {
    console.log('--- DEBUG BOOKING PAYLOAD ---');
    console.log('User ID:', user.sub);
    console.log('Payload:', JSON.stringify(createBookingDto, null, 2));
    return this.bookingService.createMultiBooking(createBookingDto, user.sub);
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user booking history' })
  @ApiResponse({ status: 200, description: 'Returns list of user bookings' })
  findMy(@GetUser() user: UserPayload) {
    return this.bookingService.findMyBookings(user.sub);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel a booking (Customer flow)' })
  @ApiResponse({ status: 200, description: 'Booking cancelled and refund initialized' })
  @ApiResponse({ status: 400, description: 'Cancellation blocked by 12h policy' })
  cancel(@Param('id') id: string, @GetUser() user: UserPayload) {
    return this.bookingService.cancelBooking(id, user.sub);
  }

  // --- Admin Routes ---

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAllAdmin(
    @GetUser() user: UserPayload,
    @Query() query: PaginationQueryDto,
    @Query('status') status?: BookingStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bookingService.findAllAdmin(
      user.sub,
      query,
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

  @Patch('admin/:id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Mark a booking as refunded (Admin manual transfer)' })
  @ApiResponse({ status: 200, description: 'Refund status updated to COMPLETED' })
  markAsRefunded(@Param('id') id: string, @GetUser() user: UserPayload) {
    return this.bookingService.markAsRefunded(id, user.sub);
  }
}
