import { Controller, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // Broadcasts booking/payment activity (barberId, totalAmount, bookingCode)
  // across the whole system, not scoped to the requesting user - restricted
  // to staff roles that legitimately need a live operational feed, not any
  // authenticated user (a CLIENT has no need to see other clients' activity).
  @Sse('stream')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER, UserRole.RECEPTIONIST, UserRole.COMPANY_ADMIN, UserRole.SYSTEM_ADMIN)
  streamEvents(): Observable<MessageEvent> {
    return this.eventsService.getEventStream().pipe(
      map((evt) => ({
        data: evt,
      }) as MessageEvent),
    );
  }
}
