import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  orderEvents,
  orders,
  paymentBatchItems,
  paymentBatches,
  workTypes
} from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

function parseDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function parseAmountToCents(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(",", ".").trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

function formatCents(cents: number) {
  const negative = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${negative}${whole}.${fraction}`;
}

function isBlank(value: unknown) {
  return typeof value !== "string" || value.trim().length === 0;
}

export function parseCreatePaymentBatchInput(body: unknown) {
  const payload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const referenceCode = typeof payload.referenceCode === "string" ? payload.referenceCode.trim() : "";
  const periodStart = parseDate(payload.periodStart);
  const periodEnd = parseDate(payload.periodEnd);
  const rawOrderIds = Array.isArray(payload.orderIds)
    ? payload.orderIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const orderIds = [...new Set(rawOrderIds)];
  const notes = typeof payload.notes === "string" ? payload.notes.trim() || null : null;

  if (!referenceCode || !periodStart || !periodEnd || orderIds.length === 0) {
    return {
      ok: false as const,
      error: "BAD_REQUEST" as const,
      message: "Payload inválido: referenceCode, periodStart, periodEnd e orderIds são obrigatórios"
    };
  }

  if (periodStart > periodEnd) {
    return {
      ok: false as const,
      error: "BAD_REQUEST" as const,
      message: "Payload inválido: periodStart não pode ser maior que periodEnd"
    };
  }

  return {
    ok: true as const,
    referenceCode,
    periodStart,
    periodEnd,
    orderIds,
    notes
  };
}

export type CreatePaymentBatchResult =
  | {
      ok: true;
      batch: {
        id: string;
        referenceCode: string;
        status: "open";
        totalItems: number;
        totalAmount: string;
      };
    }
  | {
      ok: false;
      error: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT" | "ORDER_INCOMPLETE" | "INVALID_STATUS";
      message: string;
      details?: { orderIds?: string[]; missingFields?: string[] };
    };

export async function createPaymentBatch(params: {
  databaseUrl: string;
  actorUserId: string;
  body: unknown;
}): Promise<CreatePaymentBatchResult> {
  const input = parseCreatePaymentBatchInput(params.body);
  if (!input.ok) {
    return input;
  }

  const { referenceCode, periodStart, periodEnd, orderIds, notes } = input;
  const { db } = getDb(params.databaseUrl);

  return db.transaction(async (tx) => {
    const existingBatch = await tx
      .select({ id: paymentBatches.id })
      .from(paymentBatches)
      .where(eq(paymentBatches.referenceCode, referenceCode))
      .limit(1);

    if (existingBatch[0]) {
      return {
        ok: false,
        error: "CONFLICT",
        message: "Já existe um lote com este referenceCode"
      };
    }

    const orderRows = await tx
      .select({
        id: orders.id,
        externalOrderCode: orders.externalOrderCode,
        sourceStatus: orders.sourceStatus,
        status: orders.status,
        paymentLocked: orders.paymentLocked,
        assistantUserId: orders.assistantUserId,
        inspectorAccountId: orders.inspectorAccountId,
        assignedInspectorId: orders.assignedInspectorId,
        clientId: orders.clientId,
        workTypeId: orders.workTypeId,
        addressLine1: orders.addressLine1,
        city: orders.city,
        state: orders.state,
        workTypeDefaultAssistant: workTypes.defaultPaymentAmountAssistant,
        workTypeDefaultInspector: workTypes.defaultPaymentAmountInspector
      })
      .from(orders)
      .leftJoin(workTypes, eq(orders.workTypeId, workTypes.id))
      .where(inArray(orders.id, orderIds));

    const foundIds = new Set(orderRows.map((row) => row.id));
    const missingOrderIds = orderIds.filter((orderId) => !foundIds.has(orderId));
    if (missingOrderIds.length > 0) {
      return {
        ok: false,
        error: "NOT_FOUND",
        message: "Uma ou mais orders não foram encontradas",
        details: { orderIds: missingOrderIds }
      };
    }

    const invalidStatusIds: string[] = [];
    const incompleteIds: string[] = [];
    const missingFields = new Set<string>();

    for (const row of orderRows) {
      if (row.status !== "approved" || row.sourceStatus === "Canceled" || row.paymentLocked) {
        invalidStatusIds.push(row.id);
        continue;
      }

      const rowMissingFields: string[] = [];
      if (!row.workTypeId) rowMissingFields.push("work_type_id");
      if (isBlank(row.addressLine1)) rowMissingFields.push("address_line_1");
      if (isBlank(row.city)) rowMissingFields.push("city");
      if (isBlank(row.state)) rowMissingFields.push("state");
      if (parseAmountToCents(row.workTypeDefaultAssistant) == null) {
        rowMissingFields.push("default_payment_amount_assistant");
      }
      if (parseAmountToCents(row.workTypeDefaultInspector) == null) {
        rowMissingFields.push("default_payment_amount_inspector");
      }

      if (rowMissingFields.length > 0) {
        incompleteIds.push(row.id);
        for (const field of rowMissingFields) missingFields.add(field);
      }
    }

    if (invalidStatusIds.length > 0) {
      return {
        ok: false,
        error: "INVALID_STATUS",
        message: "Uma ou mais orders não estão elegíveis para lote",
        details: { orderIds: invalidStatusIds }
      };
    }

    if (incompleteIds.length > 0) {
      return {
        ok: false,
        error: "ORDER_INCOMPLETE",
        message: "Uma ou mais orders estão sem dados financeiros mínimos",
        details: { orderIds: incompleteIds, missingFields: [...missingFields] }
      };
    }

    const batchId = randomUUID();
    let totalAmountCents = 0;

    await tx.insert(paymentBatches).values({
      id: batchId,
      referenceCode,
      status: "open",
      periodStart,
      periodEnd,
      totalItems: orderRows.length,
      totalAmount: "0",
      createdByUserId: params.actorUserId,
      notes
    });

    for (const row of orderRows) {
      const amountAssistantCents = parseAmountToCents(row.workTypeDefaultAssistant)!;
      const amountInspectorCents = parseAmountToCents(row.workTypeDefaultInspector)!;
      const itemId = randomUUID();

      totalAmountCents += amountAssistantCents + amountInspectorCents;

      await tx.insert(paymentBatchItems).values({
        id: itemId,
        paymentBatchId: batchId,
        orderId: row.id,
        assistantUserId: row.assistantUserId,
        inspectorId: row.assignedInspectorId,
        inspectorAccountId: row.inspectorAccountId,
        clientId: row.clientId,
        workTypeId: row.workTypeId,
        externalOrderCode: row.externalOrderCode,
        amountAssistant: formatCents(amountAssistantCents),
        amountInspector: formatCents(amountInspectorCents),
        quantity: 1,
        snapshotPayload: {
          orderId: row.id,
          externalOrderCode: row.externalOrderCode,
          assistantUserId: row.assistantUserId,
          inspectorId: row.assignedInspectorId,
          inspectorAccountId: row.inspectorAccountId,
          clientId: row.clientId,
          workTypeId: row.workTypeId,
          amountAssistant: formatCents(amountAssistantCents),
          amountInspector: formatCents(amountInspectorCents)
        }
      });

      await tx
        .update(orders)
        .set({
          status: "batched",
          batchedAt: sql`now()`,
          paymentLocked: true,
          currentPaymentBatchItemId: itemId,
          updatedAt: sql`now()`
        })
        .where(and(eq(orders.id, row.id), eq(orders.status, "approved")));

      await tx.insert(orderEvents).values({
        id: randomUUID(),
        orderId: row.id,
        eventType: "batched",
        fromStatus: "approved",
        toStatus: "batched",
        performedByUserId: params.actorUserId,
        metadata: {
          paymentBatchId: batchId,
          paymentBatchItemId: itemId,
          referenceCode
        }
      });
    }

    const totalAmount = formatCents(totalAmountCents);

    await tx
      .update(paymentBatches)
      .set({
        totalItems: orderRows.length,
        totalAmount,
        updatedAt: sql`now()`
      })
      .where(eq(paymentBatches.id, batchId));

    return {
      ok: true,
      batch: {
        id: batchId,
        referenceCode,
        status: "open",
        totalItems: orderRows.length,
        totalAmount
      }
    };
  });
}
