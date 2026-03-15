import { and, count, desc, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { orders } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type AssistantOrdersScope = "available" | "mine" | "follow-up";

export async function listOrdersForAssistant(params: {
  databaseUrl: string;
  assistantUserId: string;
  scope: AssistantOrdersScope;
  search?: string | null;
  page: number;
  pageSize: number;
  offset: number;
}) {
  const { db } = getDb(params.databaseUrl);
  const conditions: any[] = [];

  if (params.scope === "available") {
    conditions.push(eq(orders.status, "available"), ne(orders.sourceStatus, "Canceled"));
  } else if (params.scope === "follow-up") {
    conditions.push(eq(orders.assistantUserId, params.assistantUserId), eq(orders.status, "follow_up"));
  } else {
    conditions.push(
      eq(orders.assistantUserId, params.assistantUserId),
      inArray(orders.status, ["in_progress", "submitted", "follow_up"])
    );
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

  const whereClause = and(...conditions);

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
    .where(whereClause)
    .orderBy(desc(orders.updatedAt))
    .limit(params.pageSize)
    .offset(params.offset);

  const totalQuery = db.select({ total: count() }).from(orders).where(whereClause);
  const [rows, totalRows] = await Promise.all([rowsQuery, totalQuery]);

  return {
    orders: rows,
    total: totalRows[0]?.total ?? 0
  };
}
