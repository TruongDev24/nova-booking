import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
  Headers,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import * as express from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('admin/register')
  async registerAdmin(@Body() adminRegisterDto: AdminRegisterDto) {
    return this.authService.registerAdmin(adminRegisterDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const user = await this.authService.validateUser(loginDto);
    const result = await this.authService.login(user, userAgent);

    // Set refresh token in httpOnly cookie
    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Exclude refresh_token from the JSON response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refresh_token, ...body } = result;
    return body;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() request: express.Request,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const cookies = request.cookies as Record<string, string> | undefined;
    let refreshToken = cookies?.refresh_token;

    // Fallback: check request body
    const reqBody = request.body as Record<string, any> | undefined;
    if (!refreshToken && reqBody) {
      refreshToken = reqBody.refresh_token as string | undefined;
    }

    if (!refreshToken) {
      throw new UnauthorizedException('Không tìm thấy Refresh Token');
    }

    const result = await this.authService.refreshTokens(
      refreshToken,
      userAgent,
    );

    // Set new refresh token in httpOnly cookie (Rotation)
    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Exclude refresh_token from the JSON response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refresh_token, ...body } = result;
    return body;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const cookies = request.cookies as Record<string, string> | undefined;
    let refreshToken = cookies?.refresh_token;
    const reqBody = request.body as Record<string, any> | undefined;
    if (!refreshToken && reqBody) {
      refreshToken = reqBody.refresh_token as string | undefined;
    }

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(
    @GetUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('profile')
  async getProfile(@GetUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
