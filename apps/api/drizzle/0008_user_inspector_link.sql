ALTER TABLE "users" ADD COLUMN "inspector_id" uuid;
ALTER TABLE "users" ADD CONSTRAINT "users_inspector_id_unique" UNIQUE("inspector_id");
