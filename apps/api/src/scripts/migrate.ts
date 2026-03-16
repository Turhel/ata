import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  baselineExistingMigrations,
  ensureDrizzleMigrationsTable,
  getMigrationsFolder,
  getRequiredDatabaseUrl,
  hasExistingOperationalSchema
} from "./_db-utils.js";

const shouldBaselineIfExisting = process.argv.includes("--baseline-if-existing");

async function main() {
  const databaseUrl = getRequiredDatabaseUrl();
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    await ensureDrizzleMigrationsTable(pool);

    if (shouldBaselineIfExisting) {
      const hasExistingSchema = await hasExistingOperationalSchema(pool);

      if (hasExistingSchema) {
        const baselined = await baselineExistingMigrations(pool);
        if (baselined > 0) {
          console.log(`Baseline aplicado: ${baselined} migrations marcadas como já existentes.`);
        }
      }
    }

    await migrate(db, { migrationsFolder: getMigrationsFolder() });
    console.log("Migrations operacionais concluídas.");
  } finally {
    await pool.end();
  }
}

await main();
