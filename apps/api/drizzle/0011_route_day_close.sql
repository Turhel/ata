ALTER TYPE "public"."route_event_type" ADD VALUE IF NOT EXISTS 'day_closed';

CREATE TABLE "route_day_closures" (
  "id" uuid PRIMARY KEY NOT NULL,
  "route_id" uuid NOT NULL,
  "route_date" date NOT NULL,
  "assistant_user_id" uuid,
  "inspector_id" uuid,
  "submitted_by_user_id" uuid NOT NULL,
  "route_complete" boolean DEFAULT false NOT NULL,
  "stopped_at_seq" integer,
  "notes" text,
  "reported_order_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "skipped_stops" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "planned_done" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "planned_not_done" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "done_not_planned" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "route_day_closures" ADD CONSTRAINT "route_day_closures_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "route_day_closures" ADD CONSTRAINT "route_day_closures_assistant_user_id_users_id_fk" FOREIGN KEY ("assistant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "route_day_closures" ADD CONSTRAINT "route_day_closures_inspector_id_inspectors_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."inspectors"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "route_day_closures" ADD CONSTRAINT "route_day_closures_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "route_day_closures_route_id_idx" ON "route_day_closures" USING btree ("route_id");
--> statement-breakpoint
CREATE INDEX "route_day_closures_route_date_idx" ON "route_day_closures" USING btree ("route_date");
--> statement-breakpoint
CREATE INDEX "route_day_closures_assistant_user_id_idx" ON "route_day_closures" USING btree ("assistant_user_id");
--> statement-breakpoint
CREATE INDEX "route_day_closures_inspector_id_idx" ON "route_day_closures" USING btree ("inspector_id");
