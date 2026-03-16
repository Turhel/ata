ALTER TABLE "inspectors" ADD COLUMN "departure_city" varchar(120);
ALTER TABLE "routes" ADD COLUMN "origin_city" varchar(120);
ALTER TABLE "routes" ADD COLUMN "optimization_mode" varchar(50) DEFAULT 'heuristic_city_zip' NOT NULL;
