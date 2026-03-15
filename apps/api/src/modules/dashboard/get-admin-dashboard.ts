import { and, eq, inArray, sql } from "drizzle-orm";
import {
  orders,
  paymentBatches,
  poolImportBatches,
  teamAssignments,
  users
} from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export async function getAdminDashboard(params: {
  databaseUrl: string;
  actorUserId: string;
  actorRole: "admin" | "master";
}) {
  const { databaseUrl, actorRole, actorUserId } = params;
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

  let team:
    | {
        assistants: number;
        orders: {
          availableToTeam: number;
          inProgress: number;
          submitted: number;
          followUp: number;
          approved: number;
          batched: number;
          paid: number;
        };
      }
    | null = null;

  if (actorRole === "admin") {
    const assignmentRows = await db
      .select({ assistantUserId: teamAssignments.assistantUserId })
      .from(teamAssignments)
      .where(and(eq(teamAssignments.adminUserId, actorUserId), eq(teamAssignments.isActive, true)));

    const assistantIds = [...new Set(assignmentRows.map((row) => row.assistantUserId))];

    if (assistantIds.length > 0) {
      const [teamOrdersRow] = await db
        .select({
          availableToTeam: sql<number>`sum(case when ${orders.status} = 'available' and ${orders.sourceStatus} <> 'Canceled' then 1 else 0 end)`,
          inProgress: sql<number>`sum(case when ${orders.assistantUserId} in (${sql.join(
            assistantIds.map((id) => sql`${id}`),
            sql`, `
          )}) and ${orders.status} = 'in_progress' then 1 else 0 end)`,
          submitted: sql<number>`sum(case when ${orders.assistantUserId} in (${sql.join(
            assistantIds.map((id) => sql`${id}`),
            sql`, `
          )}) and ${orders.status} = 'submitted' then 1 else 0 end)`,
          followUp: sql<number>`sum(case when ${orders.assistantUserId} in (${sql.join(
            assistantIds.map((id) => sql`${id}`),
            sql`, `
          )}) and ${orders.status} = 'follow_up' then 1 else 0 end)`,
          approved: sql<number>`sum(case when ${orders.assistantUserId} in (${sql.join(
            assistantIds.map((id) => sql`${id}`),
            sql`, `
          )}) and ${orders.status} = 'approved' then 1 else 0 end)`,
          batched: sql<number>`sum(case when ${orders.assistantUserId} in (${sql.join(
            assistantIds.map((id) => sql`${id}`),
            sql`, `
          )}) and ${orders.status} = 'batched' then 1 else 0 end)`,
          paid: sql<number>`sum(case when ${orders.assistantUserId} in (${sql.join(
            assistantIds.map((id) => sql`${id}`),
            sql`, `
          )}) and ${orders.status} = 'paid' then 1 else 0 end)`
        })
        .from(orders);

      team = {
        assistants: assistantIds.length,
        orders: {
          availableToTeam: toNumber(teamOrdersRow?.availableToTeam),
          inProgress: toNumber(teamOrdersRow?.inProgress),
          submitted: toNumber(teamOrdersRow?.submitted),
          followUp: toNumber(teamOrdersRow?.followUp),
          approved: toNumber(teamOrdersRow?.approved),
          batched: toNumber(teamOrdersRow?.batched),
          paid: toNumber(teamOrdersRow?.paid)
        }
      };
    } else {
      team = {
        assistants: 0,
        orders: {
          availableToTeam: toNumber(ordersRow?.available),
          inProgress: 0,
          submitted: 0,
          followUp: 0,
          approved: 0,
          batched: 0,
          paid: 0
        }
      };
    }
  }

  return {
    scope: actorRole === "master" ? "global" : "team",
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
    },
    team
  };
}
