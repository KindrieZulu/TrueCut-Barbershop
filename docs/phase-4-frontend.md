# Phase 4 — React Frontend

## Frontend architecture

The frontend is implemented with React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, and a PWA layer for offline-ready receptionist flows.

## Major screens

- Welcome page
- Public catalogue
- Booking wizard
- Client dashboard
- Receptionist portal
- Barber dashboard
- Company admin dashboard
- System admin dashboard

## Offline UX strategy

- local storage for cached data
- IndexedDB for queued actions
- graceful offline/online state transitions
- retries for queue sync when connection returns

## Production readiness

The app keeps a clean router structure and API client boundaries, making it easier to gradually move from mock/in-memory flows to live backend data and permission-aware dashboard views.
