import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@GetUser('sub') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(userId, dto);
  }

  @Get('court/:id')
  getCourtReviews(
    @Param('id') courtId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.reviewService.getCourtReviews(courtId, page, limit);
  }
}
