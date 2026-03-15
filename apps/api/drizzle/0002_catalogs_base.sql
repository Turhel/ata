CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_code" varchar(80) NOT NULL,
	"name" varchar(255),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_types" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(120),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"default_payment_amount_assistant" numeric(12, 2),
	"default_payment_amount_inspector" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "clients_client_code_idx" ON "clients" USING btree ("client_code");--> statement-breakpoint
CREATE INDEX "clients_is_active_idx" ON "clients" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "work_types_code_idx" ON "work_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX "work_types_is_active_idx" ON "work_types" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_work_type_id_work_types_id_fk" FOREIGN KEY ("work_type_id") REFERENCES "public"."work_types"("id") ON DELETE no action ON UPDATE no action;