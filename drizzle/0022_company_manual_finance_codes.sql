ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "allow_manual_finance_codes" boolean NOT NULL DEFAULT false;
