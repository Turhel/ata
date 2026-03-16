import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

type DbBundle = {
  pool: Pool;
  db: ReturnType<typeof drizzle>;
};

const dbByUrl = new Map<string, DbBundle>();

export function getDb(databaseUrl: string) {
  const cached = dbByUrl.get(databaseUrl);
  if (cached) {
    return cached;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  const bundle = { pool, db };
  dbByUrl.set(databaseUrl, bundle);

  return bundle;
}

export async function pingDb(databaseUrl: string) {
  const { pool } = getDb(databaseUrl);
  await pool.query("select 1 as ok");
}

export async function closeDb(databaseUrl: string) {
  const existing = dbByUrl.get(databaseUrl);
  if (!existing) return;

  dbByUrl.delete(databaseUrl);
  await existing.pool.end();
}

export async function closeAllDbs() {
  const urls = [...dbByUrl.keys()];
  await Promise.all(urls.map((url) => closeDb(url)));
}
