import { Controller, Get, Sse, MessageEvent } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Sse('stream')
  streamEvents(): Observable<MessageEvent> {
    return this.eventsService.getEventStream().pipe(
      map((evt) => ({
        data: evt,
      }) as MessageEvent),
    );
  }
}
