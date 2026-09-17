# Phase 5 — Docker, CI/CD, Monitoring, and Deployment

## Container strategy

The repository includes a Docker Compose stack for:

- PostgreSQL
- Redis
- backend API
- frontend app

## CI/CD

A GitHub Actions workflow runs on pushes and pull requests, covering dependency installation and build validation for backend and frontend.

## Monitoring

- Sentry for application and frontend error capture
- structured logs and correlation IDs
- health-check endpoints on the backend
- uptime monitoring and queue watchdog patterns for production

## Deployment model

- modular monolith deployable on Railway or Render
- external PostgreSQL and Redis managed services
- Cloudflare R2 for customer receipts and assets
- environment variables and secret injection via platform secret stores
