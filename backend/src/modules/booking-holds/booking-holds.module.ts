import { Module } from '@nestjs/common';
import { BookingHoldsService } from './booking-holds.service';
import { BookingHoldsController } from './booking-holds.controller';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [SchedulingModule],
  providers: [BookingHoldsService],
  controllers: [BookingHoldsController],
  exports: [BookingHoldsService],
})
export class BookingHoldsModule {}
