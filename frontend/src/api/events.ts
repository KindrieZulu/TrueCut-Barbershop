import { useEffect } from 'react';

export interface SystemEvent {
  type: 'HOLD_CREATED' | 'BOOKING_CONFIRMED' | 'BOOKING_SERVED' | 'BOOKING_CANCELLED' | 'SQUEEZE_IN_ADDED' | 'LEDGER_APPENDED';
  payload: any;
  timestamp: string;
}

export function useRealtimeEvents(onEvent: (event: SystemEvent) => void) {
  useEffect(() => {
    const streamUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/events/stream`
      : '/api/v1/events/stream';

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data) as SystemEvent;
        onEvent(parsed);
      } catch (err) {
        console.error('Error parsing SSE event', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('Realtime SSE stream disconnected, reconnecting...');
    };

    return () => {
      eventSource.close();
    };
  }, [onEvent]);
}
