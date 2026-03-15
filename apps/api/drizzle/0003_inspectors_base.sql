CREATE TABLE "inspector_account_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"inspector_account_id" uuid NOT NULL,
	"inspector_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspector_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_code" varchar(50) NOT NULL,
	"account_type" varchar(30) DEFAULT 'field' NOT NULL,
	"description" varchar(255),
	"current_inspector_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspectors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inspector_account_assignments" ADD CONSTRAINT "inspector_account_assignments_inspector_account_id_inspector_accounts_id_fk" FOREIGN KEY ("inspector_account_id") REFERENCES "public"."inspector_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspector_account_assignments" ADD CONSTRAINT "inspector_account_assignments_inspector_id_inspectors_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."inspectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspector_accounts" ADD CONSTRAINT "inspector_accounts_current_inspector_id_inspectors_id_fk" FOREIGN KEY ("current_inspector_id") REFERENCES "public"."inspectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inspector_account_assignments_inspector_account_id_idx" ON "inspector_account_assignments" USING btree ("inspector_account_id");--> statement-breakpoint
CREATE INDEX "inspector_account_assignments_inspector_id_idx" ON "inspector_account_assignments" USING btree ("inspector_id");--> statement-breakpoint
CREATE INDEX "inspector_account_assignments_is_active_idx" ON "inspector_account_assignments" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "inspector_accounts_account_code_idx" ON "inspector_accounts" USING btree ("account_code");--> statement-breakpoint
CREATE INDEX "inspector_accounts_account_type_idx" ON "inspector_accounts" USING btree ("account_type");--> statement-breakpoint
CREATE INDEX "inspector_accounts_current_inspector_id_idx" ON "inspector_accounts" USING btree ("current_inspector_id");--> statement-breakpoint
CREATE INDEX "inspectors_status_idx" ON "inspectors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inspectors_full_name_idx" ON "inspectors" USING btree ("full_name");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_inspector_account_id_inspector_accounts_id_fk" FOREIGN KEY ("inspector_account_id") REFERENCES "public"."inspector_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_inspector_id_inspectors_id_fk" FOREIGN KEY ("assigned_inspector_id") REFERENCES "public"."inspectors"("id") ON DELETE no action ON UPDATE no action;