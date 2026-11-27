-- ==============================================================================
-- MIGRAÇÃO: MÓDULO FINANCEIRO — FASE 1 (CONTAS, CATEGORIAS, CENTROS DE CUSTO,
--           TÍTULOS A PAGAR/RECEBER, BAIXAS APPEND-ONLY E IDEMPOTÊNCIA)
-- Aplicação idempotente com preservação integral de dados existentes
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "financial_accounts" (
    "id" uuid PRIMARY KEY NOT NULL,
    "company_id" uuid NOT NULL REFERENCES "companies"("id"),
    "name" text NOT NULL,
    "type" text NOT NULL,
    "bank_code" varchar(10),
    "agency_masked" text,
    "account_masked" text,
    "initial_balance_cents" bigint DEFAULT 0 NOT NULL,
    "initial_balance_date" date NOT NULL,
    "current_balance_cents" bigint DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "financial_accounts_type_chk"
        CHECK ("type" IN ('checking', 'savings', 'cash', 'gateway', 'credit_card'))
);

CREATE INDEX IF NOT EXISTS "financial_accounts_company_idx"
    ON "financial_accounts"("company_id");
CREATE INDEX IF NOT EXISTS "financial_accounts_company_active_idx"
    ON "financial_accounts"("company_id", "active");

CREATE TABLE IF NOT EXISTS "financial_categories" (
    "id" uuid PRIMARY KEY NOT NULL,
    "company_id" uuid NOT NULL REFERENCES "companies"("id"),
    "parent_id" uuid REFERENCES "financial_categories"("id"),
    "code" varchar(30) NOT NULL,
    "name" text NOT NULL,
    "kind" text NOT NULL,
    "dre_group" text,
    "is_system" boolean DEFAULT false NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "financial_categories_kind_chk"
        CHECK ("kind" IN ('revenue', 'deduction', 'direct_cost', 'operating_expense', 'financial_result', 'transfer'))
);

CREATE INDEX IF NOT EXISTS "financial_categories_company_idx"
    ON "financial_categories"("company_id");
CREATE UNIQUE INDEX IF NOT EXISTS "financial_categories_company_code_uidx"
    ON "financial_categories"("company_id", "code");

CREATE TABLE IF NOT EXISTS "cost_centers" (
    "id" uuid PRIMARY KEY NOT NULL,
    "company_id" uuid NOT NULL REFERENCES "companies"("id"),
    "code" varchar(20) NOT NULL,
    "name" text NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "cost_centers_company_idx"
    ON "cost_centers"("company_id");
CREATE UNIQUE INDEX IF NOT EXISTS "cost_centers_company_code_uidx"
    ON "cost_centers"("company_id", "code");

CREATE TABLE IF NOT EXISTS "financial_entries" (
    "id" uuid PRIMARY KEY NOT NULL,
    "company_id" uuid NOT NULL REFERENCES "companies"("id"),
    "entry_type" text NOT NULL,
    "status" text NOT NULL,
    "description" text NOT NULL,
    "document_number" text,
    "notes" text,
    "client_id" uuid REFERENCES "clients"("id"),
    "counterparty_name" text,
    "counterparty_document" text,
    "service_id" uuid REFERENCES "services"("id"),
    "nf_id" uuid REFERENCES "nf"("id"),
    "category_id" uuid NOT NULL REFERENCES "financial_categories"("id"),
    "cost_center_id" uuid REFERENCES "cost_centers"("id"),
    "competence_date" date NOT NULL,
    "issue_date" date NOT NULL,
    "due_date" date NOT NULL,
    "paid_at" timestamp,
    "original_amount_cents" bigint NOT NULL,
    "discount_cents" bigint DEFAULT 0 NOT NULL,
    "interest_cents" bigint DEFAULT 0 NOT NULL,
    "fine_cents" bigint DEFAULT 0 NOT NULL,
    "net_amount_cents" bigint NOT NULL,
    "settled_amount_cents" bigint DEFAULT 0 NOT NULL,
    "installment_number" integer DEFAULT 1 NOT NULL,
    "total_installments" integer DEFAULT 1 NOT NULL,
    "installment_group_id" uuid,
    "is_intercompany" boolean DEFAULT false NOT NULL,
    "counterparty_company_id" uuid REFERENCES "companies"("id"),
    "created_by" uuid NOT NULL REFERENCES "users"("id"),
    "cancelled_by" uuid REFERENCES "users"("id"),
    "cancelled_at" timestamp,
    "cancel_reason" text,
    "idempotency_key" varchar(128),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "financial_entries_type_chk"
        CHECK ("entry_type" IN ('receivable', 'payable')),
    CONSTRAINT "financial_entries_status_chk"
        CHECK ("status" IN ('draft', 'pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    CONSTRAINT "financial_entries_amounts_chk"
        CHECK (
            "original_amount_cents" > 0
            AND "discount_cents" >= 0
            AND "interest_cents" >= 0
            AND "fine_cents" >= 0
            AND "net_amount_cents" > 0
            AND "settled_amount_cents" >= 0
            AND "settled_amount_cents" <= "net_amount_cents"
        ),
    CONSTRAINT "financial_entries_installments_chk"
        CHECK ("installment_number" >= 1 AND "total_installments" >= 1 AND "installment_number" <= "total_installments")
);

CREATE INDEX IF NOT EXISTS "financial_entries_company_status_due_idx"
    ON "financial_entries"("company_id", "entry_type", "status", "due_date");
CREATE INDEX IF NOT EXISTS "financial_entries_company_competence_idx"
    ON "financial_entries"("company_id", "competence_date");
CREATE INDEX IF NOT EXISTS "financial_entries_service_idx"
    ON "financial_entries"("service_id");
CREATE INDEX IF NOT EXISTS "financial_entries_nf_idx"
    ON "financial_entries"("nf_id");
CREATE INDEX IF NOT EXISTS "financial_entries_client_idx"
    ON "financial_entries"("client_id");
CREATE UNIQUE INDEX IF NOT EXISTS "financial_entries_company_idemp_uidx"
    ON "financial_entries"("company_id", "idempotency_key", "installment_number")
    WHERE "idempotency_key" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "financial_settlements" (
    "id" uuid PRIMARY KEY NOT NULL,
    "company_id" uuid NOT NULL REFERENCES "companies"("id"),
    "entry_id" uuid NOT NULL REFERENCES "financial_entries"("id"),
    "account_id" uuid NOT NULL REFERENCES "financial_accounts"("id"),
    "settlement_type" text NOT NULL,
    "reversed_settlement_id" uuid REFERENCES "financial_settlements"("id"),
    "payment_method" text NOT NULL,
    "settled_at" timestamp NOT NULL,
    "principal_cents" bigint NOT NULL,
    "interest_cents" bigint DEFAULT 0 NOT NULL,
    "fine_cents" bigint DEFAULT 0 NOT NULL,
    "discount_cents" bigint DEFAULT 0 NOT NULL,
    "gateway_fee_cents" bigint DEFAULT 0 NOT NULL,
    "total_settled_cents" bigint NOT NULL,
    "external_provider" text,
    "external_tx_id" text,
    "idempotency_key" varchar(128) NOT NULL,
    "created_by" uuid NOT NULL REFERENCES "users"("id"),
    "notes" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "financial_settlements_type_chk"
        CHECK ("settlement_type" IN ('payment', 'reversal')),
    CONSTRAINT "financial_settlements_method_chk"
        CHECK ("payment_method" IN ('pix', 'boleto', 'bank_transfer', 'credit_card', 'debit_card', 'cash', 'other')),
    CONSTRAINT "financial_settlements_amounts_chk"
        CHECK (
            "principal_cents" > 0
            AND "interest_cents" >= 0
            AND "fine_cents" >= 0
            AND "discount_cents" >= 0
            AND "gateway_fee_cents" >= 0
            AND "total_settled_cents" > 0
        )
);

CREATE INDEX IF NOT EXISTS "financial_settlements_company_settled_idx"
    ON "financial_settlements"("company_id", "settled_at");
CREATE INDEX IF NOT EXISTS "financial_settlements_entry_idx"
    ON "financial_settlements"("entry_id");
CREATE INDEX IF NOT EXISTS "financial_settlements_account_idx"
    ON "financial_settlements"("account_id");
CREATE UNIQUE INDEX IF NOT EXISTS "financial_settlements_reversed_uidx"
    ON "financial_settlements"("reversed_settlement_id")
    WHERE "reversed_settlement_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "financial_settlements_company_idemp_uidx"
    ON "financial_settlements"("company_id", "idempotency_key");

CREATE TABLE IF NOT EXISTS "financial_idempotency_keys" (
    "id" uuid PRIMARY KEY NOT NULL,
    "company_id" uuid NOT NULL REFERENCES "companies"("id"),
    "endpoint" text NOT NULL,
    "idempotency_key" varchar(128) NOT NULL,
    "request_hash" char(64) NOT NULL,
    "response_status" integer NOT NULL,
    "response_body" text NOT NULL,
    "created_by" uuid NOT NULL REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "financial_idempotency_keys_scope_uidx"
    ON "financial_idempotency_keys"("company_id", "endpoint", "idempotency_key");
CREATE INDEX IF NOT EXISTS "financial_idempotency_keys_created_idx"
    ON "financial_idempotency_keys"("created_at");
