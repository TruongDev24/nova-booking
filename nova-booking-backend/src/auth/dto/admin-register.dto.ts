import { IsNotEmpty, IsString } from 'class-validator';
import { RegisterDto } from './register.dto';

export class AdminRegisterDto extends RegisterDto {
  @IsString()
  @IsNotEmpty()
  secretKey!: string;
}
