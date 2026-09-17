# Security Assessment

Date: 2026-09-16

## Scope and method

- Static review of authentication, rate limiting, CORS, Docker Compose, and container startup.
- Dependency audit for backend and frontend production dependencies.
- Backend unit/security regression suite.
- Frontend component test suite and production build.
- Compose configuration validation with injected CI-only secrets.

This was a repository-level assessment. It was not an authenticated external penetration test against a deployed environment.

## Findings addressed

| Severity | Finding | Status |
| --- | --- | --- |
| Critical | Docker Compose contained hard-coded database and JWT secrets. | Fixed; values are required from the environment. Rotate any previously exposed credentials. |
| High | JWT validation fell back to a predictable compiled-in secret. | Fixed; production startup now requires `JWT_SECRET`. |
| High | OTP codes used `Math.random()` and were written to application logs. | Fixed; OTPs use `crypto.randomInt()` and are not logged. |
| Medium | Rate limiting trusted the client-controlled `X-Forwarded-For` header. | Fixed; the limiter uses the framework-resolved request IP. Configure a trusted proxy explicitly in production. |
| Critical | `bcrypt` 5.x pulled a vulnerable `node-tar` dependency. | Fixed by upgrading to `bcrypt` 6.x; backend critical audit gate passes. |

## Residual risks

- The backend still has high and moderate advisories in the NestJS 10 dependency tree. The available fixes require a coordinated NestJS major-version upgrade and should be handled as a separate compatibility change.
- ~~Authentication endpoints use inline request objects rather than DTO classes...~~ Resolved 2026-09-17: all five auth endpoints now bind to validated DTO classes (`backend/src/modules/auth/dto/`), verified with tests that replay the pre-fix behavior alongside the new rejections (`backend/src/test/auth-dto-validation.spec.ts`).
- ~~Cookie-based authentication should be paired with a CSRF defense...~~ Resolved 2026-09-17: double-submit-cookie CSRF middleware (`backend/src/common/csrf.middleware.ts`), verified against a live server running with `sameSite=none` (`backend/src/test/csrf.middleware.spec.ts`).
- `docker-compose.yml` is a local/demo stack. Production must use managed secrets, private database/Redis networking, TLS termination, and rotated credentials.
- No external network penetration test was possible without a deployed target and authorization scope.

## Process recommendation

Every fixed finding above except the `bcrypt` upgrade was found in a "Phase 6: hardening" pass that happened after the architecture, schema, and backend modules were already built (see `docs/phase-6-hardening-tests.md`). That ordering is itself a finding: security review arriving as a final pass, rather than continuously, is exactly the process that let a hard-coded secret, a predictable JWT fallback, an unvalidated auth endpoint, and a missing CSRF defense all ship in the same codebase at once.

Going forward, security-relevant changes (auth, payments, anything touching cookies/tokens/secrets, new dependencies) should be reviewed at the time they're made, not deferred to a later audit. This is enforced structurally, not just documented: see `.github/pull_request_template.md`, which requires every PR to state its security considerations before merge.

## CI/CD controls added

The GitHub Actions workflow now includes:

- Read-only workflow permissions and cancel-in-progress concurrency.
- Backend/frontend tests and production builds.
- Critical production dependency audit gates.
- Gitleaks repository secret scanning.
- Docker Compose configuration validation with injected CI variables.
- Backend and frontend image builds plus Trivy HIGH/CRITICAL scanning.

The workflow intentionally stops short of deployment because no registry, hosting provider, or production environment was configured. Configure those three targets before adding a protected deployment job.