# TrueCut Database ERD

## 1. Entity relationships

```mermaid
erDiagram
    BRANCH ||--o{ BRANCH_STAFF : has
    USER ||--o{ BRANCH_STAFF : membership
    USER ||--o{ BOOKING : client
    USER ||--o{ BOOKING : barber
    USER ||--o{ BOOKING : receptionist
    USER ||--o{ AUDIT_LOG : creates
    BRANCH ||--o{ BOOKING : contains
    SERVICE ||--o{ BOOKING : booked
    SERVICE ||--o{ BARBER_SERVICE : offered
    USER ||--o{ BARBER_SERVICE : provides
    BOOKING ||--o{ PAYMENT : pays
    BOOKING ||--o{ PAYMENT_LEDGER : ledger
    BOOKING ||--o{ NOTIFICATION_LOG : emits
    BRANCH ||--o{ DAILY_REPORT : generates
    BOOKING ||--o{ BOOKING_SLOT : reserves
    CLIENT ||--o| LOYALTY_STATUS : qualifies

    BRANCH {
      uuid id
      string name
      string code
    }

    USER {
      uuid id
      string name
      string phone
      string email
      string role
    }

    SERVICE {
      uuid id
      string name
      decimal price
      int duration_minutes
    }

    BOOKING {
      uuid id
      string booking_code
      enum status
      enum booking_type
      datetime start_time
      datetime end_time
      decimal total_amount
    }

    PAYMENT {
      uuid id
      uuid booking_id
      decimal amount
      string provider_reference
      enum status
    }

    PAYMENT_LEDGER {
      uuid id
      uuid booking_id
      enum entry_type
      decimal total_net
    }

    LOYALTY_STATUS {
      uuid id
      uuid client_id
      string tier
      int points
      bool priority_booking
    }

    DAILY_REPORT {
      uuid id
      uuid branch_id
      string report_type
      json report_data
    }
```

## 2. Core database principles

- Each branch is independent but share central user and service catalogs.
- Booking and payment records are separated so financial truth comes from the ledger.
- Slot lock is enforced by a unique constraint on barber plus time.
- Audit records are append-only and tied to user and correlation IDs.
- OTP codes are stored as hashed values and expire with retry limits.

## 3. Required PostgreSQL entities

- branch
- users
- roles
- permissions
- client
- barber
- service
- booking
- recurring_booking
- payment
- payment_ledger
- notification
- audit_log
- otp_verification
- leave_request
- business_settings
- branch_settings
- loyalty_status
- report

## 4. Suggested indexes

- bookings(barber_id, start_time, end_time)
- bookings(branch_id, start_time)
- booking_holds(barber_id, start_time, expires_at)
- payment(provider_reference)
- audit_logs(correlation_id)
- otp_codes(phone, created_at)
- loyalty_status(client_id, tier)
