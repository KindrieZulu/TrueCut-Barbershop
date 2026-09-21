import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { addMinutes, isAfter } from 'date-fns';

import { SmsAdapter } from '../notifications/adapters/sms.adapter';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsAdapter: SmsAdapter,
  ) {}

  async requestOtp(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      throw new BadRequestException('Phone number is required');
    }

    // Rate-limiting check: max 5 OTPs per phone within 15 minutes
    const recentOtpsCount = await this.prisma.otpCode.count({
      where: {
        phone: normalizedPhone,
        createdAt: { gte: addMinutes(new Date(), -15) },
      },
    });

    if (recentOtpsCount >= 5) {
      throw new BadRequestException('Too many OTP requests. Please wait 15 minutes before retrying.');
    }

    // Generate random 6-digit OTP code (or default static 123456 for testing/development if configured)
    const code = process.env.NODE_ENV === 'test' ? '123456' : randomInt(100000, 1000000).toString();
    const expiresAt = addMinutes(new Date(), 5); // 5 minute validity

    const otpRecord = await this.prisma.otpCode.create({
      data: {
        phone: normalizedPhone,
        code,
        expiresAt,
      },
    });

    // Dispatch real-time SMS via SMS Gateway
    const smsResult = await this.smsAdapter.sendSms(
      normalizedPhone,
      `TrueCut Barbershop OTP code: ${code}. Valid for 5 minutes. Do not share this code.`,
    );

    if (!smsResult.success) {
      await this.prisma.otpCode.delete({ where: { id: otpRecord.id } });
      throw new ServiceUnavailableException(smsResult.error || 'Unable to send OTP code. Please try again.');
    }

    return {
      message: 'OTP sent successfully',
      phone: normalizedPhone,
      debugCode: process.env.NODE_ENV === 'test' ? code : undefined,
    };
  }

  async verifyOtp(phone: string, code: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phone: normalizedPhone,
        code,
        isVerified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid OTP code');
    }

    if (isAfter(new Date(), otpRecord.expiresAt)) {
      throw new BadRequestException('OTP code has expired');
    }

    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { isVerified: true },
    });

    return { verified: true, phone: normalizedPhone };
  }

  async verifyOtpAndLogin(phone: string, code: string, name?: string) {
    await this.verifyOtp(phone, code);
    const normalizedPhone = this.normalizePhone(phone);

    let user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
      include: {
        staffBranches: { select: { branchId: true } },
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: name || 'User',
          phone: normalizedPhone,
          role: UserRole.CLIENT,
        },
        include: {
          staffBranches: { select: { branchId: true } },
        },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        branchIds: user.staffBranches.map((sb) => sb.branchId),
      },
      ...tokens,
    };
  }

  async register(
    name: string,
    phone: string,
    email?: string,
    password?: string,
    role: UserRole = UserRole.CLIENT,
    requestingUserRole?: string,
  ) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      throw new BadRequestException('Phone number is required');
    }

    if (!requestingUserRole && role !== UserRole.CLIENT) {
      throw new ForbiddenException('Staff accounts can only be created by an authorized administrator');
    }

    if (role === UserRole.SYSTEM_ADMIN && requestingUserRole !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Only a System Admin can create a System Admin account');
    }

    // Registration hierarchy: System Admin creates Company Admins; Company
    // Admin creates Receptionists and Barbers; a Company Admin creating
    // another Company Admin (a peer, not a subordinate) is deliberately not
    // allowed - only System Admin sits above Company Admin.
    if (role === UserRole.COMPANY_ADMIN && requestingUserRole !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Only a System Admin can create a Company Admin account');
    }

    if (
      role !== UserRole.CLIENT &&
      requestingUserRole !== UserRole.COMPANY_ADMIN &&
      requestingUserRole !== UserRole.SYSTEM_ADMIN
    ) {
      throw new ForbiddenException('Only a Company Admin or System Admin can create staff accounts');
    }

    if (role !== UserRole.CLIENT && !password) {
      throw new BadRequestException('A password is required for staff accounts');
    }

    const existing = await this.prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (existing) {
      throw new ConflictException('A user with this phone number already exists');
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const user = await this.prisma.user.create({
      data: {
        name,
        phone: normalizedPhone,
        email,
        passwordHash,
        role,
      },
    });

    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(phone: string, password?: string) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      throw new BadRequestException('Phone number is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
      include: {
        staffBranches: { select: { branchId: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials or user account deactivated');
    }

    if (password) {
      if (!user.passwordHash) {
        throw new UnauthorizedException('Password login not set up for this user. Please use OTP.');
      }
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        throw new UnauthorizedException('Invalid phone or password');
      }
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        branchIds: user.staffBranches.map((sb) => sb.branchId),
      },
      ...tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Access denied');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async refreshSession(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh session missing');
    }

    let payload: { sub?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'super_secret_jwt_refresh_key_truecut_2025'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh session');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Invalid refresh session');
    }

    return this.refreshTokens(payload.sub, refreshToken);
  }

  private async generateTokens(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'super_secret_jwt_key_truecut_2025'),
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'super_secret_jwt_refresh_key_truecut_2025'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  private normalizePhone(phone: string | undefined) {
    const value = phone?.trim().replace(/[\s()-]/g, '');
    if (!value) return '';
    if (/^0\d{9}$/.test(value)) return `+263${value.slice(1)}`;
    if (/^263\d{9}$/.test(value)) return `+${value}`;
    return value;
  }
}
