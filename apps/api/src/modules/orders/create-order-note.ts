import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { orderNotes, orders } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

const assistantAllowedStatuses = ["in_progress", "submitted", "follow_up", "rejected"] as const;

function sanitizeNoteType(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 30);
}

function sanitizeContent(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export async function createOrderNoteAsAdminOrMaster(params: {
  databaseUrl: string;
  orderId: string;
  authorUserId: string;
  body: unknown;
}) {
  const body = (params.body && typeof params.body === "object" ? params.body : {}) as Record<string, unknown>;
  const noteType = sanitizeNoteType(body.noteType, "general");
  const content = sanitizeContent(body.content);
  const isInternal = typeof body.isInternal === "boolean" ? body.isInternal : true;

  if (!content) {
    return { ok: false as const, error: "BAD_REQUEST" as const, message: "content é obrigatório" };
  }

  const { db } = getDb(params.databaseUrl);
  const orderRows = await db.select({ id: orders.id }).from(orders).where(eq(orders.id, params.orderId)).limit(1);
  if (!orderRows[0]) {
    return { ok: false as const, error: "NOT_FOUND" as const, message: "Order não encontrada" };
  }

  const inserted = await db
    .insert(orderNotes)
    .values({
      id: randomUUID(),
      orderId: params.orderId,
      authorUserId: params.authorUserId,
      noteType,
      content,
      isInternal
    })
    .returning({
      id: orderNotes.id,
      orderId: orderNotes.orderId,
      authorUserId: orderNotes.authorUserId,
      noteType: orderNotes.noteType,
      content: orderNotes.content,
      isInternal: orderNotes.isInternal,
      createdAt: orderNotes.createdAt,
      updatedAt: orderNotes.updatedAt
    });

  return { ok: true as const, note: inserted[0]! };
}

export async function createOrderNoteAsAssistant(params: {
  databaseUrl: string;
  orderId: string;
  authorUserId: string;
  body: unknown;
}) {
  const body = (params.body && typeof params.body === "object" ? params.body : {}) as Record<string, unknown>;
  const content = sanitizeContent(body.content);

  if (!content) {
    return { ok: false as const, error: "BAD_REQUEST" as const, message: "content é obrigatório" };
  }

  const { db } = getDb(params.databaseUrl);
  const orderRows = await db
    .select({
      id: orders.id,
      status: orders.status,
      assistantUserId: orders.assistantUserId
    })
    .from(orders)
    .where(and(eq(orders.id, params.orderId), eq(orders.assistantUserId, params.authorUserId)))
    .limit(1);

  const order = orderRows[0];
  if (!order) {
    return {
      ok: false as const,
      error: "FORBIDDEN" as const,
      message: "Você não pode criar notas nesta order"
    };
  }

  if (!assistantAllowedStatuses.includes(order.status as (typeof assistantAllowedStatuses)[number])) {
    return {
      ok: false as const,
      error: "INVALID_STATUS" as const,
      message: "Assistant só pode criar nota em order própria em in_progress, submitted, follow_up ou rejected"
    };
  }

  const inserted = await db
    .insert(orderNotes)
    .values({
      id: randomUUID(),
      orderId: params.orderId,
      authorUserId: params.authorUserId,
      noteType: "operational",
      content,
      isInternal: false
    })
    .returning({
      id: orderNotes.id,
      orderId: orderNotes.orderId,
      authorUserId: orderNotes.authorUserId,
      noteType: orderNotes.noteType,
      content: orderNotes.content,
      isInternal: orderNotes.isInternal,
      createdAt: orderNotes.createdAt,
      updatedAt: orderNotes.updatedAt
    });

  return { ok: true as const, note: inserted[0]! };
}
