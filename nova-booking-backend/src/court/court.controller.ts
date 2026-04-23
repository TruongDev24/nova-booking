import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { CourtService } from './court.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../common/decorators/get-user.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

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

      const createCourtDto: CreateCourtDto = {
        name: body.name || '',
        location: body.location || '',
        description: body.description,
        openingTime: body.openingTime || '',
        closingTime: body.closingTime || '',
        pricePerHour: body.pricePerHour ? parseFloat(body.pricePerHour) : 0,
        amenities: body.amenities
          ? (JSON.parse(body.amenities) as string[])
          : [],
      };

      return await this.courtService.create(
        { ...createCourtDto, images: imageUrls },
        userId,
      );
    } catch (error) {
      console.error('Court Create Error:', error);
      throw error;
    }
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll(@GetUser('sub') userId: string) {
    return this.courtService.findAll(userId);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
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
        pricePerHour: body.pricePerHour
          ? parseFloat(body.pricePerHour)
          : undefined,
        amenities: body.amenities
          ? (JSON.parse(body.amenities) as string[])
          : undefined,
      };

      const finalUpdateData = {
        ...updateCourtDto,
        ...(imageUrls.length > 0 && { images: imageUrls }),
      };

      return await this.courtService.update(id, finalUpdateData, userId);
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
}
