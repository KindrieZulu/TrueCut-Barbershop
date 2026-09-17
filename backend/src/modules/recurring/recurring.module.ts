import { Module } from '@nestjs/common';
import { RecurringService } from './recurring.service';
import { RecurringController } from './recurring.controller';
import { BookingHoldsModule } from '../booking-holds/booking-holds.module';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [BookingHoldsModule, BookingsModule],
  providers: [RecurringService],
  controllers: [RecurringController],
  exports: [RecurringService],
})
export class RecurringModule {}
