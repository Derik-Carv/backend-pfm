-- ==============================================================================
-- MIGRAÇÃO: CONFORMIDADE LGPD (AUDITORIA, ACEITES LEGAIS, RETENÇÃO E ANONIMIZAÇÃO)
-- Aplicação idempotente com preservação de 100% dos dados existentes
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" uuid PRIMARY KEY NOT NULL,
    "actor_id" uuid REFERENCES "users"("id"),
    "actor_role" text,
    "company_id" uuid REFERENCES "companies"("id"),
    "action" text NOT NULL,
    "target_table" text,
    "target_id" text,
    "ip_address" text,
    "user_agent" text,
    "metadata" text,
    "status_code" integer,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx" ON "audit_logs"("actor_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_company_idx" ON "audit_logs"("company_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");

CREATE TABLE IF NOT EXISTS "legal_acceptances" (
    "id" uuid PRIMARY KEY NOT NULL,
    "user_id" uuid REFERENCES "users"("id"),
    "company_request_id" uuid REFERENCES "company_registration_requests"("id"),
    "document_type" text NOT NULL,
    "document_version" text NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "accepted_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "legal_acceptances_user_doc_idx"
    ON "legal_acceptances"("user_id", "document_type", "document_version");
CREATE INDEX IF NOT EXISTS "legal_acceptances_request_idx"
    ON "legal_acceptances"("company_request_id");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "anonymized_at" timestamp;

ALTER TABLE "company_registration_requests" ADD COLUMN IF NOT EXISTS "accepted_terms_version" text;
ALTER TABLE "company_registration_requests" ADD COLUMN IF NOT EXISTS "accepted_privacy_version" text;
ALTER TABLE "company_registration_requests" ADD COLUMN IF NOT EXISTS "accepted_ip" text;
ALTER TABLE "company_registration_requests" ADD COLUMN IF NOT EXISTS "accepted_at" timestamp;
ALTER TABLE "company_registration_requests" ALTER COLUMN "admin_password_hash" DROP NOT NULL;
