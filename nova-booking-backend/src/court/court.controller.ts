import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CourtService } from './court.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../common/decorators/get-user.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import type { UserPayload } from '../common/interfaces/user-payload.interface';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Controller('courts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourtController {
  constructor(
    private readonly courtService: CourtService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 5))
  async create(
    @Body() body: Record<string, string | undefined>,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser('sub') userId: string,
  ) {
    try {
      const imageUrls =
        files?.length > 0
          ? await this.cloudinaryService.uploadFiles(files)
          : [];

      // Manual construction to handle FormData transformations (string -> number/array)
      const createCourtDto: CreateCourtDto = {
        name: body.name ?? '',
        location: body.location ?? '',
        description: body.description,
        openingTime: body.openingTime ?? '',
        closingTime: body.closingTime ?? '',
        pricePerHour: body.pricePerHour ? Number(body.pricePerHour) : 0,
        amenities: body.amenities
          ? (JSON.parse(body.amenities) as string[])
          : [],
        images: imageUrls,
      };

      return await this.courtService.create(createCourtDto, userId);
    } catch (error) {
      console.error('Court Create Error:', error);
      throw error;
    }
  }

  @Get()
  @Roles(Role.ADMIN, Role.USER)
  findAll(@GetUser() user: UserPayload, @Query() query: PaginationQueryDto) {
    return this.courtService.findAll(user, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.USER)
  findOne(@Param('id') id: string) {
    return this.courtService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 5))
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, string | undefined>,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser('sub') userId: string,
  ) {
    try {
      const imageUrls =
        files?.length > 0
          ? await this.cloudinaryService.uploadFiles(files)
          : [];

      const updateCourtDto: UpdateCourtDto = {
        name: body.name,
        location: body.location,
        description: body.description,
        openingTime: body.openingTime,
        closingTime: body.closingTime,
        pricePerHour: body.pricePerHour ? Number(body.pricePerHour) : undefined,
        amenities: body.amenities
          ? (JSON.parse(body.amenities) as string[])
          : undefined,
        images: imageUrls.length > 0 ? imageUrls : undefined,
      };

      return await this.courtService.update(id, updateCourtDto, userId);
    } catch (error) {
      console.error('Court Update Error:', error);
      throw error;
    }
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @GetUser('sub') userId: string) {
    return this.courtService.remove(id, userId);
  }

  @Post(':id/reactivate')
  @Roles(Role.ADMIN)
  reactivate(@Param('id') id: string, @GetUser('sub') userId: string) {
    return this.courtService.reactivate(id, userId);
  }
}
