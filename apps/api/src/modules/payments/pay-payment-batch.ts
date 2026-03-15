import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  orderEvents,
  orders,
  paymentBatchItems,
  paymentBatches
} from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type PayPaymentBatchResult =
  | {
      ok: true;
      batch: {
        id: string;
        status: "paid";
        paidAt: Date | string | null;
        paidByUserId: string | null;
      };
    }
  | {
      ok: false;
      error: "NOT_FOUND" | "INVALID_STATUS" | "ORDER_INCOMPLETE";
      message: string;
      details?: { orderIds?: string[] };
    };

export async function payPaymentBatch(params: {
  databaseUrl: string;
  batchId: string;
  actorUserId: string;
}): Promise<PayPaymentBatchResult> {
  const { db } = getDb(params.databaseUrl);

  return db.transaction(async (tx) => {
    const batchRows = await tx
      .select({
        id: paymentBatches.id,
        status: paymentBatches.status
      })
      .from(paymentBatches)
      .where(eq(paymentBatches.id, params.batchId))
      .limit(1);

    const batch = batchRows[0];
    if (!batch) {
      return { ok: false, error: "NOT_FOUND", message: "Lote não encontrado" };
    }

    if (batch.status !== "closed") {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: `Lote não pode ser marcado como pago (status=${batch.status})`
      };
    }

    const items = await tx
      .select({
        id: paymentBatchItems.id,
        orderId: paymentBatchItems.orderId
      })
      .from(paymentBatchItems)
      .where(eq(paymentBatchItems.paymentBatchId, params.batchId));

    if (items.length === 0) {
      return {
        ok: false,
        error: "ORDER_INCOMPLETE",
        message: "Lote sem itens não pode ser pago"
      };
    }

    const orderIds = items.map((item) => item.orderId);
    const orderRows = await tx
      .select({
        id: orders.id,
        status: orders.status
      })
      .from(orders)
      .where(inArray(orders.id, orderIds));

    const invalidOrderIds = orderRows
      .filter((row) => row.status !== "batched")
      .map((row) => row.id);

    if (invalidOrderIds.length > 0) {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: "Uma ou mais orders do lote não estão em status batched",
        details: { orderIds: invalidOrderIds }
      };
    }

    const updatedBatch = await tx
      .update(paymentBatches)
      .set({
        status: "paid",
        paidAt: sql`now()`,
        paidByUserId: params.actorUserId,
        updatedAt: sql`now()`
      })
      .where(and(eq(paymentBatches.id, params.batchId), eq(paymentBatches.status, "closed")))
      .returning({
        id: paymentBatches.id,
        status: paymentBatches.status,
        paidAt: paymentBatches.paidAt,
        paidByUserId: paymentBatches.paidByUserId
      });

    if (!updatedBatch[0]) {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: "Lote mudou de status durante a marcação de pagamento"
      };
    }

    await tx
      .update(orders)
      .set({
        status: "paid",
        paidAt: sql`now()`,
        updatedAt: sql`now()`
      })
      .where(and(inArray(orders.id, orderIds), eq(orders.status, "batched")));

    for (const item of items) {
      await tx.insert(orderEvents).values({
        id: randomUUID(),
        orderId: item.orderId,
        eventType: "paid",
        fromStatus: "batched",
        toStatus: "paid",
        performedByUserId: params.actorUserId,
        metadata: {
          paymentBatchId: params.batchId,
          paymentBatchItemId: item.id
        }
      });
    }

    return {
      ok: true,
      batch: {
        id: updatedBatch[0]!.id,
        status: "paid",
        paidAt: updatedBatch[0]!.paidAt,
        paidByUserId: updatedBatch[0]!.paidByUserId
      }
    };
  });
}
