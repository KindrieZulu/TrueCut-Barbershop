-- Speeds up PaymentsService.handleWebhook's lookup by provider reference,
-- as recommended in docs/database-erd.md but never implemented.
CREATE INDEX "payments_provider_reference_idx" ON "payments"("provider_reference");
