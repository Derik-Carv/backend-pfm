ALTER TABLE "bundled" ADD COLUMN "service_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "bundled" ADD COLUMN "price" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "bundled" ADD COLUMN "initial_date" date NOT NULL;--> statement-breakpoint
ALTER TABLE "bundled" ADD COLUMN "finish_date" date;