-- ==============================================================================
-- MIGRAÇÃO MULTI-TENANT: ROLE company_admin E UNICIDADE POR EMPRESA
-- Aplicação idempotente com preservação de 100% dos dados existentes
-- ==============================================================================

-- 1. Inserir perfil company_admin (Admin da Empresa Cliente)
INSERT INTO "roles" ("id", "name", "active")
SELECT gen_random_uuid(), 'company_admin', true
WHERE NOT EXISTS (
    SELECT 1 FROM "roles" WHERE "name" = 'company_admin'
);

-- 2. Remover constraints UNIQUE globais da tabela clients (substituídas por unicidade por company_id)
DO $$
BEGIN
    ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_registered_company_name_unique";
    ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_trade_name_unique";
    ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_cnpj_unique";
    ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_cpf_unique";
    ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_email_unique";
END $$;

-- 3. Criar índices únicos compostos por empresa (company_id)
CREATE UNIQUE INDEX IF NOT EXISTS "clients_company_registered_name_uidx"
    ON "clients"("company_id", "registered_company_name");

CREATE UNIQUE INDEX IF NOT EXISTS "clients_company_trade_name_uidx"
    ON "clients"("company_id", "trade_name");

CREATE UNIQUE INDEX IF NOT EXISTS "clients_company_cnpj_uidx"
    ON "clients"("company_id", "cnpj")
    WHERE "cnpj" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "clients_company_cpf_uidx"
    ON "clients"("company_id", "cpf")
    WHERE "cpf" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "clients_company_email_uidx"
    ON "clients"("company_id", "email")
    WHERE "email" IS NOT NULL;
