import { IsNotEmpty, IsString, IsInt, Min, Max, Length } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsNotEmpty()
  @IsString()
  @Length(5, 500)
  comment: string;
}
