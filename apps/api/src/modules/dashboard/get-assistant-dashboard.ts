import { and, eq, ne, sql } from "drizzle-orm";
import { orders } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export async function getAssistantDashboard(params: {
  databaseUrl: string;
  assistantUserId: string;
}) {
  const { db } = getDb(params.databaseUrl);

  const [availableRow] = await db
    .select({
      available: sql<number>`count(*)`
    })
    .from(orders)
    .where(and(eq(orders.status, "available"), ne(orders.sourceStatus, "Canceled")));

  const [mineRow] = await db
    .select({
      inProgress: sql<number>`sum(case when ${orders.status} = 'in_progress' then 1 else 0 end)`,
      submitted: sql<number>`sum(case when ${orders.status} = 'submitted' then 1 else 0 end)`,
      followUp: sql<number>`sum(case when ${orders.status} = 'follow_up' then 1 else 0 end)`,
      rejected: sql<number>`sum(case when ${orders.status} = 'rejected' then 1 else 0 end)`,
      approved: sql<number>`sum(case when ${orders.status} = 'approved' then 1 else 0 end)`,
      batched: sql<number>`sum(case when ${orders.status} = 'batched' then 1 else 0 end)`,
      paid: sql<number>`sum(case when ${orders.status} = 'paid' then 1 else 0 end)`
    })
    .from(orders)
    .where(eq(orders.assistantUserId, params.assistantUserId));

  return {
    availableOrders: toNumber(availableRow?.available),
    mine: {
      inProgress: toNumber(mineRow?.inProgress),
      submitted: toNumber(mineRow?.submitted),
      followUp: toNumber(mineRow?.followUp),
      rejected: toNumber(mineRow?.rejected),
      approved: toNumber(mineRow?.approved),
      batched: toNumber(mineRow?.batched),
      paid: toNumber(mineRow?.paid)
    }
  };
}
