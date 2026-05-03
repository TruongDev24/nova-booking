import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  courtId: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'bookingDate must be in YYYY-MM-DD format',
  })
  bookingDate: string; // YYYY-MM-DD

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^\d{2}:\d{2}$/, {
    each: true,
    message: 'each slot must be in HH:mm format',
  })
  slots: string[]; // e.g., ["17:00", "18:00"]

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @IsNotEmpty()
  @IsNumber()
  totalPrice: number;
}
