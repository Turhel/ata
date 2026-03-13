CREATE TYPE "public"."role_code" AS ENUM('master', 'admin', 'assistant', 'inspector');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('pending', 'active', 'blocked', 'inactive');--> statement-breakpoint
CREATE TABLE "team_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"assistant_user_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_assignments_admin_not_assistant_chk" CHECK ("team_assignments"."admin_user_id" <> "team_assignments"."assistant_user_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"role_code" "role_code" NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by_user_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"status" "user_status" DEFAULT 'pending' NOT NULL,
	"auth_user_id" varchar(255),
	"last_login_at" timestamp,
	"approved_at" timestamp,
	"approved_by_user_id" uuid,
	"blocked_at" timestamp,
	"blocked_by_user_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_assistant_user_id_users_id_fk" FOREIGN KEY ("assistant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_blocked_by_user_id_users_id_fk" FOREIGN KEY ("blocked_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_assignments_admin_user_id_idx" ON "team_assignments" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "team_assignments_assistant_user_id_idx" ON "team_assignments" USING btree ("assistant_user_id");--> statement-breakpoint
CREATE INDEX "team_assignments_is_active_idx" ON "team_assignments" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "team_assignments_one_active_per_assistant_idx" ON "team_assignments" USING btree ("assistant_user_id") WHERE "team_assignments"."is_active" = true;--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_code_idx" ON "user_roles" USING btree ("role_code");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_is_active_idx" ON "user_roles" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_one_active_per_user_idx" ON "user_roles" USING btree ("user_id") WHERE "user_roles"."is_active" = true;--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");