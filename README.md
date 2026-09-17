# TrueCut Barbershop Management System

This repository is the production-oriented redesign of the TrueCut booking and operations platform for a multi-branch barbershop business.

## Product scope

- Online bookings and walk-in reservations
- Branch-aware scheduling and slots
- payment flows with Paynow/EcoCash and ledger accounting
- loyalty prioritization and regular-customer logic
- booking holds and race-condition protection
- notifications via SMS and in-app channels
- offline-capable receptionist workflows
- reporting, audit, security, and monitoring

## Architecture

The system uses a modular monolith with clear domain boundaries and is designed for eventual scale to 100 branches, 1,000 staff, 100,000 customers, and millions of bookings.

## Phase roadmap

1. System architecture and ERD
2. PostgreSQL schema and migrations
3. NestJS backend by module
4. React frontend
5. Docker, CI/CD, monitoring, and deployment
6. Tests, security review, and production hardening

## Quick start

Backend:

```bash
cd backend
npm install
npm run build
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Infrastructure:

```bash
docker compose up --build
```

### Real SMS setup

Set the provider credentials before starting Docker Compose. Twilio is the default
provider in production; GatewayAPI and Africa's Talking are also supported.

```bash
SMS_PROVIDER=TWILIO
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_sender_number
```

For GatewayAPI, create a token in the GatewayAPI dashboard and configure:

```bash
SMS_PROVIDER=GATEWAYAPI
GATEWAYAPI_TOKEN=your_gatewayapi_token
GATEWAYAPI_SENDER=TrueCut
```

Place these values in a root `.env` file or export them in the shell that runs
`docker compose up --build`. Never commit real credentials. For Africa's Talking,
use `SMS_PROVIDER=AFRICASTALKING` with `AFRICASTALKING_USERNAME` and
`AFRICASTALKING_API_KEY` instead.

`SMS_PROVIDER=MOCK` is intended only for local development. In production, missing
or sample credentials cause OTP delivery to fail visibly rather than returning a
false success.

## Key docs

- [docs/srs.md](docs/srs.md)
- [docs/system-architecture.md](docs/system-architecture.md)
- [docs/database-erd.md](docs/database-erd.md)
- [docs/production-hardening.md](docs/production-hardening.md)
- [docs/operations-runbook.md](docs/operations-runbook.md)
