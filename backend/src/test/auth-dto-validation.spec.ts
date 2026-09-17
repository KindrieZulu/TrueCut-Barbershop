import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { RequestOtpDto } from '../modules/auth/dto/request-otp.dto';
import { VerifyOtpDto } from '../modules/auth/dto/verify-otp.dto';
import { RegisterDto } from '../modules/auth/dto/register.dto';
import { LoginDto } from '../modules/auth/dto/login.dto';

// Exercises the exact ValidationPipe configuration wired globally in main.ts
// (whitelist + transform + forbidNonWhitelisted) against the auth DTOs added
// to close the gap docs/security-assessment.md flagged: auth endpoints used
// to take plain object-literal types, which Nest's ValidationPipe silently
// skips validating (its metatype is Object, not a class it can inspect).
describe('Auth DTO validation (matches the global ValidationPipe config in main.ts)', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
  const runThrough = (metatype: any, value: any) => pipe.transform(value, { type: 'body', metatype, data: '' });

  it('demonstrates the pre-fix gap: a plain Object metatype validates nothing', async () => {
    // This is what every auth endpoint used before the DTOs existed - the pipe
    // has no class to inspect, so it lets the payload through unexamined.
    const result = await runThrough(Object, { anything: 'goes', role: 'SYSTEM_ADMIN' });
    expect(result).toEqual({ anything: 'goes', role: 'SYSTEM_ADMIN' });
  });

  it('rejects an otp/request body with no phone', async () => {
    await expect(runThrough(RequestOtpDto, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an otp/request body carrying unexpected extra fields', async () => {
    await expect(runThrough(RequestOtpDto, { phone: '0771234567', role: 'SYSTEM_ADMIN' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts a well-formed otp/request body', async () => {
    const result = await runThrough(RequestOtpDto, { phone: '0771234567' });
    expect(result).toBeInstanceOf(RequestOtpDto);
    expect(result.phone).toBe('0771234567');
  });

  it('rejects a non-6-digit otp code', async () => {
    await expect(runThrough(VerifyOtpDto, { phone: '0771234567', code: '12' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a register payload carrying an unrecognised field', async () => {
    await expect(
      runThrough(RegisterDto, { name: 'A', phone: '0771234567', isAdmin: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a register password shorter than the minimum', async () => {
    await expect(
      runThrough(RegisterDto, { name: 'A', phone: '0771234567', password: 'short' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a register role outside the UserRole enum', async () => {
    await expect(
      runThrough(RegisterDto, { name: 'A', phone: '0771234567', role: 'SUPERUSER' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a well-formed register payload', async () => {
    const result = await runThrough(RegisterDto, { name: 'A', phone: '0771234567', password: 'longenough1' });
    expect(result).toBeInstanceOf(RegisterDto);
  });

  it('accepts login with only a phone (OTP-based accounts have no password)', async () => {
    const result = await runThrough(LoginDto, { phone: '0771234567' });
    expect(result).toBeInstanceOf(LoginDto);
  });

  it('rejects a login body missing phone entirely', async () => {
    await expect(runThrough(LoginDto, { password: 'whatever' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
