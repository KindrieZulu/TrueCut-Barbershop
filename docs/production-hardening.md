# Production Hardening Plan

## Security controls

- JWT access tokens with short expiry and refresh token rotation
- bcrypt hashing for stored credentials and refresh tokens
- strict input validation using class-validator and DTOs
- rate limiting on auth and payment endpoints
- CORS restricted to trusted origins in production
- Helmet and secure headers enabled
- centralized audit logging for privileged actions
- encryption of PII in storage and transit, including phone numbers and address fields

## Operational controls

- PostgreSQL backups and point-in-time restore plan
- Redis persistence and queue monitoring
- structured logs with request IDs and tenant context
- Sentry for backend and frontend error capture
- health check endpoints and uptime monitors
- deployment via immutable builds and environment-based configuration

## Resilience patterns

- idempotent payment initiation
- webhook verification and polling fallback
- queue-based notifications with exponential backoff
- slot reservation expiry and release workers
- graceful database and external-service failover paths

## Checklist

- [ ] Secrets managed outside source control
- [ ] DB migration pipeline enabled in CI
- [ ] Sentry DSN and environment config added
- [ ] Redis, PostgreSQL, and app health checks validated
- [ ] Automated backup retention configured
- [ ] Penetration and dependency scanning scheduled
- [ ] Feature flags for emergency and override flows enabled
