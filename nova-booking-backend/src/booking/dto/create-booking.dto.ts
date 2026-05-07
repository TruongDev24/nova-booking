import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsFutureOrToday } from '../../common/decorators/is-future-or-today.decorator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'The unique identifier (UUID) of the court',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'courtId must be a valid UUID v4' })
  courtId: string;

  @ApiProperty({
    description:
      'Booking date in YYYY-MM-DD format (must be today or in the future)',
    example: '2026-05-10',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'bookingDate must be in YYYY-MM-DD format',
  })
  @IsFutureOrToday()
  bookingDate: string;

  @ApiProperty({
    description: 'List of booking slots in HH:00 format (Max 4 slots)',
    example: ['08:00', '09:00', '18:00'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'At least one slot must be selected' })
  @ArrayMaxSize(4, {
    message: 'A maximum of 4 slots can be booked per request',
  })
  @ArrayUnique({ message: 'Duplicate slots are not allowed' })
  @Matches(/^([01]\d|2[0-3]):00$/, {
    each: true,
    message:
      'Each slot must strictly match the HH:00 format (e.g., 05:00, 18:00)',
  })
  slots: string[];
}
