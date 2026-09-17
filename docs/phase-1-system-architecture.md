# Phase 1 — System Architecture and ERD

## Architecture decisions

The platform uses a modular monolith for the first production release. This reduces deployment, observability, and operational complexity while keeping domain separation clear enough for future scale.

## System view

```mermaid
flowchart TB
    subgraph Users
        Client[Client Portal]
        Recp[Receptionist Portal]
        Barber[Barber Dashboard]
        Admin[Admin Console]
    end

    subgraph Layer
        FE[React + Vite + PWA]
        API[NestJS API]
        Domain[Booking / Scheduling / Payment / Reporting / Loyalty / Audit]
        Data[(PostgreSQL)]
        Queue[(Redis + BullMQ)]
        Ext[Paynow / EcoCash / SMS / Cloud Storage]
    end

    Client --> FE
    Recp --> FE
    Barber --> FE
    Admin --> FE
    FE --> API
    API --> Domain
    Domain --> Data
    Domain --> Queue
    Domain --> Ext
```

## Domain responsibility split

- Authentication: JWT, refresh flow, OTP verification, RBAC
- Booking engine: holds, slots, queue jumps, cancellation policy, recurrent bookings
- Payments: idempotency, ledger, verification, refund workflow
- Loyalty: regular customer rules, points, tiers, priority scheduling
- Reporting: branch and company financial and operational analytics
- Audit: security and business event history
- Offline receptionist: local cache and sync queue

## ERD summary

The data model centers on users, branches, services, bookings, payments, and audit records. Appointment data is isolated from ledger truth to support consistent financial reconciliation.
