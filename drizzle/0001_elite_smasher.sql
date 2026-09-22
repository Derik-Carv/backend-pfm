CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"registered_company_name" text NOT NULL,
	"trade_name" text NOT NULL,
	"cnpj" text,
	"cpf" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_registered_company_name_unique" UNIQUE("registered_company_name"),
	CONSTRAINT "clients_trade_name_unique" UNIQUE("trade_name"),
	CONSTRAINT "clients_cnpj_unique" UNIQUE("cnpj"),
	CONSTRAINT "clients_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE "movimentation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nf_id" uuid,
	"destination_user_id" uuid,
	"destination_client_id" uuid,
	"justify" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nf" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type_id" uuid NOT NULL,
	"number_nf" text,
	"access_key" varchar(44),
	"third_party_client_id" uuid NOT NULL,
	"emission_date" date NOT NULL,
	"cancel_date" date NOT NULL,
	"total_value" numeric(10, 2) NOT NULL,
	"path_file" text,
	"services_id" uuid NOT NULL,
	"movimentation_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nf_access_key_unique" UNIQUE("access_key")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY NOT NULL,
	"service_name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"initial_date" date NOT NULL,
	"finish_date" date NOT NULL,
	"client_id" uuid NOT NULL,
	"details" text NOT NULL,
	"status_service_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statusService" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "type" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "movimentation" ADD CONSTRAINT "movimentation_destination_user_id_users_id_fk" FOREIGN KEY ("destination_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentation" ADD CONSTRAINT "movimentation_destination_client_id_clients_id_fk" FOREIGN KEY ("destination_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nf" ADD CONSTRAINT "nf_type_id_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nf" ADD CONSTRAINT "nf_third_party_client_id_clients_id_fk" FOREIGN KEY ("third_party_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nf" ADD CONSTRAINT "nf_services_id_services_id_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nf" ADD CONSTRAINT "nf_movimentation_id_movimentation_id_fk" FOREIGN KEY ("movimentation_id") REFERENCES "public"."movimentation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_status_service_id_statusService_id_fk" FOREIGN KEY ("status_service_id") REFERENCES "public"."statusService"("id") ON DELETE no action ON UPDATE no action;