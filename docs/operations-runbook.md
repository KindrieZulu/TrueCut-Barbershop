# TrueCut Operations Runbook

## Daily checks

1. Confirm database and Redis services are healthy.
2. Review failed notification queue counts.
3. Review payment webhook reconciliation.
4. Verify daily financial report generation.
5. Inspect no-show or cancellation trends.

## Incident playbook

### Payment failures

- verify provider reference and idempotency key
- inspect webhook logs and reconcile ledger totals
- if necessary re-poll provider status

### Booking conflicts

- confirm DB uniqueness constraints hold
- release expired holds
- review scheduler behavior for gap logic

### High alert conditions

- Sentry spike above baseline
- Redis queue backlog rises unbounded
- failed payment ratio exceeds threshold
- repeated OTP abuse attempts detected

## Recovery actions

- restart application containers without data loss
- clean stale Redis queue entries after verifying source system state
- restore backups into staging before production replay
- notify branch managers if service disruption impacts customer bookings
