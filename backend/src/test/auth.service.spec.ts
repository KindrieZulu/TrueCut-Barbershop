import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../modules/auth/auth.service';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SmsAdapter } from '../modules/notifications/adapters/sms.adapter';
import { BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('AuthService Unit Tests', () => {
  let authService: AuthService;
  let prismaMock: any;
  let jwtMock: any;
  let configMock: any;
  let smsMock: any;

  beforeEach(async () => {
    prismaMock = {
      otpCode: {
        count: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtMock = {
      sign: jest.fn().mockReturnValue('mocked_jwt_token'),
    };

    configMock = {
      get: jest.fn((key: string, defaultValue?: string) => defaultValue),
    };

    smsMock = {
      sendSms: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
        { provide: SmsAdapter, useValue: smsMock },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('requestOtp', () => {
    it('should throw BadRequestException if phone is missing', async () => {
      await expect(authService.requestOtp('')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if recent OTPs count >= 5', async () => {
      prismaMock.otpCode.count.mockResolvedValue(5);
      await expect(authService.requestOtp('+263771234567')).rejects.toThrow(BadRequestException);
    });

    it('should generate OTP and dispatch SMS successfully when rate limit not reached', async () => {
      prismaMock.otpCode.count.mockResolvedValue(2);
      prismaMock.otpCode.create.mockResolvedValue({ id: 'otp1' });

      const res = await authService.requestOtp('+263771234567');
      expect(res.message).toBe('OTP sent successfully');
      expect(res.phone).toBe('+263771234567');
      expect(prismaMock.otpCode.create).toHaveBeenCalled();
      expect(smsMock.sendSms).toHaveBeenCalled();
    });

    it('should report SMS provider failures and remove the undeliverable OTP', async () => {
      prismaMock.otpCode.count.mockResolvedValue(0);
      prismaMock.otpCode.create.mockResolvedValue({ id: 'otp1' });
      smsMock.sendSms.mockResolvedValue({ success: false, error: 'Provider rejected recipient' });

      await expect(authService.requestOtp('0771234567')).rejects.toThrow('Provider rejected recipient');
      expect(prismaMock.otpCode.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ phone: '+263771234567' }),
      }));
      expect(prismaMock.otpCode.delete).toHaveBeenCalledWith({ where: { id: 'otp1' } });
    });
  });

  describe('verifyOtp', () => {
    it('should throw BadRequestException for invalid OTP', async () => {
      prismaMock.otpCode.findFirst.mockResolvedValue(null);
      await expect(authService.verifyOtp('+263771234567', '000000')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP is expired', async () => {
      prismaMock.otpCode.findFirst.mockResolvedValue({
        id: 'otp1',
        expiresAt: new Date(Date.now() - 10000), // expired
      });
      await expect(authService.verifyOtp('+263771234567', '123456')).rejects.toThrow(BadRequestException);
    });

    it('should mark OTP verified and return success if valid', async () => {
      prismaMock.otpCode.findFirst.mockResolvedValue({
        id: 'otp1',
        expiresAt: new Date(Date.now() + 60000),
      });
      prismaMock.otpCode.update.mockResolvedValue({ id: 'otp1', isVerified: true });

      const res = await authService.verifyOtp('+263771234567', '123456');
      expect(res.verified).toBe(true);
      expect(prismaMock.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'otp1' },
        data: { isVerified: true },
      });
    });
  });

  describe('register', () => {
    it('should throw ConflictException if user phone already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });
      await expect(authService.register('John Doe', '+263771234567')).rejects.toThrow(ConflictException);
    });

    it('should create user and return tokens on successful registration', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'u1',
        name: 'John Doe',
        phone: '+263771234567',
        email: 'john@example.com',
        role: UserRole.CLIENT,
      });
      prismaMock.user.update.mockResolvedValue({});

      const res = await authService.register('John Doe', '+263771234567', 'john@example.com');
      expect(res.user.name).toBe('John Doe');
      expect(res.accessToken).toBe('mocked_jwt_token');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found or deactivated', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(authService.login('+263771234567')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if invalid password provided', async () => {
      const hashedPass = await bcrypt.hash('correct_password', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        phone: '+263771234567',
        isActive: true,
        passwordHash: hashedPass,
        role: UserRole.CLIENT,
        staffBranches: [],
      });

      await expect(authService.login('+263771234567', 'wrong_password')).rejects.toThrow(UnauthorizedException);
    });

    it('should authenticate user and return tokens on correct credentials', async () => {
      const hashedPass = await bcrypt.hash('secret123', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Jane Doe',
        phone: '+263771234567',
        email: 'jane@example.com',
        isActive: true,
        passwordHash: hashedPass,
        role: UserRole.BARBER,
        staffBranches: [{ branchId: 'b1' }],
      });
      prismaMock.user.update.mockResolvedValue({});

      const res = await authService.login('+263771234567', 'secret123');
      expect(res.user.name).toBe('Jane Doe');
      expect(res.user.role).toBe(UserRole.BARBER);
      expect(res.user.branchIds).toContain('b1');
    });
  });
});
