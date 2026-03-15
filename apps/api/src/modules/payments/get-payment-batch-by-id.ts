import { asc, eq } from "drizzle-orm";
import { paymentBatchItems, paymentBatches } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function getPaymentBatchById(params: { databaseUrl: string; batchId: string }) {
  const { db } = getDb(params.databaseUrl);

  const batchRows = await db
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
    .where(eq(paymentBatches.id, params.batchId))
    .limit(1);

  const batch = batchRows[0] ?? null;
  if (!batch) return null;

  const items = await db
    .select({
      id: paymentBatchItems.id,
      paymentBatchId: paymentBatchItems.paymentBatchId,
      orderId: paymentBatchItems.orderId,
      assistantUserId: paymentBatchItems.assistantUserId,
      inspectorId: paymentBatchItems.inspectorId,
      inspectorAccountId: paymentBatchItems.inspectorAccountId,
      clientId: paymentBatchItems.clientId,
      workTypeId: paymentBatchItems.workTypeId,
      externalOrderCode: paymentBatchItems.externalOrderCode,
      amountAssistant: paymentBatchItems.amountAssistant,
      amountInspector: paymentBatchItems.amountInspector,
      quantity: paymentBatchItems.quantity,
      snapshotPayload: paymentBatchItems.snapshotPayload,
      createdAt: paymentBatchItems.createdAt,
      updatedAt: paymentBatchItems.updatedAt
    })
    .from(paymentBatchItems)
    .where(eq(paymentBatchItems.paymentBatchId, params.batchId))
    .orderBy(asc(paymentBatchItems.createdAt));

  return { batch, items };
}
