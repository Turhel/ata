import { and, count, desc, eq } from "drizzle-orm";
import { inspectorAccounts, routeDayClosures, routeStops, routes } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function listRouteDaySummaries(params: {
  databaseUrl: string;
  routeDate: string;
  inspectorAccountCode?: string;
}) {
  const { db } = getDb(params.databaseUrl);
  const conditions = [eq(routes.routeDate, params.routeDate)];

  if (params.inspectorAccountCode) {
    conditions.push(eq(inspectorAccounts.accountCode, params.inspectorAccountCode));
  }

  const rows = await db
    .select({
      routeId: routes.id,
      routeDate: routes.routeDate,
      routeStatus: routes.status,
      inspectorAccountCode: inspectorAccounts.accountCode,
      assistantUserId: routes.assistantUserId,
      inspectorId: routes.inspectorId,
      stopCount: count(routeStops.id),
      dayCloseId: routeDayClosures.id,
      routeComplete: routeDayClosures.routeComplete,
      stoppedAtSeq: routeDayClosures.stoppedAtSeq,
      reportedOrderCodes: routeDayClosures.reportedOrderCodes,
      plannedDone: routeDayClosures.plannedDone,
      plannedNotDone: routeDayClosures.plannedNotDone,
      doneNotPlanned: routeDayClosures.doneNotPlanned,
      notes: routeDayClosures.notes,
      updatedAt: routeDayClosures.updatedAt
    })
    .from(routes)
    .innerJoin(inspectorAccounts, eq(inspectorAccounts.id, routes.inspectorAccountId))
    .leftJoin(routeStops, eq(routeStops.routeId, routes.id))
    .leftJoin(routeDayClosures, eq(routeDayClosures.routeId, routes.id))
    .where(and(...conditions))
    .groupBy(routes.id, inspectorAccounts.accountCode, routeDayClosures.id)
    .orderBy(desc(routes.createdAt));

  const summaries = rows.map((row) => {
    const reportedOrderCodes = parseStringArray(row.reportedOrderCodes);
    const plannedDone = Array.isArray(row.plannedDone) ? (row.plannedDone as unknown[]) : [];
    const plannedNotDone = Array.isArray(row.plannedNotDone) ? (row.plannedNotDone as unknown[]) : [];
    const doneNotPlanned = parseStringArray(row.doneNotPlanned);

    return {
      routeId: row.routeId,
      routeDate: row.routeDate,
      routeStatus: row.routeStatus,
      inspectorAccountCode: row.inspectorAccountCode,
      assistantUserId: row.assistantUserId,
      inspectorId: row.inspectorId,
      stopCount: row.stopCount,
      hasDayClose: row.dayCloseId != null,
      routeComplete: row.routeComplete ?? false,
      stoppedAtSeq: row.stoppedAtSeq ?? null,
      reportedOrderCodesCount: reportedOrderCodes.length,
      plannedDoneCount: plannedDone.length,
      plannedNotDoneCount: plannedNotDone.length,
      doneNotPlannedCount: doneNotPlanned.length,
      notes: row.notes ?? null,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null
    };
  });

  const totals = summaries.reduce(
    (acc, item) => {
      acc.routes += 1;
      acc.stopCount += item.stopCount;
      acc.closedRoutes += item.hasDayClose ? 1 : 0;
      acc.completeRoutes += item.routeComplete ? 1 : 0;
      acc.plannedDoneCount += item.plannedDoneCount;
      acc.plannedNotDoneCount += item.plannedNotDoneCount;
      acc.doneNotPlannedCount += item.doneNotPlannedCount;
      return acc;
    },
    {
      routes: 0,
      stopCount: 0,
      closedRoutes: 0,
      completeRoutes: 0,
      plannedDoneCount: 0,
      plannedNotDoneCount: 0,
      doneNotPlannedCount: 0
    }
  );

  return { summaries, totals };
}
