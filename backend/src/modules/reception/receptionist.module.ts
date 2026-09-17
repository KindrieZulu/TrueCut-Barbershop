import { Module } from '@nestjs/common';
import { ReceptionistService } from './receptionist.service';
import { ReceptionistController } from './receptionist.controller';
import { AuthModule } from '../auth/auth.module';
import { BookingHoldsModule } from '../booking-holds/booking-holds.module';
import { BookingsModule } from '../bookings/bookings.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [AuthModule, BookingHoldsModule, BookingsModule, PaymentsModule],
  providers: [ReceptionistService],
  controllers: [ReceptionistController],
  exports: [ReceptionistService],
})
export class ReceptionistModule {}
