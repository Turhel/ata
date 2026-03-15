import { desc } from "drizzle-orm";
import { paymentBatches } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function listPaymentBatches(databaseUrl: string) {
  const { db } = getDb(databaseUrl);

  return db
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
    .orderBy(desc(paymentBatches.createdAt));
}
