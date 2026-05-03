import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;
  let mailerService: Partial<Record<keyof MailerService, jest.Mock>>;
  let configService: Partial<Record<keyof ConfigService, jest.Mock>>;

  beforeEach(async () => {
    usersService = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      findByResetToken: jest.fn(),
    };
    jwtService = {
      sign: jest.fn(),
    };
    mailerService = {
      sendMail: jest.fn().mockResolvedValue({}),
    };
    configService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: MailerService, useValue: mailerService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = 'user-123';
      const dto = { oldPassword: 'old-password', newPassword: 'new-password' };
      const hashedPassword = await bcrypt.hash('old-password', 10);

      usersService.findById.mockResolvedValue({
        id: userId,
        password: hashedPassword,
      });
      usersService.update.mockResolvedValue({ id: userId });

      const result = await service.changePassword(userId, dto);

      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(usersService.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for incorrect old password', async () => {
      const userId = 'user-123';
      const dto = {
        oldPassword: 'wrong-password',
        newPassword: 'new-password',
      };
      const hashedPassword = await bcrypt.hash('old-password', 10);

      usersService.findById.mockResolvedValue({
        id: userId,
        password: hashedPassword,
      });

      await expect(service.changePassword(userId, dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      usersService.findById.mockResolvedValue(null);
      await expect(
        service.changePassword('none', { oldPassword: 'a', newPassword: 'b' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset token for existing email', async () => {
      const email = 'test@example.com';
      usersService.findByEmail.mockResolvedValue({ id: 'user-1', email });
      usersService.update.mockResolvedValue({ id: 'user-1' });

      const result = await service.forgotPassword({ email });

      expect(result.message).toContain('receive a reset link');
      expect(usersService.update).toHaveBeenCalled();
      expect(mailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: expect.any(String) as string,
        }),
      );
    });

    it('should return same message even if email not found (security)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const result = await service.forgotPassword({ email: 'none@test.com' });
      expect(result.message).toContain('receive a reset link');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const token = 'valid-token';
      const user = {
        id: 'user-1',
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() + 10000),
      };

      usersService.findByResetToken.mockResolvedValue(user);
      usersService.update.mockResolvedValue({ id: 'user-1' });

      const result = await service.resetPassword({
        token,
        newPassword: 'new-password',
      });

      expect(result.message).toBe('Password reset successfully');
      expect(usersService.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          password: expect.any(String) as string,
          resetToken: null,
          resetTokenExpiry: null,
        }),
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const token = 'expired-token';
      const user = {
        id: 'user-1',
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() - 10000),
      };

      usersService.findByResetToken.mockResolvedValue(user);

      await expect(
        service.resetPassword({ token, newPassword: 'new' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
