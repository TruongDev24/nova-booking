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
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
}
