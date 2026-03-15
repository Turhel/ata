import { asc, eq } from "drizzle-orm";
import { orderEvents } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function listOrderEvents(params: { databaseUrl: string; orderId: string }) {
  const { db } = getDb(params.databaseUrl);

  return db
    .select({
      id: orderEvents.id,
      orderId: orderEvents.orderId,
      eventType: orderEvents.eventType,
      fromStatus: orderEvents.fromStatus,
      toStatus: orderEvents.toStatus,
      performedByUserId: orderEvents.performedByUserId,
      reason: orderEvents.reason,
      metadata: orderEvents.metadata,
      createdAt: orderEvents.createdAt
    })
    .from(orderEvents)
    .where(eq(orderEvents.orderId, params.orderId))
    .orderBy(asc(orderEvents.createdAt));
}

