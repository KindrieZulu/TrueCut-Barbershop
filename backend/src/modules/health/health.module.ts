import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../../database/prisma.service';
import Redis from 'ioredis';

@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    PrismaService,
    {
      provide: Redis,
      useFactory: () => new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
        maxRetriesPerRequest: null,
      }),
    },
  ],
})
export class HealthModule {}
