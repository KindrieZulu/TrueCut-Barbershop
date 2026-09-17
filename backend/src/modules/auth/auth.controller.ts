import { Controller, Post, Body, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  async requestOtp(@Body() body: { phone: string }) {
    return this.authService.requestOtp(body.phone);
  }

  @Post('otp/verify')
  async verifyOtp(@Body() body: { phone: string; code: string }) {
    return this.authService.verifyOtp(body.phone, body.code);
  }

  @Post('otp/verify-login')
  async verifyOtpAndLogin(
    @Res({ passthrough: true }) response: Response,
    @Body() body: { phone: string; code: string; name?: string },
  ) {
    const result = await this.authService.verifyOtpAndLogin(body.phone, body.code, body.name);
    this.setAuthCookies(response, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async register(
    @Req() req: any,
    @Body('name') name: string,
    @Body('phone') phone: string,
    @Body('email') email?: string,
    @Body('password') password?: string,
    @Body('role') role?: UserRole,
  ) {
    const requestingUserRole = req.user?.role;
    const result = await this.authService.register(name, phone, email, password, role, requestingUserRole);
    return { user: result.user };
  }

  @Post('login')
  async login(
    @Req() request: any,
    @Res({ passthrough: true }) response: Response,
    @Body() body: { phone: string; password?: string },
  ) {
    const payload = this.getPayload(request, body);
    const result = await this.authService.login(payload.phone, payload.password);
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

  private getPayload(request: any, body: any) {
    if (body?.phone) return body;
    if (request.body?.phone) return request.body;

    try {
      return JSON.parse(request.rawBody?.toString('utf8') || '{}');
    } catch {
      return {};
    }
  }
}
