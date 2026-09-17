import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { BookingHoldsService } from '../booking-holds/booking-holds.service';
import { BookingsService } from '../bookings/bookings.service';
import { PaymentsService } from '../payments/payments.service';
import { SystemSettingsService } from '../config/system-settings.service';
import { BookingType, UserRole } from '@prisma/client';
import { WalkInRegisterDto } from './dto/walk-in-register.dto';

@Injectable()
export class ReceptionistService {
  private readonly logger = new Logger(ReceptionistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly holdsService: BookingHoldsService,
    private readonly bookingsService: BookingsService,
    private readonly paymentsService: PaymentsService,
    private readonly settingsService: SystemSettingsService,
  ) {}

  /**
   * Registers walk-in client, creates booking hold, confirms booking & handles payment
   */
  async processWalkInBooking(receptionistId: string, dto: WalkInRegisterDto) {
    // 1. Ensure Client exists or register automatically
    let client = await this.prisma.user.findUnique({ where: { phone: dto.clientPhone } });
    if (!client) {
      const regResult = await this.authService.register(
        dto.clientName,
        dto.clientPhone,
        dto.clientEmail,
        undefined,
        UserRole.CLIENT,
      );
      client = regResult.user as any;
    }

    // 2. Create hold using unified scheduling hold engine (supports squeeze-in override)
    const holdResult = await this.holdsService.createHold({
      branchId: dto.branchId,
      barberId: dto.barberId,
      serviceId: dto.serviceId,
      clientId: client.id,
      startTimeStr: dto.startTimeStr,
      bookingType: BookingType.GENERAL,
      isSqueezeIn: dto.isSqueezeIn || false,
    });

    // 3. Convert hold to booking
    const booking = await this.bookingsService.createBookingFromHold(
      holdResult.hold.holdToken,
      receptionistId,
    );

    // 4. Update squeeze-in reason if applicable
    if (dto.isSqueezeIn) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { squeezeInReason: dto.squeezeInReason || 'Receptionist manual squeeze-in' },
      });
    }

    // 5. Initiate and confirm payment (Cash or EcoCash)
    const payment = await this.paymentsService.initiatePayment(
      booking.id,
      dto.clientPhone,
      dto.paymentType,
      `WALKIN-${booking.id}-${Date.now()}`,
    );

    this.logger.log(
      `[WALK-IN COMPLETED] BookingCode: ${booking.bookingCode} | Client: ${dto.clientPhone} | SqueezeIn: ${dto.isSqueezeIn}`,
    );

    return {
      booking,
      payment,
      pricing: holdResult.pricing,
    };
  }
}
