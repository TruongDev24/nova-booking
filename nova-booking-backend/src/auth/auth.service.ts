import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import { UserPayload } from '../common/interfaces/user-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmailOrPhone(
      registerDto.email,
      registerDto.phone,
    );
    if (existingUser) {
      throw new ConflictException(
        'User with this email or phone already exists',
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const user = await this.usersService.create({
      email: registerDto.email,
      fullName: registerDto.fullName,
      phone: registerDto.phone,
      avatar: registerDto.avatar,
      password: hashedPassword,
      role: Role.USER,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  async registerAdmin(dto: AdminRegisterDto) {
    if (dto.secretKey !== this.configService.get('ADMIN_REGISTRATION_SECRET')) {
      throw new UnauthorizedException('Khóa bí mật quản trị viên không hợp lệ');
    }

    const existingUser = await this.usersService.findByEmailOrPhone(
      dto.email,
      dto.phone,
    );
    if (existingUser) {
      throw new ConflictException('Người dùng đã tồn tại');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const user = await this.usersService.create({
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone,
      avatar: dto.avatar,
      password: hashedPassword,
      role: Role.ADMIN,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  async validateUser(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...result } = user;
    return result;
  }

  async login(
    user: { id: string; email: string; role: Role; fullName: string },
    deviceInfo?: string,
  ) {
    const payload: UserPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      fullName: user.fullName,
    };

    const tokens = await this.generateTokens(payload);

    // Save refresh token to Redis (7 days TTL)
    const hashedToken = this.hashToken(tokens.refresh_token);
    const sessionData = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      device: deviceInfo,
    };
    await this.redisService.set(
      `rt:${hashedToken}`,
      JSON.stringify(sessionData),
      7 * 24 * 60 * 60,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async refreshTokens(refreshToken: string, deviceInfo?: string) {
    const hashedToken = this.hashToken(refreshToken);
    const sessionRaw = await this.redisService.get(`rt:${hashedToken}`);

    if (!sessionRaw) {
      throw new UnauthorizedException(
        'Refresh token đã hết hạn hoặc không hợp lệ',
      );
    }

    interface SessionData {
      userId: string;
      email: string;
      fullName: string;
      role: Role;
      device?: string;
    }

    let session: SessionData;
    try {
      session = JSON.parse(sessionRaw) as SessionData;
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const user = await this.usersService.findById(session.userId);
    if (!user) {
      await this.redisService.del(`rt:${hashedToken}`);
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị xóa');
    }

    const payload: UserPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      fullName: user.fullName,
    };

    const tokens = await this.generateTokens(payload);

    // RT Rotation: Delete old token from Redis and save new one
    await this.redisService.del(`rt:${hashedToken}`);

    const newHashedToken = this.hashToken(tokens.refresh_token);
    const newSessionData = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      device: deviceInfo || session.device,
    };
    await this.redisService.set(
      `rt:${newHashedToken}`,
      JSON.stringify(newSessionData),
      7 * 24 * 60 * 60, // 7 days in seconds
    );

    return tokens;
  }

  async logout(refreshToken: string) {
    const hashedToken = this.hashToken(refreshToken);
    await this.redisService.del(`rt:${hashedToken}`);
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(payload: UserPayload) {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '15m', // Access Token ngắn hạn
        secret: this.configService.get('JWT_SECRET'),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d', // Refresh Token dài hạn
        secret:
          this.configService.get('JWT_REFRESH_SECRET') || 'refresh-secret',
      }),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) throw new UnauthorizedException('Incorrect old password');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.newPassword, salt);

    await this.usersService.update(userId, { password: hashedPassword });
    return { message: 'Password changed successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return {
        message: 'If your email is registered, you will receive a reset link.',
      };
    }

    // Secure token generation and hashing
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await this.usersService.update(user.id, {
      resetToken: hashedToken,
      resetTokenExpiry,
    });

    const resetLink = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${rawToken}`;
    console.log(`📧 Attempting to send reset email to: ${user.email}`);

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Đặt lại mật khẩu - Nova Booking',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #0891b2; text-align: center;">Nova Booking</h2>
            <p>Chào <strong>${user.fullName}</strong>,</p>
            <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản tại <strong>Nova Booking</strong>.</p>
            <p>Vui lòng click vào nút bên dưới để tiến hành thiết lập lại mật khẩu. Liên kết này sẽ hết hạn sau 15 phút.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu</a>
            </div>
            <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #718096; text-align: center;">Đây là email tự động, vui lòng không phản hồi.</p>
          </div>
        `,
      });
      console.log(`✅ Reset email sent successfully to: ${user.email}`);
    } catch (error) {
      console.error('❌ Failed to send reset password email:', error);
    }

    return {
      message: 'If your email is registered, you will receive a reset link.',
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, resetToken, resetTokenExpiry, ...result } = user;
    return result;
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Hash the incoming raw token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const user = await this.usersService.findByResetToken(hashedToken);
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.newPassword, salt);

    await this.usersService.update(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    return { message: 'Password reset successfully' };
  }
}
