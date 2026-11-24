-- ==============================================================================
-- MIGRAÇÃO MULTI-TENANT HIERÁRQUICA (MOTHER & FILIAIS)
-- Aplicação segura em 3 estágios com preservação de 100% dos dados existentes
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- ESTÁGIO 1: Criação de Estruturas e Colunas Permissivas (NULLABLE)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "companies" (
    "id" uuid PRIMARY KEY NOT NULL,
    "registered_company_name" text NOT NULL,
    "trade_name" text NOT NULL,
    "cnpj" text UNIQUE NOT NULL,
    "email" text,
    "phone" text,
    "mother_id" uuid REFERENCES "companies"("id"),
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_companies" (
    "id" uuid PRIMARY KEY NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id"),
    "company_id" uuid NOT NULL REFERENCES "companies"("id"),
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "primary_company_id" uuid;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "company_id" uuid;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "company_id" uuid;
ALTER TABLE "movimentation" ADD COLUMN IF NOT EXISTS "company_id" uuid;
ALTER TABLE "nf" ADD COLUMN IF NOT EXISTS "company_id" uuid;

-- ------------------------------------------------------------------------------
-- ESTÁGIO 2: Data Migration (Migração dos Dados Existentes para a Mother Inicial)
-- ------------------------------------------------------------------------------

DO $$
DECLARE
    v_mother_id uuid := '018f0000-0000-7000-8000-000000000001';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "companies" WHERE "id" = v_mother_id) THEN
        INSERT INTO "companies" (
            "id", "registered_company_name", "trade_name", "cnpj", "active"
        ) VALUES (
            v_mother_id,
            'Empresa Matriz Principal',
            'Matriz Principal',
            '00000000000191',
            true
        );
    END IF;

    UPDATE "users" 
    SET "primary_company_id" = v_mother_id 
    WHERE "primary_company_id" IS NULL;

    INSERT INTO "user_companies" ("id", "user_id", "company_id", "is_default")
    SELECT gen_random_uuid(), "id", v_mother_id, true
    FROM "users" u
    WHERE NOT EXISTS (
        SELECT 1 FROM "user_companies" uc 
        WHERE uc."user_id" = u."id" AND uc."company_id" = v_mother_id
    );

    UPDATE "clients" SET "company_id" = v_mother_id WHERE "company_id" IS NULL;
    UPDATE "services" SET "company_id" = v_mother_id WHERE "company_id" IS NULL;
    UPDATE "movimentation" SET "company_id" = v_mother_id WHERE "company_id" IS NULL;
    UPDATE "nf" SET "company_id" = v_mother_id WHERE "company_id" IS NULL;
END $$;

-- ------------------------------------------------------------------------------
-- ESTÁGIO 3: Enforçamento de Integridade e Criação de Índices
-- ------------------------------------------------------------------------------

DO $$
BEGIN
    -- Foreign Keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_primary_company_id_fk') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_primary_company_id_fk" FOREIGN KEY ("primary_company_id") REFERENCES "companies"("id");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clients_company_id_fk') THEN
        ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'services_company_id_fk') THEN
        ALTER TABLE "services" ADD CONSTRAINT "services_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'movimentation_company_id_fk') THEN
        ALTER TABLE "movimentation" ADD CONSTRAINT "movimentation_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'nf_company_id_fk') THEN
        ALTER TABLE "nf" ADD CONSTRAINT "nf_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id");
    END IF;
END $$;

-- Índices de Performance
CREATE INDEX IF NOT EXISTS "companies_mother_id_idx" ON "companies"("mother_id");
CREATE INDEX IF NOT EXISTS "companies_cnpj_idx" ON "companies"("cnpj");
CREATE INDEX IF NOT EXISTS "companies_active_idx" ON "companies"("active");
CREATE INDEX IF NOT EXISTS "user_companies_user_idx" ON "user_companies"("user_id");
CREATE INDEX IF NOT EXISTS "user_companies_company_idx" ON "user_companies"("company_id");
CREATE INDEX IF NOT EXISTS "clients_company_id_idx" ON "clients"("company_id");
CREATE INDEX IF NOT EXISTS "services_company_id_idx" ON "services"("company_id");
CREATE INDEX IF NOT EXISTS "movimentation_company_id_idx" ON "movimentation"("company_id");
CREATE INDEX IF NOT EXISTS "nf_company_id_idx" ON "nf"("company_id");
