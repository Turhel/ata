import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let pool: Pool | undefined;
let db: ReturnType<typeof drizzle> | undefined;

export function getDb(databaseUrl: string) {
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl });
  }

  if (!db) {
    db = drizzle(pool);
  }

  return { pool, db };
}

export async function pingDb(databaseUrl: string) {
  const { pool } = getDb(databaseUrl);
  await pool.query("select 1 as ok");
}

