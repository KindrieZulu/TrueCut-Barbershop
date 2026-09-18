import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { BookingHoldsModule } from '../modules/booking-holds/booking-holds.module';
import { BookingsModule } from '../modules/bookings/bookings.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { NotificationProcessor } from './notification.processor';

@Module({
  imports: [BookingHoldsModule, BookingsModule, NotificationsModule],
  providers: [JobsService, NotificationProcessor],
  exports: [JobsService],
})
export class JobsModule {}
