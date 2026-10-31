ALTER TABLE "nf" ADD COLUMN "deactivation_reason" text;--> statement-breakpoint
ALTER TABLE "nf" ADD COLUMN "deactivated_at" timestamp;--> statement-breakpoint
ALTER TABLE "nf" ADD COLUMN "deactivated_by" uuid;--> statement-breakpoint
ALTER TABLE "nf" ADD CONSTRAINT "nf_deactivated_by_users_id_fk" FOREIGN KEY ("deactivated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nf_access_key_idx" ON "nf" USING btree ("access_key");--> statement-breakpoint
CREATE INDEX "nf_number_idx" ON "nf" USING btree ("number_nf");--> statement-breakpoint
CREATE INDEX "nf_emission_date_idx" ON "nf" USING btree ("emission_date");--> statement-breakpoint
CREATE INDEX "nf_active_emission_date_idx" ON "nf" USING btree ("active","emission_date");