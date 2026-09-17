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
- Authentication endpoints use inline request objects rather than DTO classes, so their body fields do not receive the full `ValidationPipe` shape validation. Add DTOs before exposing the API broadly.
- Cookie-based authentication should be paired with a CSRF defense for state-changing requests when deployed cross-site.
- `docker-compose.yml` is a local/demo stack. Production must use managed secrets, private database/Redis networking, TLS termination, and rotated credentials.
- No external network penetration test was possible without a deployed target and authorization scope.

## CI/CD controls added

The GitHub Actions workflow now includes:

- Read-only workflow permissions and cancel-in-progress concurrency.
- Backend/frontend tests and production builds.
- Critical production dependency audit gates.
- Gitleaks repository secret scanning.
- Docker Compose configuration validation with injected CI variables.
- Backend and frontend image builds plus Trivy HIGH/CRITICAL scanning.

The workflow intentionally stops short of deployment because no registry, hosting provider, or production environment was configured. Configure those three targets before adding a protected deployment job.