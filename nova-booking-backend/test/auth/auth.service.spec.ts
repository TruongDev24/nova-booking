import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { RegisterDto } from '../../src/auth/dto/register.dto';
import { RedisService } from '../../src/redis/redis.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmailOrPhone: jest.fn(),
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findByResetToken: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
  };

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockPrismaService = {
    refreshToken: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailerService, useValue: mockMailerService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'Password123',
      fullName: 'Test User',
      phone: '0987654321',
    };

    it('Scenario 1 (Happy Path - Strict No Auto-Login): Nên đăng ký thành công và KHÔNG tự động đăng nhập', async () => {
      // Mock: Email chưa tồn tại
      mockUsersService.findByEmailOrPhone.mockResolvedValue(null);

      const hashedPassword = 'hashedPassword';
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockJwtService.signAsync.mockResolvedValue('mock-token');

      const savedUser = {
        id: 'uuid-123',
        ...registerDto,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.create.mockResolvedValue(savedUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.register(registerDto);

      // Verify Prisma create was called
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          password: hashedPassword,
        }),
      );

      // Assertions match NEW service behavior (No Auto-Login)
      expect(result).not.toHaveProperty('access_token');
      expect(result).not.toHaveProperty('refresh_token');
      expect(result.email).toBe(registerDto.email);

      // Verify tokens were NOT generated or saved
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });

    it('Scenario 2 (Conflict Error - Email Exists): Nên báo lỗi nếu email đã tồn tại', async () => {
      // Mock: Email đã tồn tại
      mockUsersService.findByEmailOrPhone.mockResolvedValue({
        id: 'existing-id',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );

      // Verify: Không gọi hàm tạo người dùng
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123',
    };

    const user = {
      id: 'uuid-123',
      email: 'test@example.com',
      password: 'hashedPassword',
      fullName: 'John Doe',
      role: Role.USER,
    };

    it('should return user object without password on success', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(loginDto);

      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe(user.id);
      expect(result.email).toBe(user.email);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.validateUser(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    const user = {
      id: 'uuid-123',
      email: 'test@example.com',
      fullName: 'John Doe',
      role: Role.USER,
    };

    it('should return access_token and user object', async () => {
      const token = 'jwt-token';
      mockJwtService.signAsync.mockResolvedValue(token);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.login(user, 'test-agent');

      expect(mockJwtService.signAsync).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalled();
      expect(result).toEqual({
        access_token: token,
        refresh_token: token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });
    });
  });
});
