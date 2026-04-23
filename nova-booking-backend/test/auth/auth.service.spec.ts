import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { RegisterDto } from '../../src/auth/dto/register.dto';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmailOrPhone: jest.fn(),
    create: jest.fn(),
    findByEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
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
      role: Role.USER,
    };

    it('should throw ConflictException if user already exists', async () => {
      mockUsersService.findByEmailOrPhone.mockResolvedValue({ id: '1' });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash password and save user with default role', async () => {
      mockUsersService.findByEmailOrPhone.mockResolvedValue(null);

      const hashedPassword = 'hashedPassword';
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const savedUser = {
        id: 'uuid-123',
        ...registerDto,
        password: hashedPassword,
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.create.mockResolvedValue(savedUser);

      const result = await service.register(registerDto);

      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 'salt');
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...registerDto,
        password: hashedPassword,
      });
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(registerDto.email);
    });

    it('should save user with provided role if specified', async () => {
      const dtoWithRole: RegisterDto = { ...registerDto, role: Role.ADMIN };
      mockUsersService.findByEmailOrPhone.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({ ...dtoWithRole, id: '2' });

      await service.register(dtoWithRole);

      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.ADMIN }),
      );
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

    it('should return access_token and user object', () => {
      const token = 'jwt-token';
      mockJwtService.sign.mockReturnValue(token);

      const result = service.login(user);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
        role: user.role,
        fullName: user.fullName,
      });
      expect(result).toEqual({
        access_token: token,
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
