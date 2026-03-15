CREATE TABLE "order_notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"note_type" varchar(30) NOT NULL,
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "order_notes_order_id_idx" ON "order_notes" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX "order_notes_author_user_id_idx" ON "order_notes" USING btree ("author_user_id");
--> statement-breakpoint
CREATE INDEX "order_notes_note_type_idx" ON "order_notes" USING btree ("note_type");
--> statement-breakpoint
CREATE INDEX "order_notes_created_at_idx" ON "order_notes" USING btree ("created_at");
