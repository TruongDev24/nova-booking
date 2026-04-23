import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';

export class RegisterDto {
  @Transform(({ value }: { value: string | undefined }) => value?.trim())
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  @MaxLength(150)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty()
  password!: string;

  @Transform(({ value }: { value: string | undefined }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Full name is too long' })
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsEnum(Role, { message: 'Role must be either USER or ADMIN' })
  @IsOptional()
  role?: Role = Role.USER;
}
