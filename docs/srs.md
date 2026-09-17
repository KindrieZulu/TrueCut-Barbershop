# Software Requirements Specification (short form)

This is a condensed SRS filling the gap noted in the system analysis: the
existing docs (system-architecture.md, database-erd.md, phase-*.md) describe
*how* the system is built, but nowhere lists actors, use cases, and concrete
non-functional targets in one place. Everything below is grounded in the
actual controllers, guards, and system-setting defaults in backend/src - not
aspirational feature lists.

## 1. Purpose and scope

TrueCut is a multi-branch barbershop booking and operations platform:
online/walk-in bookings with race-condition-safe slot reservation, Paynow/
EcoCash and cash payments with append-only ledger accounting, loyalty-aware
scheduling, SMS notifications, and branch/company reporting. This SRS covers
the backend API surface as implemented; it does not cover unbuilt features.

## 2. Actors

| Actor | Maps to | Primary surface |
| --- | --- | --- |
| Client | `UserRole.CLIENT` | Public catalogue, booking wizard, client dashboard |
| Barber | `UserRole.BARBER` | Barber dashboard (own schedule, appointments, block-outs) |
| Receptionist | `UserRole.RECEPTIONIST` | Receptionist portal (walk-ins, today's bookings, payment confirmation) |
| Company Admin | `UserRole.COMPANY_ADMIN` | Company admin dashboard (branches, services, staff, reports, ledger) |
| System Admin | `UserRole.SYSTEM_ADMIN` | System admin dashboard (superset of Company Admin, cross-branch) |
| Payment provider | external (Paynow/EcoCash) | Webhook callback (`POST /payments/webhook`) |

## 3. Use cases by actor

### Client (unauthenticated or `CLIENT` role)
- Request an OTP and log in / self-register by phone (`/auth/otp/*`)
- Browse branches and the public service catalogue (`GET /branches`, `GET /services`)
- View a barber's available slots for a service and date (`GET /scheduling`)
- Hold a slot, then convert the hold into a booking (`POST /booking-holds`, `POST /bookings/from-hold`)
- Pay for a booking via Paynow/EcoCash or view payment status (`POST /payments/initiate`)
- View own bookings, cancel or reschedule a booking (`GET /bookings/client`, `POST /bookings/:id/cancel`, `POST /bookings/:id/reschedule`)
- Set up a recurring booking series (`POST /recurring`)

### Barber (`BARBER`)
- View own schedule and upcoming appointments (`GET /barbers/me/appointments`)
- Add a block-out period (leave, break) (`POST /barbers/:id/block-out`)
- Mark a booking as served once the haircut is complete (`POST /bookings/:id/serve`)

### Receptionist (`RECEPTIONIST`)
- Search for an existing client by phone/name (`GET /users/search`)
- Register a walk-in client and book on their behalf (`POST /reception/walk-in`)
- View a branch's bookings for today (`GET /bookings/branch/today`)
- Confirm a cash or provider payment for a booking (`POST /payments/:id/confirm`)
- Serve/complete bookings, same as Barber
- View the branch's daily financial report (`GET /reports/daily/financial`)

### Company Admin (`COMPANY_ADMIN`)
- Manage branches (create/update) (`POST /branches`, `PATCH /branches/:id`)
- Manage the service catalogue and pricing (`POST /services`, `PATCH /services/:id`)
- Manage system settings that drive fees/buffers/thresholds (`PATCH /system-settings/:key`)
- View the payment ledger and export it to CSV (`GET /ledger`, `GET /ledger/export/csv`)
- View the audit log and daily system report (`GET /audit`, `GET /reports/daily/system`)
- View notification delivery log (`GET /notifications`)

### System Admin (`SYSTEM_ADMIN`)
- Superset of Company Admin across all branches, plus creating other System Admin accounts (`AuthService.register` role-escalation checks)

### Payment provider (external)
- Deliver an HMAC-signed webhook on payment success/failure (`POST /payments/webhook`), verified via `PaynowEcoCashAdapter.verifyWebhookSignature`

## 4. Non-functional requirements (concrete targets)

Values marked *(implemented)* are enforced today and verifiable by reading
the cited source; values marked *(target)* are proposed thresholds this repo
does not yet measure or enforce, and should be treated as goals for load
testing and monitoring once a deployment exists - not as claims.

| Category | Requirement | Status |
| --- | --- | --- |
| Auth token lifetime | Access token 1h, refresh token 7d | *(implemented)* `auth.service.ts: generateTokens` |
| OTP security | 6-digit code, 5-minute validity, max 5 requests per phone per 15 minutes | *(implemented)* `auth.service.ts: requestOtp` |
| API rate limiting | 120 requests/minute per IP by default (configurable via `RateLimitOptions`) | *(implemented)* `rate-limit.middleware.ts` |
| Booking hold expiry | 10 minutes by default (`booking_hold_minutes` setting) | *(implemented)* `booking-holds.service.ts` |
| Scheduling buffer | 15 min standard buffer between appointments; +15 min for house calls | *(implemented)* `scheduling.service.ts` |
| Cancellation policy | Full refund minus $3 penalty if cancelled <120 min before appointment | *(implemented)* `bookings.service.ts: cancelBooking` |
| No-show detection | Booking marked NO_SHOW 15 min past start time (background job) | *(implemented)* `bookings.service.ts: processNoShows` |
| Double-booking prevention | DB-enforced unique constraint on (barberId, startTime) inside a transaction | *(implemented, regression-tested)* `test/booking-race.e2e-spec.ts` |
| Availability | 99.5% monthly uptime | *(target)* - no HA database or multi-instance deployment exists yet; single Postgres instance is a single point of failure |
| API latency | p95 < 300ms for read endpoints, p95 < 800ms for the payment-confirm transaction | *(target)* - not yet load tested |
| Throughput | Sustain 50 concurrent booking-hold attempts/sec across all branches without hold-creation errors | *(target)* - capacity sized against the README's 100-branch goal, not yet load tested |
| Backup / RPO | Nightly Postgres backup, RPO <= 24h at MVP stage | *(target)* - no backup job exists in this repo yet |
| Recovery / RTO | RTO <= 4h at MVP stage (manual restore) | *(target)* |
| Audit retention | Audit log entries retained indefinitely, append-only | *(implemented)* `AuditLog` has no delete path in the codebase |
| Security dependency gate | CI fails on any CRITICAL-severity dependency or container CVE | *(implemented)* `.github/workflows/ci.yml` |

## 5. Explicitly out of scope for this SRS

- Frontend UX flows in detail (covered by the page inventory in `docs/phase-4-frontend.md`)
- Infrastructure sizing for a deployed environment (no registry/host is configured yet, per `docs/security-assessment.md`)
- Formal load-testing results (the *(target)* rows above are goals to validate, not measurements)
