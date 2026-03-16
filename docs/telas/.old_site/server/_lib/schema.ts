import type { Pool } from "pg";

type CacheKey = `${string}.${string}`;

const columnExistsCache = new Map<CacheKey, boolean>();
const tableExistsCache = new Map<string, boolean>();

export async function hasColumn(
  db: Pool,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const key: CacheKey = `${tableName}.${columnName}`;
  const cached = columnExistsCache.get(key);
  if (cached !== undefined) return cached;

  const r = await db.query(
    `
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
      limit 1
    `,
    [tableName, columnName],
  );
  const exists = (r.rows?.length ?? 0) > 0;
  columnExistsCache.set(key, exists);
  return exists;
}

export async function hasTable(db: Pool, tableName: string): Promise<boolean> {
  const key = tableName;
  const cached = tableExistsCache.get(key);
  if (cached !== undefined) return cached;

  const r = await db.query(
    `
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = $1
      limit 1
    `,
    [tableName],
  );
  const exists = (r.rows?.length ?? 0) > 0;
  tableExistsCache.set(key, exists);
  return exists;
}
