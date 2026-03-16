import "dotenv/config";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { readMigrationFiles } from "drizzle-orm/migrator";

const currentDir = dirname(fileURLToPath(import.meta.url));

export function getMigrationsFolder() {
  return resolve(currentDir, "../../drizzle");
}

export function getRequiredDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não definido");
  }

  return databaseUrl;
}

export function deriveTestDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const databaseName = url.pathname.replace(/^\//, "");
  if (!databaseName) {
    throw new Error("DATABASE_URL inválido: nome do banco ausente");
  }

  url.pathname = `/${databaseName}_test`;
  return url.toString();
}

export function getAdminDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  url.pathname = "/postgres";
  return url.toString();
}

export async function ensureDrizzleMigrationsTable(pool: Pool) {
  await pool.query('create schema if not exists "drizzle"');
  await pool.query(`
    create table if not exists "drizzle"."__drizzle_migrations" (
      id serial primary key,
      hash text not null,
      created_at numeric
    )
  `);
}

export async function ensureSchemaExists(connectionString: string, schemaName: string) {
  const pool = new Pool({ connectionString });

  try {
    await pool.query(`create schema if not exists "${schemaName}"`);
  } finally {
    await pool.end();
  }
}

export async function countDrizzleMigrations(pool: Pool) {
  const result = await pool.query(
    'select count(*)::int as count from "drizzle"."__drizzle_migrations"'
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function getAppliedDrizzleMigrationHashes(pool: Pool) {
  const result = await pool.query<{ hash: string }>(
    'select hash from "drizzle"."__drizzle_migrations"'
  );

  return new Set(result.rows.map((row) => row.hash));
}

export async function hasExistingOperationalSchema(pool: Pool) {
  const result = await pool.query(`
    select count(*)::int as count
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'users',
        'user_roles',
        'team_assignments',
        'orders',
        'order_events',
        'clients',
        'work_types',
        'payment_batches',
        'routes'
      )
  `);

  return Number(result.rows[0]?.count ?? 0) > 0;
}

export async function baselineExistingMigrations(pool: Pool) {
  const migrations = readMigrationFiles({ migrationsFolder: getMigrationsFolder() });
  const appliedHashes = await getAppliedDrizzleMigrationHashes(pool);
  let insertedCount = 0;

  for (const migration of migrations) {
    if (appliedHashes.has(migration.hash)) {
      continue;
    }

    await pool.query(
      'insert into "drizzle"."__drizzle_migrations" ("hash", "created_at") values ($1, $2)',
      [migration.hash, String(migration.folderMillis)]
    );
    insertedCount += 1;
  }

  return insertedCount;
}

export function computeSqlFileHash(contents: string) {
  return createHash("sha256").update(contents).digest("hex");
}

export async function recreateDatabase(targetDatabaseUrl: string) {
  const adminPool = new Pool({ connectionString: getAdminDatabaseUrl(targetDatabaseUrl) });

  try {
    const targetUrl = new URL(targetDatabaseUrl);
    const databaseName = targetUrl.pathname.replace(/^\//, "");
    if (!databaseName) {
      throw new Error("TEST_DATABASE_URL inválido: nome do banco ausente");
    }

    await adminPool.query(
      `
        select pg_terminate_backend(pid)
        from pg_stat_activity
        where datname = $1
          and pid <> pg_backend_pid()
      `,
      [databaseName]
    );

    await adminPool.query(`drop database if exists "${databaseName}"`);
    await adminPool.query(`create database "${databaseName}"`);
  } finally {
    await adminPool.end();
  }
}
