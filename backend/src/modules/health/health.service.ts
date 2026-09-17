import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import Redis from 'ioredis';

export type ServiceHealth = 'UP' | 'DOWN';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: Redis,
  ) {}

  async getHealthSnapshot() {
    const { dbStatus, redisStatus } = await this.checkDependencies();
    const status = dbStatus === 'UP' && redisStatus === 'UP' ? 'OK' : 'DEGRADED';

    return {
      status,
      services: {
        database: dbStatus,
        redis: redisStatus,
        api: 'UP',
        timezone: process.env.DEFAULT_TIMEZONE || 'Africa/Harare',
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getReadinessSnapshot() {
    const { dbStatus, redisStatus } = await this.checkDependencies();
    const ready = dbStatus === 'UP' && redisStatus === 'UP';

    return {
      status: ready ? 'READY' : 'NOT_READY',
      ready,
      checks: {
        database: dbStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getLivenessSnapshot() {
    return {
      status: 'LIVE',
      service: 'api',
      uptimeSeconds: Math.max(0, Math.round(process.uptime())),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDependencies(): Promise<{ dbStatus: ServiceHealth; redisStatus: ServiceHealth }> {
    let dbStatus: ServiceHealth = 'UP';
    let redisStatus: ServiceHealth = 'UP';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = 'DOWN';
      this.logger.warn('Database health check failed', error as Error);
    }

    try {
      await this.redis.ping();
    } catch (error) {
      redisStatus = 'DOWN';
      this.logger.warn('Redis health check failed', error as Error);
    }

    return { dbStatus, redisStatus };
  }
}
