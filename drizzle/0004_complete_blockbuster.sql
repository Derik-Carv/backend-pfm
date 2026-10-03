CREATE TABLE "bundled" (
	"id" uuid PRIMARY KEY NOT NULL,
	"service_bundled_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bundled" ADD CONSTRAINT "bundled_service_bundled_id_services_id_fk" FOREIGN KEY ("service_bundled_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundled" ADD CONSTRAINT "bundled_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;