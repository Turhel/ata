import { and, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { orderEvents, orders } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type ClaimOrderResult =
  | { ok: true; order: { id: string; status: string; assistantUserId: string | null; claimedAt: Date | string | null } }
  | { ok: false; error: "NOT_FOUND" | "INVALID_STATUS" | "ALREADY_CLAIMED"; message: string };

export async function claimOrder(params: { databaseUrl: string; orderId: string; actorUserId: string }): Promise<ClaimOrderResult> {
  const { db } = getDb(params.databaseUrl);

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: orders.id, status: orders.status, assistantUserId: orders.assistantUserId })
      .from(orders)
      .where(eq(orders.id, params.orderId))
      .limit(1);

    const row = existing[0];
    if (!row) {
      return { ok: false, error: "NOT_FOUND", message: "Order não encontrada" };
    }

    if (row.status !== "available") {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: `Order não está disponível para claim (status=${row.status})`
      };
    }

    const updated = await tx
      .update(orders)
      .set({
        assistantUserId: params.actorUserId,
        claimedAt: sql`now()`,
        status: "in_progress",
        updatedAt: sql`now()`
      })
      .where(and(eq(orders.id, params.orderId), eq(orders.status, "available"), isNull(orders.assistantUserId)))
      .returning({ id: orders.id, status: orders.status, assistantUserId: orders.assistantUserId, claimedAt: orders.claimedAt });

    if (!updated[0]) {
      return {
        ok: false,
        error: "ALREADY_CLAIMED",
        message: "Order já foi assumida por outro usuário (concorrência)"
      };
    }

    await tx.insert(orderEvents).values({
      id: randomUUID(),
      orderId: params.orderId,
      eventType: "claimed",
      fromStatus: "available",
      toStatus: "in_progress",
      performedByUserId: params.actorUserId,
      metadata: { actorUserId: params.actorUserId }
    });

    return { ok: true, order: updated[0] };
  });
}
