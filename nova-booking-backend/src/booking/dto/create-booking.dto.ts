import { IsNotEmpty, IsString, IsNumber, IsArray, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  courtId: string;

  @IsNotEmpty()
  @IsString()
  bookingDate: string; // YYYY-MM-DD

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  slots: string[]; // e.g., ["17:00", "18:00"]

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsNotEmpty()
  @IsNumber()
  totalPrice: number;
}
