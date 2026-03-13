import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { orderEvents, orders } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type SubmitOrderResult =
  | { ok: true; order: { id: string; status: string; submittedAt: Date | string | null } }
  | {
      ok: false;
      error: "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATUS" | "ORDER_CANCELLED" | "ORDER_INCOMPLETE";
      message: string;
      details?: { missingFields?: string[] };
    };

function isBlank(value: unknown) {
  return typeof value !== "string" || value.trim().length === 0;
}

export async function submitOrder(params: {
  databaseUrl: string;
  orderId: string;
  actorUserId: string;
}): Promise<SubmitOrderResult> {
  const { db } = getDb(params.databaseUrl);

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: orders.id,
        externalOrderCode: orders.externalOrderCode,
        sourceStatus: orders.sourceStatus,
        status: orders.status,
        assistantUserId: orders.assistantUserId,
        workTypeId: orders.workTypeId,
        addressLine1: orders.addressLine1,
        city: orders.city,
        state: orders.state
      })
      .from(orders)
      .where(eq(orders.id, params.orderId))
      .limit(1);

    const row = existing[0];
    if (!row) {
      return { ok: false, error: "NOT_FOUND", message: "Order não encontrada" };
    }

    if (row.assistantUserId !== params.actorUserId) {
      return { ok: false, error: "FORBIDDEN", message: "Você não é o assistant responsável por esta order" };
    }

    if (row.status === "cancelled" || row.sourceStatus === "Canceled") {
      return { ok: false, error: "ORDER_CANCELLED", message: "Order cancelada não pode ser enviada" };
    }

    if (row.status !== "in_progress" && row.status !== "follow_up") {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: `Order não pode ser enviada para revisão (status=${row.status})`
      };
    }

    const missingFields: string[] = [];

    if (isBlank(row.externalOrderCode)) missingFields.push("external_order_code");
    if (!row.workTypeId) missingFields.push("work_type_id");
    if (isBlank(row.addressLine1)) missingFields.push("address_line_1");
    if (isBlank(row.city)) missingFields.push("city");
    if (isBlank(row.state)) missingFields.push("state");

    if (missingFields.length > 0) {
      return {
        ok: false,
        error: "ORDER_INCOMPLETE",
        message: `Order incompleta para envio (faltando: ${missingFields.join(", ")})`,
        details: { missingFields }
      };
    }

    const eventType = row.status === "follow_up" ? "resubmitted" : "submitted";

    const updated = await tx
      .update(orders)
      .set({
        submittedAt: sql`now()`,
        status: "submitted",
        updatedAt: sql`now()`
      })
      .where(
        and(
          eq(orders.id, params.orderId),
          eq(orders.assistantUserId, params.actorUserId),
          eq(orders.status, row.status)
        )
      )
      .returning({ id: orders.id, status: orders.status, submittedAt: orders.submittedAt });

    if (!updated[0]) {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: "Order mudou de status durante o submit (concorrência)"
      };
    }

    await tx.insert(orderEvents).values({
      id: randomUUID(),
      orderId: params.orderId,
      eventType,
      fromStatus: row.status,
      toStatus: "submitted",
      performedByUserId: params.actorUserId,
      metadata: { actorUserId: params.actorUserId }
    });

    return { ok: true, order: updated[0] };
  });
}
