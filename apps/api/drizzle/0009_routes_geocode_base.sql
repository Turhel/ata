ALTER TABLE "route_candidates" ADD COLUMN "latitude" numeric(10, 7);
ALTER TABLE "route_candidates" ADD COLUMN "longitude" numeric(10, 7);
ALTER TABLE "route_candidates" ADD COLUMN "geocode_status" varchar(30) DEFAULT 'pending' NOT NULL;
ALTER TABLE "route_candidates" ADD COLUMN "geocode_source" varchar(50);
ALTER TABLE "route_candidates" ADD COLUMN "geocoded_at" timestamp;

ALTER TABLE "route_stops" ADD COLUMN "latitude" numeric(10, 7);
ALTER TABLE "route_stops" ADD COLUMN "longitude" numeric(10, 7);
ALTER TABLE "route_stops" ADD COLUMN "geocode_status" varchar(30) DEFAULT 'pending' NOT NULL;
ALTER TABLE "route_stops" ADD COLUMN "geocode_source" varchar(50);
ALTER TABLE "route_stops" ADD COLUMN "geocoded_at" timestamp;
