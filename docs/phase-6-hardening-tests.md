# Phase 6 — Tests, Security Audits, and Production Hardening

## Testing strategy

- unit tests for booking, payment, auth, and schedule rules
- integration tests for DB-backed flows and payment validation
- E2E coverage for critical booking journeys
- coverage target above 80 percent for core business logic

## Security review focus

- RBAC enforcement and session management
- rate limiting and abuse prevention
- OTP handling and verification expiry
- payment webhook validation and idempotency
- PII encryption and audit logging

## Hardening checklist

- enforce HTTPS in production
- restrict CORS and trusted origins
- rotate JWT secrets via environment variables
- scan dependencies for vulnerabilities
- configure scheduled backups
- use immutable deployment artifacts
- continuously monitor Sentry and health endpoints

## Operational goals

The platform should remain deployable on minimal-cost managed infrastructure while maintaining readiness for scale to 100 branches and 100,000 customers.
