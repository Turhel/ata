CREATE TYPE "public"."route_status" AS ENUM('draft', 'published', 'superseded', 'cancelled');
CREATE TYPE "public"."route_event_type" AS ENUM('created', 'published', 'superseded', 'cancelled', 'reordered', 'imported_gpx', 'export_generated');
CREATE TYPE "public"."route_stop_status" AS ENUM('pending', 'done', 'skipped');
CREATE TYPE "public"."route_stop_category" AS ENUM('regular', 'exterior', 'interior', 'fint', 'overdue');

CREATE TABLE "route_source_batches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"route_date" date NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_hash" varchar(64),
	"uploaded_by_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "route_candidates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_batch_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"external_order_code" varchar(120) NOT NULL,
	"source_status" "source_order_status" NOT NULL,
	"source_inspector_account_code" varchar(50),
	"source_client_code" varchar(80),
	"source_work_type_code" varchar(50),
	"resident_name" varchar(255),
	"address_line_1" varchar(255),
	"address_line_2" varchar(255),
	"city" varchar(120),
	"state" varchar(50),
	"zip_code" varchar(30),
	"due_date" date,
	"start_date" date,
	"has_window" boolean DEFAULT false NOT NULL,
	"is_rush" boolean DEFAULT false NOT NULL,
	"is_follow_up" boolean DEFAULT false NOT NULL,
	"is_vacant" boolean DEFAULT false NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"order_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"route_date" date NOT NULL,
	"source_batch_id" uuid NOT NULL,
	"inspector_account_id" uuid NOT NULL,
	"inspector_id" uuid,
	"assistant_user_id" uuid,
	"status" "route_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"superseded_by_route_id" uuid,
	"published_at" timestamp,
	"published_by_user_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "route_stops" (
	"id" uuid PRIMARY KEY NOT NULL,
	"route_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"candidate_id" uuid,
	"order_id" uuid,
	"route_category" "route_stop_category" DEFAULT 'regular' NOT NULL,
	"stop_status" "route_stop_status" DEFAULT 'pending' NOT NULL,
	"resident_name" varchar(255),
	"address_line_1" varchar(255),
	"address_line_2" varchar(255),
	"city" varchar(120),
	"state" varchar(50),
	"zip_code" varchar(30),
	"due_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "route_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"route_id" uuid NOT NULL,
	"event_type" "route_event_type" NOT NULL,
	"from_status" "route_status",
	"to_status" "route_status",
	"performed_by_user_id" uuid NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "route_source_batches" ADD CONSTRAINT "route_source_batches_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "route_candidates" ADD CONSTRAINT "route_candidates_source_batch_id_route_source_batches_id_fk" FOREIGN KEY ("source_batch_id") REFERENCES "public"."route_source_batches"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "route_candidates" ADD CONSTRAINT "route_candidates_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "routes" ADD CONSTRAINT "routes_source_batch_id_route_source_batches_id_fk" FOREIGN KEY ("source_batch_id") REFERENCES "public"."route_source_batches"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "routes" ADD CONSTRAINT "routes_inspector_account_id_inspector_accounts_id_fk" FOREIGN KEY ("inspector_account_id") REFERENCES "public"."inspector_accounts"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "routes" ADD CONSTRAINT "routes_inspector_id_inspectors_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."inspectors"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "routes" ADD CONSTRAINT "routes_assistant_user_id_users_id_fk" FOREIGN KEY ("assistant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "routes" ADD CONSTRAINT "routes_superseded_by_route_id_routes_id_fk" FOREIGN KEY ("superseded_by_route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "routes" ADD CONSTRAINT "routes_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_candidate_id_route_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."route_candidates"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "route_events" ADD CONSTRAINT "route_events_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "route_events" ADD CONSTRAINT "route_events_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "route_source_batches_route_date_idx" ON "route_source_batches" USING btree ("route_date");
CREATE INDEX "route_source_batches_uploaded_by_user_id_idx" ON "route_source_batches" USING btree ("uploaded_by_user_id");

CREATE UNIQUE INDEX "route_candidates_batch_line_idx" ON "route_candidates" USING btree ("source_batch_id","line_number");
CREATE INDEX "route_candidates_source_batch_id_idx" ON "route_candidates" USING btree ("source_batch_id");
CREATE INDEX "route_candidates_external_order_code_idx" ON "route_candidates" USING btree ("external_order_code");
CREATE INDEX "route_candidates_source_inspector_account_code_idx" ON "route_candidates" USING btree ("source_inspector_account_code");
CREATE INDEX "route_candidates_due_date_idx" ON "route_candidates" USING btree ("due_date");

CREATE UNIQUE INDEX "routes_date_account_version_idx" ON "routes" USING btree ("route_date","inspector_account_id","version");
CREATE UNIQUE INDEX "routes_one_active_per_day_account_idx" ON "routes" USING btree ("route_date","inspector_account_id") WHERE "status" IN ('draft','published');
CREATE INDEX "routes_route_date_idx" ON "routes" USING btree ("route_date");
CREATE INDEX "routes_inspector_account_id_idx" ON "routes" USING btree ("inspector_account_id");
CREATE INDEX "routes_status_idx" ON "routes" USING btree ("status");

CREATE UNIQUE INDEX "route_stops_route_seq_idx" ON "route_stops" USING btree ("route_id","seq");
CREATE INDEX "route_stops_route_id_idx" ON "route_stops" USING btree ("route_id");
CREATE INDEX "route_stops_candidate_id_idx" ON "route_stops" USING btree ("candidate_id");
CREATE INDEX "route_stops_order_id_idx" ON "route_stops" USING btree ("order_id");

CREATE INDEX "route_events_route_id_idx" ON "route_events" USING btree ("route_id");
CREATE INDEX "route_events_created_at_idx" ON "route_events" USING btree ("created_at");

