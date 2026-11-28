-- ==============================================================================
-- MIGRAÇÃO: CONTAS PESSOAIS POR CPF (account_type = 'business' | 'personal')
-- Compatível com registros existentes (default 'business') e idempotente
-- ==============================================================================

ALTER TABLE "companies"
    ADD COLUMN IF NOT EXISTS "account_type" text NOT NULL DEFAULT 'business';

ALTER TABLE "company_registration_requests"
    ADD COLUMN IF NOT EXISTS "account_type" text NOT NULL DEFAULT 'business';

CREATE INDEX IF NOT EXISTS "companies_account_type_idx"
    ON "companies"("account_type");

DO $$
BEGIN
    ALTER TABLE "companies"
        ADD CONSTRAINT "companies_account_type_chk"
        CHECK ("account_type" IN ('business', 'personal'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "companies"
        ADD CONSTRAINT "companies_document_length_chk"
        CHECK (
            ("account_type" = 'business' AND char_length("cnpj") = 14) OR
            ("account_type" = 'personal' AND (char_length("cnpj") = 11 OR "cnpj" LIKE 'ANON-%'))
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "companies"
        ADD CONSTRAINT "companies_personal_no_mother_chk"
        CHECK (NOT ("account_type" = 'personal' AND "mother_id" IS NOT NULL));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "company_registration_requests"
        ADD CONSTRAINT "company_reg_req_account_type_chk"
        CHECK ("account_type" IN ('business', 'personal'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "company_registration_requests"
        DROP CONSTRAINT IF EXISTS "company_reg_req_document_length_chk";
    ALTER TABLE "company_registration_requests"
        ADD CONSTRAINT "company_reg_req_document_length_chk"
        CHECK (
            ("account_type" = 'business' AND char_length("cnpj") = 14) OR
            ("account_type" = 'personal' AND (char_length("cnpj") = 11 OR "cnpj" LIKE 'ANON-%'))
        );
END $$;
