import { desc } from "drizzle-orm";
import { orders } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function listOrders(databaseUrl: string) {
  const { db } = getDb(databaseUrl);

  return db
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
    .from(orders)
    .orderBy(desc(orders.updatedAt));
}
