# Phase 2 — PostgreSQL Schema and Migrations

## Schema principles

- Strong relational integrity with PostgreSQL
- Indexing for slot lookups and audit queries
- Separate operational tables from ledger tables
- Timezone-aware booking data in Africa/Harare default context
- Database-enforced uniqueness for slot reservation safety

## Migration location

The base migration is stored in:

- [backend/prisma/migrations/20260912_truecut_foundation/migration.sql](../backend/prisma/migrations/20260912_truecut_foundation/migration.sql)

## Core entities

- users
- branches
- branch_staff
- services
- barber_services
- barber_schedules
- barber_block_outs
- booking_holds
- bookings
- recurring_booking_groups
- payments
- payment_ledgers
- notification_logs
- audit_logs
- system_settings
- otp_codes
- daily_reports
- booking_slots
- loyalty_statuses
- leave_requests
- customer_profiles
- branch_settings

## Locking strategy

- Appointment slot locking uses unique constraints plus transactional updates.
- Booking hold expiry uses a background worker to purge stale reservations.
- Payment confirmation is idempotent and ledger-safe.
