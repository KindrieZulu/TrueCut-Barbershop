import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface SystemRealtimeEvent {
  type: 'HOLD_CREATED' | 'BOOKING_CONFIRMED' | 'BOOKING_SERVED' | 'BOOKING_CANCELLED' | 'SQUEEZE_IN_ADDED' | 'LEDGER_APPENDED';
  payload: any;
  timestamp: string;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly eventSubject = new Subject<SystemRealtimeEvent>();

  emit(type: SystemRealtimeEvent['type'], payload: any) {
    const event: SystemRealtimeEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`[REALTIME EVENT EMITTED] ${type}`);
    this.eventSubject.next(event);
  }

  getEventStream(): Observable<SystemRealtimeEvent> {
    return this.eventSubject.asObservable();
  }
}
