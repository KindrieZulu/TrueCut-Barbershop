import { Controller, Post, Body, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerifyOtpLoginDto } from './dto/verify-otp-login.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { parseCookies } from '../../common/cookies';
import { CSRF_COOKIE_NAME } from '../../common/csrf.middleware';

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
    const refreshToken = parseCookies(request.headers?.cookie)['truecut_refresh'] || '';
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
    // Deliberately NOT httpOnly: the frontend reads this and echoes it back as
    // the X-CSRF-Token header (see CsrfMiddleware). Scoped to '/' so it is
    // both readable from any page and sent alongside every API request.
    response.cookie(CSRF_COOKIE_NAME, randomBytes(32).toString('hex'), {
      httpOnly: false,
      secure,
      sameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  private clearAuthCookies(response: Response) {
    response.clearCookie('truecut_access', { path: '/api/v1' });
    response.clearCookie('truecut_refresh', { path: '/api/v1/auth' });
    response.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
  }
}
