import { and, count, desc, eq, ilike } from "drizzle-orm";
import { paymentBatches } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function listPaymentBatches(params: {
  databaseUrl: string;
  status?: "open" | "closed" | "paid" | "cancelled";
  search?: string | null;
  page: number;
  pageSize: number;
  offset: number;
}) {
  const { db } = getDb(params.databaseUrl);
  const conditions: any[] = [];

  if (params.status) {
    conditions.push(eq(paymentBatches.status, params.status));
  }

  if (params.search) {
    conditions.push(ilike(paymentBatches.referenceCode, `%${params.search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rowsQuery = db
    .select({
      id: paymentBatches.id,
      referenceCode: paymentBatches.referenceCode,
      status: paymentBatches.status,
      periodStart: paymentBatches.periodStart,
      periodEnd: paymentBatches.periodEnd,
      totalItems: paymentBatches.totalItems,
      totalAmount: paymentBatches.totalAmount,
      createdByUserId: paymentBatches.createdByUserId,
      closedByUserId: paymentBatches.closedByUserId,
      paidByUserId: paymentBatches.paidByUserId,
      closedAt: paymentBatches.closedAt,
      paidAt: paymentBatches.paidAt,
      notes: paymentBatches.notes,
      createdAt: paymentBatches.createdAt,
      updatedAt: paymentBatches.updatedAt
    })
    .from(paymentBatches)
    .orderBy(desc(paymentBatches.createdAt))
    .limit(params.pageSize)
    .offset(params.offset);

  const totalQuery = db.select({ total: count() }).from(paymentBatches);

  const [rows, totalRows] = await Promise.all([
    whereClause ? rowsQuery.where(whereClause) : rowsQuery,
    whereClause ? totalQuery.where(whereClause) : totalQuery
  ]);

  return {
    batches: rows,
    total: totalRows[0]?.total ?? 0
  };
}
