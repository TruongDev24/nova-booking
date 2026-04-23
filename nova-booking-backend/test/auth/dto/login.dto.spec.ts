import { validate } from 'class-validator';
import { LoginDto } from '../../../src/auth/dto/login.dto';

describe('LoginDto', () => {
  it('should throw validation errors if form is empty', async () => {
    const dto = new LoginDto();
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should throw validation errors if email is invalid', async () => {
    const dto = new LoginDto();
    dto.email = 'not-an-email';
    dto.password = 'somepassword';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });

  it('should pass validation with 0 errors for valid input', async () => {
    const dto = new LoginDto();
    dto.email = 'test@example.com';
    dto.password = 'supersecurepassword';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
