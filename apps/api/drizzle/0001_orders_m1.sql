CREATE TYPE "public"."import_action" AS ENUM('created', 'updated', 'ignored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."import_batch_status" AS ENUM('processing', 'completed', 'failed', 'partially_completed');--> statement-breakpoint
CREATE TYPE "public"."order_event_type" AS ENUM('created', 'claimed', 'updated', 'submitted', 'follow_up_requested', 'resubmitted', 'rejected', 'approved', 'returned_to_pool', 'batched', 'paid', 'cancelled_from_source', 'archived');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('available', 'in_progress', 'submitted', 'follow_up', 'rejected', 'approved', 'batched', 'paid', 'cancelled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."source_order_status" AS ENUM('Assigned', 'Received', 'Canceled');--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"event_type" "order_event_type" NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status",
	"performed_by_user_id" uuid NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"external_order_code" varchar(120) NOT NULL,
	"source_status" "source_order_status" NOT NULL,
	"status" "order_status" DEFAULT 'available' NOT NULL,
	"client_id" uuid,
	"resident_name" varchar(255),
	"address_line_1" varchar(255),
	"address_line_2" varchar(255),
	"city" varchar(120),
	"state" varchar(50),
	"zip_code" varchar(30),
	"work_type_id" uuid,
	"inspector_account_id" uuid,
	"assigned_inspector_id" uuid,
	"assistant_user_id" uuid,
	"source_import_batch_id" uuid,
	"available_date" date,
	"deadline_date" date,
	"is_rush" boolean DEFAULT false NOT NULL,
	"is_vacant" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"follow_up_at" timestamp,
	"returned_to_pool_at" timestamp,
	"batched_at" timestamp,
	"paid_at" timestamp,
	"cancelled_at" timestamp,
	"completed_at" timestamp,
	"payment_locked" boolean DEFAULT false NOT NULL,
	"current_payment_batch_item_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_external_order_code_unique" UNIQUE("external_order_code")
);
--> statement-breakpoint
CREATE TABLE "pool_import_batches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"status" "import_batch_status" NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"inserted_rows" integer DEFAULT 0 NOT NULL,
	"updated_rows" integer DEFAULT 0 NOT NULL,
	"ignored_rows" integer DEFAULT 0 NOT NULL,
	"error_rows" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"imported_by_user_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_import_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"batch_id" uuid NOT NULL,
	"external_order_code" varchar(120) NOT NULL,
	"source_status" "source_order_status" NOT NULL,
	"source_inspector_account_code" varchar(50),
	"source_client_code" varchar(80),
	"source_work_type_code" varchar(50),
	"raw_payload" jsonb NOT NULL,
	"matched_order_id" uuid,
	"import_action" "import_action" NOT NULL,
	"line_number" integer NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assistant_user_id_users_id_fk" FOREIGN KEY ("assistant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_source_import_batch_id_pool_import_batches_id_fk" FOREIGN KEY ("source_import_batch_id") REFERENCES "public"."pool_import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_import_batches" ADD CONSTRAINT "pool_import_batches_imported_by_user_id_users_id_fk" FOREIGN KEY ("imported_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_import_items" ADD CONSTRAINT "pool_import_items_batch_id_pool_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."pool_import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_import_items" ADD CONSTRAINT "pool_import_items_matched_order_id_orders_id_fk" FOREIGN KEY ("matched_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_events_order_id_idx" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_events_event_type_idx" ON "order_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "order_events_performed_by_user_id_idx" ON "order_events" USING btree ("performed_by_user_id");--> statement-breakpoint
CREATE INDEX "order_events_created_at_idx" ON "order_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_source_status_idx" ON "orders" USING btree ("source_status");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_client_id_idx" ON "orders" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "orders_work_type_id_idx" ON "orders" USING btree ("work_type_id");--> statement-breakpoint
CREATE INDEX "orders_inspector_account_id_idx" ON "orders" USING btree ("inspector_account_id");--> statement-breakpoint
CREATE INDEX "orders_assigned_inspector_id_idx" ON "orders" USING btree ("assigned_inspector_id");--> statement-breakpoint
CREATE INDEX "orders_assistant_user_id_idx" ON "orders" USING btree ("assistant_user_id");--> statement-breakpoint
CREATE INDEX "orders_available_date_idx" ON "orders" USING btree ("available_date");--> statement-breakpoint
CREATE INDEX "orders_deadline_date_idx" ON "orders" USING btree ("deadline_date");--> statement-breakpoint
CREATE INDEX "orders_status_assistant_user_id_idx" ON "orders" USING btree ("status","assistant_user_id");--> statement-breakpoint
CREATE INDEX "orders_status_inspector_account_id_idx" ON "orders" USING btree ("status","inspector_account_id");--> statement-breakpoint
CREATE INDEX "pool_import_batches_status_idx" ON "pool_import_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pool_import_batches_imported_by_user_id_idx" ON "pool_import_batches" USING btree ("imported_by_user_id");--> statement-breakpoint
CREATE INDEX "pool_import_batches_started_at_idx" ON "pool_import_batches" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "pool_import_items_batch_id_idx" ON "pool_import_items" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "pool_import_items_external_order_code_idx" ON "pool_import_items" USING btree ("external_order_code");--> statement-breakpoint
CREATE INDEX "pool_import_items_matched_order_id_idx" ON "pool_import_items" USING btree ("matched_order_id");--> statement-breakpoint
CREATE INDEX "pool_import_items_source_status_idx" ON "pool_import_items" USING btree ("source_status");