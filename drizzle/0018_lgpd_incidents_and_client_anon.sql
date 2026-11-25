-- ==============================================================================
-- MIGRAÇÃO: REGISTRO DE INCIDENTES DE SEGURANÇA (RES. CD/ANPD Nº 15/2024 - 5 ANOS)
--           E ANONIMIZAÇÃO DE CLIENTE PESSOA FÍSICA
-- Aplicação idempotente com preservação de 100% dos dados existentes
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "security_incidents" (
    "id" uuid PRIMARY KEY NOT NULL,
    "title" text NOT NULL,
    "description" text NOT NULL,
    "severity" text NOT NULL,
    "affected_data_categories" text NOT NULL,
    "affected_subjects_estimate" integer,
    "relevant_risk" boolean DEFAULT false NOT NULL,
    "notified_anpd" boolean DEFAULT false NOT NULL,
    "notified_anpd_at" timestamp,
    "notified_subjects" boolean DEFAULT false NOT NULL,
    "notified_subjects_at" timestamp,
    "containment_measures" text,
    "status" text DEFAULT 'open' NOT NULL,
    "detected_at" timestamp NOT NULL,
    "reported_by" uuid REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "security_incidents_detected_idx"
    ON "security_incidents"("detected_at" DESC);
CREATE INDEX IF NOT EXISTS "security_incidents_status_idx"
    ON "security_incidents"("status");

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "anonymized_at" timestamp;
