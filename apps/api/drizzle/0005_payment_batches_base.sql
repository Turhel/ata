CREATE TYPE "public"."payment_batch_status" AS ENUM('open', 'closed', 'paid', 'cancelled');
--> statement-breakpoint
CREATE TABLE "payment_batches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reference_code" varchar(80) NOT NULL,
	"status" "payment_batch_status" DEFAULT 'open' NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"closed_by_user_id" uuid,
	"paid_by_user_id" uuid,
	"closed_at" timestamp,
	"paid_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_batch_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payment_batch_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"assistant_user_id" uuid,
	"inspector_id" uuid,
	"inspector_account_id" uuid,
	"client_id" uuid,
	"work_type_id" uuid,
	"external_order_code" varchar(120) NOT NULL,
	"amount_assistant" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount_inspector" numeric(12, 2) DEFAULT '0' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"snapshot_payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_batches" ADD CONSTRAINT "payment_batches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_batches" ADD CONSTRAINT "payment_batches_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_batches" ADD CONSTRAINT "payment_batches_paid_by_user_id_users_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_batch_items" ADD CONSTRAINT "payment_batch_items_payment_batch_id_payment_batches_id_fk" FOREIGN KEY ("payment_batch_id") REFERENCES "public"."payment_batches"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_batch_items" ADD CONSTRAINT "payment_batch_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_batch_items" ADD CONSTRAINT "payment_batch_items_assistant_user_id_users_id_fk" FOREIGN KEY ("assistant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_batch_items" ADD CONSTRAINT "payment_batch_items_inspector_id_inspectors_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."inspectors"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_batch_items" ADD CONSTRAINT "payment_batch_items_inspector_account_id_inspector_accounts_id_fk" FOREIGN KEY ("inspector_account_id") REFERENCES "public"."inspector_accounts"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_batch_items" ADD CONSTRAINT "payment_batch_items_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_batch_items" ADD CONSTRAINT "payment_batch_items_work_type_id_work_types_id_fk" FOREIGN KEY ("work_type_id") REFERENCES "public"."work_types"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_batches_reference_code_idx" ON "payment_batches" USING btree ("reference_code");
--> statement-breakpoint
CREATE INDEX "payment_batches_status_idx" ON "payment_batches" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "payment_batches_period_idx" ON "payment_batches" USING btree ("period_start","period_end");
--> statement-breakpoint
CREATE INDEX "payment_batch_items_payment_batch_id_idx" ON "payment_batch_items" USING btree ("payment_batch_id");
--> statement-breakpoint
CREATE INDEX "payment_batch_items_order_id_idx" ON "payment_batch_items" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX "payment_batch_items_assistant_user_id_idx" ON "payment_batch_items" USING btree ("assistant_user_id");
--> statement-breakpoint
CREATE INDEX "payment_batch_items_inspector_id_idx" ON "payment_batch_items" USING btree ("inspector_id");
--> statement-breakpoint
CREATE INDEX "payment_batch_items_inspector_account_id_idx" ON "payment_batch_items" USING btree ("inspector_account_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_batch_items_batch_order_idx" ON "payment_batch_items" USING btree ("payment_batch_id","order_id");
