import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { orders } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function listOrders(params: {
  databaseUrl: string;
  status?:
    | "available"
    | "in_progress"
    | "submitted"
    | "follow_up"
    | "rejected"
    | "approved"
    | "batched"
    | "paid"
    | "cancelled"
    | "archived"
    | null;
  search?: string | null;
  page: number;
  pageSize: number;
  offset: number;
}) {
  const { db } = getDb(params.databaseUrl);
  const conditions: any[] = [];

  if (params.status) {
    conditions.push(eq(orders.status, params.status));
  }

  if (params.search) {
    const pattern = `%${params.search}%`;
    conditions.push(
      or(
        ilike(orders.externalOrderCode, pattern),
        ilike(orders.residentName, pattern),
        ilike(orders.city, pattern),
        ilike(orders.state, pattern)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rowsQuery = db
    .select({
      id: orders.id,
      externalOrderCode: orders.externalOrderCode,
      sourceStatus: orders.sourceStatus,
      status: orders.status,
      residentName: orders.residentName,
      city: orders.city,
      state: orders.state,
      availableDate: orders.availableDate,
      deadlineDate: orders.deadlineDate,
      assistantUserId: orders.assistantUserId,
      sourceImportBatchId: orders.sourceImportBatchId,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt
    })
    .from(orders)
    .orderBy(desc(orders.updatedAt))
    .limit(params.pageSize)
    .offset(params.offset);

  const totalQuery = db.select({ total: count() }).from(orders);

  const [rows, totalRows] = await Promise.all([
    whereClause ? rowsQuery.where(whereClause) : rowsQuery,
    whereClause ? totalQuery.where(whereClause) : totalQuery
  ]);

  return {
    orders: rows,
    total: totalRows[0]?.total ?? 0
  };
}
