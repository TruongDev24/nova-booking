import { validate } from 'class-validator';
import { RegisterDto } from '../../../src/auth/dto/register.dto';
import { plainToInstance } from 'class-transformer';

describe('RegisterDto', () => {
  let dto: RegisterDto;

  beforeEach(() => {
    dto = new RegisterDto();
  });

  it('should validate a valid DTO', async () => {
    dto.email = 'test@example.com';
    dto.password = 'Password123';
    dto.fullName = 'John Doe';
    dto.phone = '0123456789';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if email is invalid', async () => {
    dto.email = 'invalid-email';
    dto.password = 'Password123';
    dto.fullName = 'John Doe';
    dto.phone = '0123456789';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });

  it('should fail if password is too short', async () => {
    dto.email = 'test@example.com';
    dto.password = 'short';
    dto.fullName = 'John Doe';
    dto.phone = '0123456789';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('should fail if fullName is too long', async () => {
    dto.email = 'test@example.com';
    dto.password = 'Password123';
    dto.fullName = 'a'.repeat(101);
    dto.phone = '0123456789';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('should fail if phone is empty', async () => {
    dto.email = 'test@example.com';
    dto.password = 'Password123';
    dto.fullName = 'John Doe';
    dto.phone = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should trim email and fullName when transformed', () => {
    const plainData = {
      email: '  test@example.com  ',
      fullName: '  John Doe  ',
      password: 'Password123',
      phone: '0123456789',
    };

    const transformedDto = plainToInstance(RegisterDto, plainData);

    expect(transformedDto.email).toBe('test@example.com');
    expect(transformedDto.fullName).toBe('John Doe');
  });
});
