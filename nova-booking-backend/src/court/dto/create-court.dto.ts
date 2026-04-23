import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsOptional,
  IsArray,
  MinLength,
} from 'class-validator';

export class CreateCourtDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Tên sân phải có ít nhất 3 ký tự' })
  name!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsNumber()
  @Min(0)
  pricePerHour!: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  openingTime!: string;

  @IsString()
  @IsNotEmpty()
  closingTime!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}
