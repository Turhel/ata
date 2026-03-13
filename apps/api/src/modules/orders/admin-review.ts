import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { orderEvents, orders } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

function isBlank(value: unknown) {
  return typeof value !== "string" || value.trim().length === 0;
}

function validateApproveMinimum(row: {
  externalOrderCode: string;
  workTypeId: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
}) {
  const missingFields: string[] = [];

  if (isBlank(row.externalOrderCode)) missingFields.push("external_order_code");
  if (!row.workTypeId) missingFields.push("work_type_id");
  if (isBlank(row.addressLine1)) missingFields.push("address_line_1");
  if (isBlank(row.city)) missingFields.push("city");
  if (isBlank(row.state)) missingFields.push("state");

  return missingFields;
}

export type FollowUpResult =
  | { ok: true; order: { id: string; status: string; followUpAt: Date | string | null } }
  | {
      ok: false;
      error: "NOT_FOUND" | "INVALID_STATUS" | "ORDER_INCOMPLETE";
      message: string;
      details?: { missingFields?: string[] };
    };

export async function requestFollowUp(params: {
  databaseUrl: string;
  orderId: string;
  actorUserId: string;
  reason: string;
}): Promise<FollowUpResult> {
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

    if (row.status !== "submitted") {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: `Order não pode receber follow-up (status=${row.status})`
      };
    }

    const updated = await tx
      .update(orders)
      .set({
        status: "follow_up",
        followUpAt: sql`now()`,
        updatedAt: sql`now()`
      })
      .where(and(eq(orders.id, params.orderId), eq(orders.status, "submitted")))
      .returning({ id: orders.id, status: orders.status, followUpAt: orders.followUpAt });

    if (!updated[0]) {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: "Order mudou de status durante o follow-up (concorrência)"
      };
    }

    await tx.insert(orderEvents).values({
      id: randomUUID(),
      orderId: params.orderId,
      eventType: "follow_up_requested",
      fromStatus: "submitted",
      toStatus: "follow_up",
      performedByUserId: params.actorUserId,
      reason
    });

    return { ok: true, order: updated[0] };
  });
}

export type RejectResult =
  | { ok: true; order: { id: string; status: string; rejectedAt: Date | string | null } }
  | {
      ok: false;
      error: "NOT_FOUND" | "INVALID_STATUS" | "ORDER_INCOMPLETE";
      message: string;
      details?: { missingFields?: string[] };
    };

export async function rejectOrder(params: {
  databaseUrl: string;
  orderId: string;
  actorUserId: string;
  reason: string;
}): Promise<RejectResult> {
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

    if (row.status !== "submitted" && row.status !== "follow_up") {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: `Order não pode ser rejeitada (status=${row.status})`
      };
    }

    const fromStatus = row.status;

    const updated = await tx
      .update(orders)
      .set({
        status: "rejected",
        rejectedAt: sql`now()`,
        updatedAt: sql`now()`
      })
      .where(and(eq(orders.id, params.orderId), eq(orders.status, fromStatus)))
      .returning({ id: orders.id, status: orders.status, rejectedAt: orders.rejectedAt });

    if (!updated[0]) {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: "Order mudou de status durante o reject (concorrência)"
      };
    }

    await tx.insert(orderEvents).values({
      id: randomUUID(),
      orderId: params.orderId,
      eventType: "rejected",
      fromStatus,
      toStatus: "rejected",
      performedByUserId: params.actorUserId,
      reason
    });

    return { ok: true, order: updated[0] };
  });
}

export type ApproveResult =
  | { ok: true; order: { id: string; status: string; approvedAt: Date | string | null } }
  | {
      ok: false;
      error: "NOT_FOUND" | "INVALID_STATUS" | "ORDER_CANCELLED" | "ORDER_INCOMPLETE";
      message: string;
      details?: { missingFields?: string[] };
    };

export async function approveOrder(params: {
  databaseUrl: string;
  orderId: string;
  actorUserId: string;
}): Promise<ApproveResult> {
  const { db } = getDb(params.databaseUrl);

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: orders.id,
        externalOrderCode: orders.externalOrderCode,
        sourceStatus: orders.sourceStatus,
        status: orders.status,
        workTypeId: orders.workTypeId,
        addressLine1: orders.addressLine1,
        city: orders.city,
        state: orders.state
      })
      .from(orders)
      .where(eq(orders.id, params.orderId))
      .limit(1);

    const row = existing[0];
    if (!row) return { ok: false, error: "NOT_FOUND", message: "Order não encontrada" };

    if (row.status === "cancelled" || row.sourceStatus === "Canceled") {
      return { ok: false, error: "ORDER_CANCELLED", message: "Order cancelada não pode ser aprovada" };
    }

    if (row.status !== "submitted") {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: `Order não pode ser aprovada (status=${row.status})`
      };
    }

    const missingFields = validateApproveMinimum(row);
    if (missingFields.length > 0) {
      return {
        ok: false,
        error: "ORDER_INCOMPLETE",
        message: `Order incompleta para aprovação (faltando: ${missingFields.join(", ")})`,
        details: { missingFields }
      };
    }

    const updated = await tx
      .update(orders)
      .set({
        status: "approved",
        approvedAt: sql`now()`,
        updatedAt: sql`now()`
      })
      .where(and(eq(orders.id, params.orderId), eq(orders.status, "submitted")))
      .returning({ id: orders.id, status: orders.status, approvedAt: orders.approvedAt });

    if (!updated[0]) {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: "Order mudou de status durante o approve (concorrência)"
      };
    }

    await tx.insert(orderEvents).values({
      id: randomUUID(),
      orderId: params.orderId,
      eventType: "approved",
      fromStatus: "submitted",
      toStatus: "approved",
      performedByUserId: params.actorUserId
    });

    return { ok: true, order: updated[0] };
  });
}
