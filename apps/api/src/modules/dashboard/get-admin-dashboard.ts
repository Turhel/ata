import { sql } from "drizzle-orm";
import {
  orders,
  paymentBatches,
  poolImportBatches,
  users
} from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export async function getAdminDashboard(databaseUrl: string) {
  const { db } = getDb(databaseUrl);

  const [usersRow] = await db
    .select({
      pending: sql<number>`sum(case when ${users.status} = 'pending' then 1 else 0 end)`,
      active: sql<number>`sum(case when ${users.status} = 'active' then 1 else 0 end)`,
      blocked: sql<number>`sum(case when ${users.status} = 'blocked' then 1 else 0 end)`
    })
    .from(users);

  const [ordersRow] = await db
    .select({
      available: sql<number>`sum(case when ${orders.status} = 'available' then 1 else 0 end)`,
      inProgress: sql<number>`sum(case when ${orders.status} = 'in_progress' then 1 else 0 end)`,
      submitted: sql<number>`sum(case when ${orders.status} = 'submitted' then 1 else 0 end)`,
      followUp: sql<number>`sum(case when ${orders.status} = 'follow_up' then 1 else 0 end)`,
      rejected: sql<number>`sum(case when ${orders.status} = 'rejected' then 1 else 0 end)`,
      approved: sql<number>`sum(case when ${orders.status} = 'approved' then 1 else 0 end)`,
      batched: sql<number>`sum(case when ${orders.status} = 'batched' then 1 else 0 end)`,
      paid: sql<number>`sum(case when ${orders.status} = 'paid' then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when ${orders.status} = 'cancelled' then 1 else 0 end)`
    })
    .from(orders);

  const [paymentsRow] = await db
    .select({
      open: sql<number>`sum(case when ${paymentBatches.status} = 'open' then 1 else 0 end)`,
      closed: sql<number>`sum(case when ${paymentBatches.status} = 'closed' then 1 else 0 end)`,
      paid: sql<number>`sum(case when ${paymentBatches.status} = 'paid' then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when ${paymentBatches.status} = 'cancelled' then 1 else 0 end)`
    })
    .from(paymentBatches);

  const [importsRow] = await db
    .select({
      processing: sql<number>`sum(case when ${poolImportBatches.status} = 'processing' then 1 else 0 end)`,
      completed: sql<number>`sum(case when ${poolImportBatches.status} = 'completed' then 1 else 0 end)`,
      partiallyCompleted: sql<number>`sum(case when ${poolImportBatches.status} = 'partially_completed' then 1 else 0 end)`,
      failed: sql<number>`sum(case when ${poolImportBatches.status} = 'failed' then 1 else 0 end)`
    })
    .from(poolImportBatches);

  return {
    users: {
      pending: toNumber(usersRow?.pending),
      active: toNumber(usersRow?.active),
      blocked: toNumber(usersRow?.blocked)
    },
    orders: {
      available: toNumber(ordersRow?.available),
      inProgress: toNumber(ordersRow?.inProgress),
      submitted: toNumber(ordersRow?.submitted),
      followUp: toNumber(ordersRow?.followUp),
      rejected: toNumber(ordersRow?.rejected),
      approved: toNumber(ordersRow?.approved),
      batched: toNumber(ordersRow?.batched),
      paid: toNumber(ordersRow?.paid),
      cancelled: toNumber(ordersRow?.cancelled)
    },
    payments: {
      open: toNumber(paymentsRow?.open),
      closed: toNumber(paymentsRow?.closed),
      paid: toNumber(paymentsRow?.paid),
      cancelled: toNumber(paymentsRow?.cancelled)
    },
    imports: {
      processing: toNumber(importsRow?.processing),
      completed: toNumber(importsRow?.completed),
      partiallyCompleted: toNumber(importsRow?.partiallyCompleted),
      failed: toNumber(importsRow?.failed)
    }
  };
}
