import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { orders } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type AssistantOrdersScope = "available" | "mine" | "follow-up";

export async function listOrdersForAssistant(params: {
  databaseUrl: string;
  assistantUserId: string;
  scope: AssistantOrdersScope;
}) {
  const { db } = getDb(params.databaseUrl);

  const baseSelect = db
    .select({
      id: orders.id,
      externalOrderCode: orders.externalOrderCode,
      sourceStatus: orders.sourceStatus,
      status: orders.status,
      residentName: orders.residentName,
      city: orders.city,
      state: orders.state,
      availableDate: orders.availableDate,
      deadlineDate: orders.deadlineDate,
      assistantUserId: orders.assistantUserId,
      sourceImportBatchId: orders.sourceImportBatchId,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt
    })
    .from(orders);

  if (params.scope === "available") {
    return baseSelect
      .where(and(eq(orders.status, "available"), ne(orders.sourceStatus, "Canceled")))
      .orderBy(desc(orders.updatedAt));
  }

  if (params.scope === "follow-up") {
    return baseSelect
      .where(and(eq(orders.assistantUserId, params.assistantUserId), eq(orders.status, "follow_up")))
      .orderBy(desc(orders.updatedAt));
  }

  return baseSelect
    .where(
      and(
        eq(orders.assistantUserId, params.assistantUserId),
        inArray(orders.status, ["in_progress", "submitted", "follow_up"])
      )
    )
    .orderBy(desc(orders.updatedAt));
}

