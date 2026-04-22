import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';

@Injectable()
export class CourtService {
  constructor(private prisma: PrismaService) {}

  async create(createCourtDto: CreateCourtDto) {
    return this.prisma.court.create({
      data: createCourtDto,
    });
  }

  async findAll() {
    return this.prisma.court.findMany({
      where: { isDeleted: false },
    });
  }

  async findOne(id: string) {
    const court = await this.prisma.court.findFirst({
      where: { id, isDeleted: false },
    });
    if (!court) {
      throw new NotFoundException(`Court with ID ${id} not found`);
    }
    return court;
  }

  async update(id: string, updateCourtDto: UpdateCourtDto) {
    await this.findOne(id); // Ensure exists and not deleted

    return this.prisma.court.update({
      where: { id },
      data: updateCourtDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure exists and not deleted

    return this.prisma.court.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
