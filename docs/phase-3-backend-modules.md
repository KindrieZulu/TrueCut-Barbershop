# Phase 3 — NestJS Backend Module-by-Module

## Existing module set

The application already includes the essential backend boundaries for a modular monolith:

- Auth
- Users
- Branches
- Services
- Barbers
- Scheduling
- Booking holds
- Bookings
- Payments
- Ledger
- Reception
- Recurring bookings
- Notifications
- Reports
- Audit
- Health
- Events
- Jobs
- Config

## API design principles

- REST-first endpoints with version prefixing
- DTO validation on entry points
- service-layer business logic isolated from controllers
- shared Prisma access through a single database service
- queue-backed side effects for notification and scheduled work

## Module roadmap

1. Authentication layer for JWT and OTP flows
2. User and branch management
3. Barber schedules and service catalog
4. Bookings and hold lifecycle
5. Payments and ledger reconciliation
6. Notifications, reports, and audit output
7. Health checks and monitoring endpoints

## Production patterns in the codebase

- correlation IDs middleware
- throttling guard
- validation pipes
- Sentry integration stubs
- structured logging
- queue worker integration for notifications
