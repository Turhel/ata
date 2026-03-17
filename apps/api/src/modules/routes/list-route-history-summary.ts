import { and, eq, gte, lte } from "drizzle-orm";
import { inspectorAccounts, routeDayClosures, routeStops, routes } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function listRouteHistorySummary(params: {
  databaseUrl: string;
  dateFrom: string;
  dateTo: string;
  inspectorAccountCode?: string;
  assistantUserId?: string;
}) {
  const { db } = getDb(params.databaseUrl);
  const conditions = [gte(routes.routeDate, params.dateFrom), lte(routes.routeDate, params.dateTo)];

  if (params.inspectorAccountCode) {
    conditions.push(eq(inspectorAccounts.accountCode, params.inspectorAccountCode));
  }

  if (params.assistantUserId) {
    conditions.push(eq(routes.assistantUserId, params.assistantUserId));
  }

  const rows = await db
    .select({
      routeId: routes.id,
      routeDate: routes.routeDate,
      routeStatus: routes.status,
      inspectorAccountCode: inspectorAccounts.accountCode,
      assistantUserId: routes.assistantUserId,
      stopId: routeStops.id,
      routeComplete: routeDayClosures.routeComplete,
      plannedDone: routeDayClosures.plannedDone,
      plannedNotDone: routeDayClosures.plannedNotDone,
      doneNotPlanned: routeDayClosures.doneNotPlanned
    })
    .from(routes)
    .innerJoin(inspectorAccounts, eq(inspectorAccounts.id, routes.inspectorAccountId))
    .leftJoin(routeStops, eq(routeStops.routeId, routes.id))
    .leftJoin(routeDayClosures, eq(routeDayClosures.routeId, routes.id))
    .where(and(...conditions));

  const routeMap = new Map<
    string,
    {
      routeId: string;
      routeDate: string;
      routeStatus: string;
      inspectorAccountCode: string;
      assistantUserId: string | null;
      stopCount: number;
      hasDayClose: boolean;
      routeComplete: boolean;
      plannedDoneCount: number;
      plannedNotDoneCount: number;
      doneNotPlannedCount: number;
    }
  >();

  for (const row of rows) {
    const current =
      routeMap.get(row.routeId) ??
      {
        routeId: row.routeId,
        routeDate: row.routeDate,
        routeStatus: row.routeStatus,
        inspectorAccountCode: row.inspectorAccountCode,
        assistantUserId: row.assistantUserId,
        stopCount: 0,
        hasDayClose: row.plannedDone != null || row.plannedNotDone != null || row.doneNotPlanned != null,
        routeComplete: row.routeComplete ?? false,
        plannedDoneCount: Array.isArray(row.plannedDone) ? row.plannedDone.length : 0,
        plannedNotDoneCount: Array.isArray(row.plannedNotDone) ? row.plannedNotDone.length : 0,
        doneNotPlannedCount: parseStringArray(row.doneNotPlanned).length
      };

    if (row.stopId) current.stopCount += 1;
    routeMap.set(row.routeId, current);
  }

  const summaries = [...routeMap.values()].sort((left, right) =>
    left.routeDate === right.routeDate
      ? left.inspectorAccountCode.localeCompare(right.inspectorAccountCode)
      : left.routeDate.localeCompare(right.routeDate)
  );

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

  const byAssistant = new Map<
    string,
    {
      assistantUserId: string | null;
      routes: number;
      closedRoutes: number;
      completeRoutes: number;
      plannedDoneCount: number;
      plannedNotDoneCount: number;
      doneNotPlannedCount: number;
    }
  >();

  const byInspectorAccount = new Map<
    string,
    {
      inspectorAccountCode: string;
      routes: number;
      closedRoutes: number;
      completeRoutes: number;
      plannedDoneCount: number;
      plannedNotDoneCount: number;
      doneNotPlannedCount: number;
    }
  >();

  for (const item of summaries) {
    const assistantKey = item.assistantUserId ?? "unassigned";
    const assistantSummary =
      byAssistant.get(assistantKey) ??
      {
        assistantUserId: item.assistantUserId,
        routes: 0,
        closedRoutes: 0,
        completeRoutes: 0,
        plannedDoneCount: 0,
        plannedNotDoneCount: 0,
        doneNotPlannedCount: 0
      };
    assistantSummary.routes += 1;
    assistantSummary.closedRoutes += item.hasDayClose ? 1 : 0;
    assistantSummary.completeRoutes += item.routeComplete ? 1 : 0;
    assistantSummary.plannedDoneCount += item.plannedDoneCount;
    assistantSummary.plannedNotDoneCount += item.plannedNotDoneCount;
    assistantSummary.doneNotPlannedCount += item.doneNotPlannedCount;
    byAssistant.set(assistantKey, assistantSummary);

    const accountSummary =
      byInspectorAccount.get(item.inspectorAccountCode) ??
      {
        inspectorAccountCode: item.inspectorAccountCode,
        routes: 0,
        closedRoutes: 0,
        completeRoutes: 0,
        plannedDoneCount: 0,
        plannedNotDoneCount: 0,
        doneNotPlannedCount: 0
      };
    accountSummary.routes += 1;
    accountSummary.closedRoutes += item.hasDayClose ? 1 : 0;
    accountSummary.completeRoutes += item.routeComplete ? 1 : 0;
    accountSummary.plannedDoneCount += item.plannedDoneCount;
    accountSummary.plannedNotDoneCount += item.plannedNotDoneCount;
    accountSummary.doneNotPlannedCount += item.doneNotPlannedCount;
    byInspectorAccount.set(item.inspectorAccountCode, accountSummary);
  }

  return {
    summaries,
    totals,
    byAssistant: [...byAssistant.values()],
    byInspectorAccount: [...byInspectorAccount.values()]
  };
}
