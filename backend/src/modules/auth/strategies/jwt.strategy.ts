import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: (request) =>
        ExtractJwt.fromAuthHeaderAsBearerToken()(request) || this.readCookie(request),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  private readCookie(request: any) {
    const header = request.headers?.cookie || '';
    const value = header.split(';').find((part: string) => part.trim().startsWith('truecut_access='));
    return value ? decodeURIComponent(value.trim().slice('truecut_access='.length)) : null;
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        staffBranches: {
          select: { branchId: true, isPrimary: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is inactive or no longer exists');
    }

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      branchIds: user.staffBranches.map((sb) => sb.branchId),
    };
  }
}
