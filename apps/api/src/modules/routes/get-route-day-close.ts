import { asc, eq, sql } from "drizzle-orm";
import { orders, routeCandidates, routeDayClosures, routeStops, routes } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";
import type { OperationalUser } from "../users/get-user-by-auth-user-id.js";
import { getActiveRoleCodeByUserId } from "../users/get-active-role-by-user-id.js";

export type RouteDayCloseItem = {
  seq: number;
  stopId: string | null;
  orderId: string | null;
  externalOrderCode: string | null;
  residentName: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  reason?: string | null;
};

export type RouteDayCloseReport = {
  id: string;
  routeId: string;
  routeDate: string;
  assistantUserId: string | null;
  inspectorId: string | null;
  submittedByUserId: string;
  routeComplete: boolean;
  stoppedAtSeq: number | null;
  notes: string | null;
  reportedOrderCodes: string[];
  skippedStops: RouteDayCloseItem[];
  plannedDone: RouteDayCloseItem[];
  plannedNotDone: RouteDayCloseItem[];
  doneNotPlanned: string[];
  createdAt: string;
  updatedAt: string;
};

export type GetRouteDayCloseResult =
  | {
      ok: true;
      route: {
        id: string;
        routeDate: string;
        status: (typeof routes.status.enumValues)[number];
        assistantUserId: string | null;
        inspectorId: string | null;
      };
      report: RouteDayCloseReport | null;
    }
  | { ok: false; error: "FORBIDDEN" | "NOT_FOUND"; message: string };

function parseItems(value: unknown): RouteDayCloseItem[] {
  return Array.isArray(value) ? (value as RouteDayCloseItem[]) : [];
}

function parseCodes(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function getRouteDayClose(params: {
  databaseUrl: string;
  routeId: string;
  operationalUser: OperationalUser;
}): Promise<GetRouteDayCloseResult> {
  const role = await getActiveRoleCodeByUserId(params.databaseUrl, params.operationalUser.id);
  if (!role) {
    return { ok: false, error: "FORBIDDEN", message: "Usuário sem role ativa" };
  }

  const { db } = getDb(params.databaseUrl);

  const routeRows = await db
    .select({
      id: routes.id,
      routeDate: routes.routeDate,
      status: routes.status,
      assistantUserId: routes.assistantUserId,
      inspectorId: routes.inspectorId
    })
    .from(routes)
    .where(eq(routes.id, params.routeId))
    .limit(1);

  const route = routeRows[0];
  if (!route) {
    return { ok: false, error: "NOT_FOUND", message: "Rota não encontrada" };
  }

  const canRead =
    role === "master" ||
    role === "admin" ||
    (role === "assistant" && route.assistantUserId === params.operationalUser.id) ||
    (role === "inspector" &&
      params.operationalUser.inspectorId != null &&
      route.inspectorId === params.operationalUser.inspectorId);

  if (!canRead) {
    return { ok: false, error: "FORBIDDEN", message: "Sem acesso ao fechamento diário desta rota" };
  }

  const reportRows = await db
    .select({
      id: routeDayClosures.id,
      routeId: routeDayClosures.routeId,
      routeDate: routeDayClosures.routeDate,
      assistantUserId: routeDayClosures.assistantUserId,
      inspectorId: routeDayClosures.inspectorId,
      submittedByUserId: routeDayClosures.submittedByUserId,
      routeComplete: routeDayClosures.routeComplete,
      stoppedAtSeq: routeDayClosures.stoppedAtSeq,
      notes: routeDayClosures.notes,
      reportedOrderCodes: routeDayClosures.reportedOrderCodes,
      skippedStops: routeDayClosures.skippedStops,
      plannedDone: routeDayClosures.plannedDone,
      plannedNotDone: routeDayClosures.plannedNotDone,
      doneNotPlanned: routeDayClosures.doneNotPlanned,
      createdAt: routeDayClosures.createdAt,
      updatedAt: routeDayClosures.updatedAt
    })
    .from(routeDayClosures)
    .where(eq(routeDayClosures.routeId, params.routeId))
    .limit(1);

  const report = reportRows[0];

  return {
    ok: true,
    route,
    report: report
      ? {
          id: report.id,
          routeId: report.routeId,
          routeDate: report.routeDate,
          assistantUserId: report.assistantUserId,
          inspectorId: report.inspectorId,
          submittedByUserId: report.submittedByUserId,
          routeComplete: report.routeComplete,
          stoppedAtSeq: report.stoppedAtSeq,
          notes: report.notes,
          reportedOrderCodes: parseCodes(report.reportedOrderCodes),
          skippedStops: parseItems(report.skippedStops),
          plannedDone: parseItems(report.plannedDone),
          plannedNotDone: parseItems(report.plannedNotDone),
          doneNotPlanned: parseCodes(report.doneNotPlanned),
          createdAt: report.createdAt.toISOString(),
          updatedAt: report.updatedAt.toISOString()
        }
      : null
  };
}

export async function listRouteStopsForDayClose(params: {
  databaseUrl: string;
  routeId: string;
}) {
  const { db } = getDb(params.databaseUrl);

  return db
    .select({
      stopId: routeStops.id,
      seq: routeStops.seq,
      orderId: routeStops.orderId,
      residentName: routeStops.residentName,
      addressLine1: routeStops.addressLine1,
      city: routeStops.city,
      state: routeStops.state,
      stopStatus: routeStops.stopStatus,
      externalOrderCode: sql<string | null>`coalesce(${orders.externalOrderCode}, ${routeCandidates.externalOrderCode})`
    })
    .from(routeStops)
    .leftJoin(orders, eq(orders.id, routeStops.orderId))
    .leftJoin(routeCandidates, eq(routeCandidates.id, routeStops.candidateId))
    .where(eq(routeStops.routeId, params.routeId))
    .orderBy(asc(routeStops.seq));
}
