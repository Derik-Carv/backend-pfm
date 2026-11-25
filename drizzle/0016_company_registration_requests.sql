-- ==============================================================================
-- MIGRAÇÃO: SOLICITAÇÃO DE CADASTRO DE EMPRESA E APROVAÇÃO ADMIN SAAS
-- Aplicação idempotente
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "company_registration_requests" (
    "id" uuid PRIMARY KEY NOT NULL,
    "registered_company_name" text NOT NULL,
    "trade_name" text NOT NULL,
    "cnpj" text NOT NULL,
    "company_email" text,
    "phone" text,
    "admin_name" text NOT NULL,
    "admin_surname" text NOT NULL,
    "admin_email" text NOT NULL,
    "admin_cpf" text NOT NULL,
    "admin_password_hash" text NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "rejection_reason" text,
    "reviewed_by" uuid REFERENCES "users"("id"),
    "reviewed_at" timestamp,
    "approved_company_id" uuid REFERENCES "companies"("id"),
    "approved_user_id" uuid REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "company_reg_req_status_idx" ON "company_registration_requests"("status");
CREATE INDEX IF NOT EXISTS "company_reg_req_cnpj_idx" ON "company_registration_requests"("cnpj");
CREATE INDEX IF NOT EXISTS "company_reg_req_email_idx" ON "company_registration_requests"(lower("admin_email"));
