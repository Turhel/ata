import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { orderEvents, orders } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type ReturnToPoolResult =
  | {
      ok: true;
      order: { id: string; status: string; assistantUserId: string | null; returnedToPoolAt: Date | string | null };
    }
  | {
      ok: false;
      error: "NOT_FOUND" | "INVALID_STATUS" | "ORDER_INCOMPLETE";
      message: string;
      details?: { missingFields?: string[] };
    };

export async function returnToPool(params: {
  databaseUrl: string;
  orderId: string;
  actorUserId: string;
  reason: string;
}): Promise<ReturnToPoolResult> {
  const { db } = getDb(params.databaseUrl);

  return db.transaction(async (tx) => {
    const reason = params.reason?.trim() ?? "";
    if (!reason) {
      return {
        ok: false,
        error: "ORDER_INCOMPLETE",
        message: "Motivo é obrigatório",
        details: { missingFields: ["reason"] }
      };
    }

    const existing = await tx
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.id, params.orderId))
      .limit(1);

    const row = existing[0];
    if (!row) return { ok: false, error: "NOT_FOUND", message: "Order não encontrada" };

    if (row.status !== "rejected") {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: `Order não pode voltar ao pool (status=${row.status})`
      };
    }

    const updated = await tx
      .update(orders)
      .set({
        status: "available",
        returnedToPoolAt: sql`now()`,
        assistantUserId: null,
        updatedAt: sql`now()`
      })
      .where(and(eq(orders.id, params.orderId), eq(orders.status, "rejected")))
      .returning({
        id: orders.id,
        status: orders.status,
        assistantUserId: orders.assistantUserId,
        returnedToPoolAt: orders.returnedToPoolAt
      });

    if (!updated[0]) {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: "Order mudou de status durante o retorno ao pool (concorrência)"
      };
    }

    await tx.insert(orderEvents).values({
      id: randomUUID(),
      orderId: params.orderId,
      eventType: "returned_to_pool",
      fromStatus: "rejected",
      toStatus: "available",
      performedByUserId: params.actorUserId,
      reason
    });

    return { ok: true, order: updated[0] };
  });
}

