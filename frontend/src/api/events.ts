import { useEffect, useRef } from 'react';

export interface SystemEvent {
  type: 'HOLD_CREATED' | 'BOOKING_CONFIRMED' | 'BOOKING_SERVED' | 'BOOKING_CANCELLED' | 'SQUEEZE_IN_ADDED' | 'LEDGER_APPENDED';
  payload: any;
  timestamp: string;
}

export function useRealtimeEvents(onEvent: (event: SystemEvent) => void) {
  // Callers pass a fresh inline function on every render (these pages call
  // setState in their own fetch callbacks, so they re-render often). Storing
  // it in a ref keeps the connection alive across those re-renders instead
  // of tearing down and reconnecting the EventSource each time.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const streamUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/events/stream`
      : '/api/v1/events/stream';

    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data) as SystemEvent;
        onEventRef.current(parsed);
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
  }, []);
}
