import { and, eq, sql } from "drizzle-orm";
import { paymentBatchItems, paymentBatches } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type ClosePaymentBatchResult =
  | {
      ok: true;
      batch: {
        id: string;
        status: "closed";
        closedAt: Date | string | null;
        closedByUserId: string | null;
      };
    }
  | {
      ok: false;
      error: "NOT_FOUND" | "INVALID_STATUS" | "ORDER_INCOMPLETE";
      message: string;
    };

export async function closePaymentBatch(params: {
  databaseUrl: string;
  batchId: string;
  actorUserId: string;
}): Promise<ClosePaymentBatchResult> {
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

    if (batch.status !== "open") {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: `Lote não pode ser fechado (status=${batch.status})`
      };
    }

    const itemRows = await tx
      .select({ id: paymentBatchItems.id })
      .from(paymentBatchItems)
      .where(eq(paymentBatchItems.paymentBatchId, params.batchId))
      .limit(1);

    if (!itemRows[0]) {
      return {
        ok: false,
        error: "ORDER_INCOMPLETE",
        message: "Lote sem itens não pode ser fechado"
      };
    }

    const updated = await tx
      .update(paymentBatches)
      .set({
        status: "closed",
        closedAt: sql`now()`,
        closedByUserId: params.actorUserId,
        updatedAt: sql`now()`
      })
      .where(and(eq(paymentBatches.id, params.batchId), eq(paymentBatches.status, "open")))
      .returning({
        id: paymentBatches.id,
        status: paymentBatches.status,
        closedAt: paymentBatches.closedAt,
        closedByUserId: paymentBatches.closedByUserId
      });

    if (!updated[0]) {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: "Lote mudou de status durante o fechamento"
      };
    }

    return {
      ok: true,
      batch: {
        id: updated[0]!.id,
        status: "closed",
        closedAt: updated[0]!.closedAt,
        closedByUserId: updated[0]!.closedByUserId
      }
    };
  });
}
