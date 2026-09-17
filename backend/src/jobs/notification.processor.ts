import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Worker, Queue, JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from '../database/prisma.service';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

@Injectable()
export class NotificationProcessor implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationProcessor.name);
  private connection: Redis;
  private queue: Queue;
  private worker: Worker;

  constructor(private readonly prisma: PrismaService) {
    this.connection = new Redis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null });
    this.queue = new Queue('notifications', { connection: this.connection });

    this.worker = new Worker(
      'notifications',
      async (job) => {
        const { notificationId } = job.data as { notificationId: string };
        try {
          const notification = await this.prisma.notificationLog.findUnique({ where: { id: notificationId } });
          if (!notification) {
            this.logger.warn(`Notification ${notificationId} not found`);
            return;
          }

          await this.prisma.notificationLog.update({ where: { id: notificationId }, data: { status: 'SENT', sentAt: new Date() } });
          this.logger.log(`Processed notification ${notificationId} -> SENT`);
        } catch (err) {
          this.logger.error(`Error processing notification ${notificationId}`, err as any);
          throw err;
        }
      },
      { connection: this.connection, concurrency: 5 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Notification job ${job?.id} failed: ${err.message}`);
    });
  }

  async enqueueNotification(notificationId: string, opts?: JobsOptions) {
    await this.queue.add('send', { notificationId }, { attempts: 5, backoff: { type: 'exponential', delay: 1000 }, ...(opts || {}) });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }
}
