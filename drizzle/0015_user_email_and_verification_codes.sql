-- ==============================================================================
-- MIGRAÇÃO: E-MAIL OBRIGATÓRIO PARA NOVOS USUÁRIOS E CÓDIGOS DE VERIFICAÇÃO OTP
-- Aplicação idempotente com preservação de 100% dos usuários existentes
-- ==============================================================================

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_uidx"
    ON "users"(lower("email"))
    WHERE "email" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "email_verification_codes" (
    "id" uuid PRIMARY KEY NOT NULL,
    "email" text NOT NULL,
    "purpose" text NOT NULL,
    "code_hash" text NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp NOT NULL,
    "consumed_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "email_verification_codes_lookup_idx"
    ON "email_verification_codes"("email", "purpose", "created_at");
