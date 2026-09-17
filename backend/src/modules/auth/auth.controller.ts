import { Controller, Post, Body, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerifyOtpLoginDto } from './dto/verify-otp-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.phone);
  }

  @Post('otp/verify')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.code);
  }

  @Post('otp/verify-login')
  async verifyOtpAndLogin(
    @Res({ passthrough: true }) response: Response,
    @Body() dto: VerifyOtpLoginDto,
  ) {
    const result = await this.authService.verifyOtpAndLogin(dto.phone, dto.code, dto.name);
    this.setAuthCookies(response, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async register(@Req() req: any, @Body() dto: RegisterDto) {
    const requestingUserRole = req.user?.role;
    const result = await this.authService.register(
      dto.name,
      dto.phone,
      dto.email,
      dto.password,
      dto.role,
      requestingUserRole,
    );
    return { user: result.user };
  }

  @Post('login')
  async login(@Res({ passthrough: true }) response: Response, @Body() dto: LoginDto) {
    const result = await this.authService.login(dto.phone, dto.password);
    this.setAuthCookies(response, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('refresh')
  async refresh(@Req() request: any, @Res({ passthrough: true }) response: Response) {
    const refreshToken = this.readCookie(request, 'truecut_refresh');
    const result = await this.authService.refreshSession(refreshToken);
    this.setAuthCookies(response, result.accessToken, result.refreshToken);
    return { refreshed: true };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    this.clearAuthCookies(response);
    return { loggedOut: true };
  }

  private setAuthCookies(response: Response, accessToken: string, refreshToken: string) {
    const secure = process.env.NODE_ENV === 'production';
    const sameSite = secure ? 'none' : 'lax';
    response.cookie('truecut_access', accessToken, {
      httpOnly: true,
      secure,
      sameSite,
      maxAge: 60 * 60 * 1000,
      path: '/api/v1',
    });
    response.cookie('truecut_refresh', refreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });
  }

  private clearAuthCookies(response: Response) {
    response.clearCookie('truecut_access', { path: '/api/v1' });
    response.clearCookie('truecut_refresh', { path: '/api/v1/auth' });
  }

  private readCookie(request: any, name: string) {
    const header = request.headers?.cookie || '';
    const value = header.split(';').find((part: string) => part.trim().startsWith(`${name}=`));
    return value ? decodeURIComponent(value.trim().slice(name.length + 1)) : '';
  }
}
