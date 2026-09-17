-- TrueCut Foundation migration
-- Enables the modular monolith schema for a multi-branch barbershop platform.

CREATE TYPE "UserRole" AS ENUM (
  'SYSTEM_ADMIN',
  'COMPANY_ADMIN',
  'RECEPTIONIST',
  'BARBER',
  'CLIENT'
);

CREATE TYPE "BookingType" AS ENUM (
  'GENERAL',
  'REGULAR',
  'EMERGENCY',
  'HOUSE_CALL'
);

CREATE TYPE "BookingStatus" AS ENUM (
  'HELD',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'SERVED',
  'CANCELLED',
  'NO_SHOW',
  'REFUNDED'
);

CREATE TYPE "PaymentType" AS ENUM (
  'ECOCASH',
  'PAYNOW',
  'CASH'
);

CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'TIMED_OUT',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED'
);

CREATE TYPE "LedgerEntryType" AS ENUM (
  'PAYMENT_COLLECTED',
  'REFUND_ISSUED',
  'PENALTY_APPLIED'
);

CREATE TYPE "NotificationStatus" AS ENUM (
  'SCHEDULED',
  'SENT',
  'DELIVERED',
  'FAILED'
);

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refresh_token_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Harare',
    "phone" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "open_time" TEXT NOT NULL DEFAULT '08:00',
    "close_time" TEXT NOT NULL DEFAULT '18:00',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Harare',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

CREATE TABLE "branch_staff" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_staff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "branch_staff_user_id_branch_id_key" ON "branch_staff"("user_id", "branch_id");

CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "barber_services" (
    "barber_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,

    CONSTRAINT "barber_services_pkey" PRIMARY KEY ("barber_id", "service_id")
);

CREATE TABLE "barber_schedules" (
    "id" TEXT NOT NULL,
    "barber_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_working_day" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barber_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "barber_schedules_barber_id_branch_id_day_of_week_key" ON "barber_schedules"("barber_id", "branch_id", "day_of_week");

CREATE TABLE "barber_block_outs" (
    "id" TEXT NOT NULL,
    "barber_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barber_block_outs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "barber_block_outs_barber_id_start_time_end_time_idx" ON "barber_block_outs"("barber_id", "start_time", "end_time");

CREATE TABLE "booking_holds" (
    "id" TEXT NOT NULL,
    "hold_token" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "barber_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "booking_type" "BookingType" NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "house_call_address" TEXT,
    "is_emergency" BOOLEAN NOT NULL DEFAULT false,
    "is_squeeze_in" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_holds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booking_holds_hold_token_key" ON "booking_holds"("hold_token");
CREATE INDEX "booking_holds_barber_id_start_time_end_time_expires_at_idx" ON "booking_holds"("barber_id", "start_time", "end_time", "expires_at");

CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "booking_code" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "barber_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "receptionist_id" TEXT,
    "recurring_group_id" TEXT,
    "booking_type" "BookingType" NOT NULL DEFAULT 'GENERAL',
    "status" "BookingStatus" NOT NULL DEFAULT 'HELD',
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "service_fee" DECIMAL(10,2) NOT NULL,
    "booking_fee" DECIMAL(10,2) NOT NULL,
    "emergency_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "house_call_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "squeeze_in_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "house_call_address" TEXT,
    "is_squeeze_in" BOOLEAN NOT NULL DEFAULT false,
    "squeeze_in_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bookings_booking_code_key" ON "bookings"("booking_code");
CREATE INDEX "bookings_barber_id_start_time_end_time_status_idx" ON "bookings"("barber_id", "start_time", "end_time", "status");
CREATE INDEX "bookings_branch_id_start_time_idx" ON "bookings"("branch_id", "start_time");
CREATE INDEX "bookings_client_id_idx" ON "bookings"("client_id");

CREATE TABLE "recurring_booking_groups" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "barber_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "time_slot" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_booking_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider_reference" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "refund_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "penalty_deduction" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

CREATE TABLE "payment_ledgers" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT,
    "booking_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "entry_type" "LedgerEntryType" NOT NULL,
    "service_amount" DECIMAL(10,2) NOT NULL,
    "booking_fee" DECIMAL(10,2) NOT NULL,
    "emergency_fee" DECIMAL(10,2) NOT NULL,
    "squeeze_in_fee" DECIMAL(10,2) NOT NULL,
    "house_call_fee" DECIMAL(10,2) NOT NULL,
    "penalty_amount" DECIMAL(10,2) NOT NULL,
    "total_net" DECIMAL(10,2) NOT NULL,
    "provider_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_ledgers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT,
    "recipient_phone" TEXT NOT NULL,
    "recipient_role" "UserRole" NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'SMS',
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "provider_ref" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_role" "UserRole",
    "branch_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "entity_id" TEXT,
    "before_state" JSONB,
    "after_state" JSONB,
    "ip_address" TEXT,
    "correlation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_correlation_id_idx" ON "audit_logs"("correlation_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "otp_codes_phone_code_idx" ON "otp_codes"("phone", "code");

CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT,
    "report_date" TIMESTAMP(3) NOT NULL,
    "report_type" TEXT NOT NULL,
    "report_data" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_slots" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "barber_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_slots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booking_slots_booking_id_key" ON "booking_slots"("booking_id");
CREATE UNIQUE INDEX "booking_slots_barber_id_start_time_key" ON "booking_slots"("barber_id", "start_time");

ALTER TABLE "branch_staff"
    ADD CONSTRAINT "branch_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "branch_staff"
    ADD CONSTRAINT "branch_staff_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "barber_services"
    ADD CONSTRAINT "barber_services_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "barber_services"
    ADD CONSTRAINT "barber_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "barber_schedules"
    ADD CONSTRAINT "barber_schedules_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "barber_schedules"
    ADD CONSTRAINT "barber_schedules_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "barber_block_outs"
    ADD CONSTRAINT "barber_block_outs_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "barber_block_outs"
    ADD CONSTRAINT "barber_block_outs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_holds"
    ADD CONSTRAINT "booking_holds_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON UPDATE CASCADE;

ALTER TABLE "booking_holds"
    ADD CONSTRAINT "booking_holds_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON UPDATE CASCADE;

ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON UPDATE CASCADE;

ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON UPDATE CASCADE;

ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_receptionist_id_fkey" FOREIGN KEY ("receptionist_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_recurring_group_id_fkey" FOREIGN KEY ("recurring_group_id") REFERENCES "recurring_booking_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "recurring_booking_groups"
    ADD CONSTRAINT "recurring_booking_groups_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "recurring_booking_groups"
    ADD CONSTRAINT "recurring_booking_groups_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON UPDATE CASCADE;

ALTER TABLE "recurring_booking_groups"
    ADD CONSTRAINT "recurring_booking_groups_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON UPDATE CASCADE;

ALTER TABLE "payments"
    ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_ledgers"
    ADD CONSTRAINT "payment_ledgers_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_ledgers"
    ADD CONSTRAINT "payment_ledgers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON UPDATE CASCADE;

ALTER TABLE "payment_ledgers"
    ADD CONSTRAINT "payment_ledgers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON UPDATE CASCADE;

ALTER TABLE "notification_logs"
    ADD CONSTRAINT "notification_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "daily_reports"
    ADD CONSTRAINT "daily_reports_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "booking_slots"
    ADD CONSTRAINT "booking_slots_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
