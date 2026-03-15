import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { users } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function listOperationalUsers(params: {
  databaseUrl: string;
  status?: "pending" | "active" | "blocked" | "inactive";
  search?: string | null;
  page: number;
  pageSize: number;
  offset: number;
}) {
  const { db } = getDb(params.databaseUrl);
  const conditions: any[] = [];

  if (params.status) {
    conditions.push(eq(users.status, params.status));
  }

  if (params.search) {
    const pattern = `%${params.search}%`;
    conditions.push(or(ilike(users.email, pattern), ilike(users.fullName, pattern))!);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rowsQuery = db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      status: users.status,
      authUserId: users.authUserId
    })
    .from(users)
    .orderBy(asc(users.email))
    .limit(params.pageSize)
    .offset(params.offset);

  const totalQuery = db.select({ total: count() }).from(users);

  const [rows, totalRows] = await Promise.all([
    whereClause ? rowsQuery.where(whereClause) : rowsQuery,
    whereClause ? totalQuery.where(whereClause) : totalQuery
  ]);

  return {
    users: rows,
    total: totalRows[0]?.total ?? 0
  };
}
