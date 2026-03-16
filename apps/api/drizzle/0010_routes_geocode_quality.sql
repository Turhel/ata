ALTER TABLE "route_candidates"
  ADD COLUMN "normalized_address_line_1" varchar(255),
  ADD COLUMN "normalized_city" varchar(120),
  ADD COLUMN "normalized_state" varchar(50),
  ADD COLUMN "normalized_zip_code" varchar(30),
  ADD COLUMN "geocode_quality" varchar(30),
  ADD COLUMN "geocode_review_required" boolean NOT NULL DEFAULT false,
  ADD COLUMN "geocode_review_reason" text;

ALTER TABLE "route_stops"
  ADD COLUMN "normalized_address_line_1" varchar(255),
  ADD COLUMN "normalized_city" varchar(120),
  ADD COLUMN "normalized_state" varchar(50),
  ADD COLUMN "normalized_zip_code" varchar(30),
  ADD COLUMN "geocode_quality" varchar(30),
  ADD COLUMN "geocode_review_required" boolean NOT NULL DEFAULT false,
  ADD COLUMN "geocode_review_reason" text;
