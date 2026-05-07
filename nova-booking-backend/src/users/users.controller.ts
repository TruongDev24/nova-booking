import { Controller, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { UserPayload } from '../common/interfaces/user-payload.interface';
import { UpdateBankDto } from './dto/update-bank.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profile/bank')
  @UseGuards(JwtAuthGuard)
  async updateBank(
    @GetUser() user: UserPayload,
    @Body() updateBankDto: UpdateBankDto,
  ) {
    return this.usersService.update(user.sub, updateBankDto);
  }
}
