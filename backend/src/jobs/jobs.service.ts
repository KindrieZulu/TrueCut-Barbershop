import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingHoldsService } from '../modules/booking-holds/booking-holds.service';
import { BookingsService } from '../modules/bookings/bookings.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly holdsService: BookingHoldsService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleHoldCleanupWorker() {
    try {
      await this.holdsService.releaseExpiredHolds();
    } catch (e) {
      this.logger.error('Error running expired hold cleanup worker', e);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleNoShowDetectorWorker() {
    try {
      const count = await this.bookingsService.processNoShows();
      if (count > 0) {
        this.logger.log(`[JOB AUTO NO-SHOW] Processed ${count} no-show bookings`);
      }
    } catch (e) {
      this.logger.error('Error running auto no-show worker', e);
    }
  }
}
