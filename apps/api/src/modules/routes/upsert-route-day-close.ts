import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { routeDayClosures, routeEvents, routeStops, routes } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";
import type { OperationalUser } from "../users/get-user-by-auth-user-id.js";
import { getActiveRoleCodeByUserId } from "../users/get-active-role-by-user-id.js";
import { listRouteStopsForDayClose, type RouteDayCloseItem, type RouteDayCloseReport } from "./get-route-day-close.js";

export type UpsertRouteDayCloseResult =
  | { ok: true; route: { id: string; routeDate: string }; report: RouteDayCloseReport }
  | {
      ok: false;
      error: "FORBIDDEN" | "NOT_FOUND" | "INVALID_STATUS" | "VALIDATION_ERROR";
      message: string;
      details?: Record<string, unknown>;
    };

function normalizeCodes(input: string[]) {
  return Array.from(
    new Set(
      input
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean)
    )
  );
}

function toItem(input: {
  seq: number;
  stopId: string | null;
  orderId: string | null;
  externalOrderCode: string | null;
  residentName: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  reason?: string | null;
}): RouteDayCloseItem {
  return {
    seq: input.seq,
    stopId: input.stopId,
    orderId: input.orderId,
    externalOrderCode: input.externalOrderCode,
    residentName: input.residentName,
    addressLine1: input.addressLine1,
    city: input.city,
    state: input.state,
    reason: input.reason ?? null
  };
}

export async function upsertRouteDayClose(params: {
  databaseUrl: string;
  routeId: string;
  operationalUser: OperationalUser;
  submittedByUserId: string;
  reportedOrderCodes: string[];
  routeComplete: boolean;
  stoppedAtSeq: number | null;
  skippedStops?: Array<{ seq: number; reason: string }>;
  notes?: string | null;
}): Promise<UpsertRouteDayCloseResult> {
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

  const canSubmit =
    role === "master" ||
    role === "admin" ||
    (role === "assistant" && route.assistantUserId === params.operationalUser.id);

  if (!canSubmit) {
    return { ok: false, error: "FORBIDDEN", message: "Sem permissão para fechar esta rota" };
  }

  if (route.status !== "published") {
    return {
      ok: false,
      error: "INVALID_STATUS",
      message: `A rota precisa estar publicada para fechamento diário (status=${route.status})`
    };
  }

  const reportedOrderCodes = normalizeCodes(params.reportedOrderCodes);
  const skippedStops = (params.skippedStops ?? [])
    .map((item) => ({ seq: item.seq, reason: item.reason.trim() }))
    .filter((item) => Number.isInteger(item.seq) && item.seq > 0 && item.reason.length > 0);

  const routeStopsRows = await listRouteStopsForDayClose({
    databaseUrl: params.databaseUrl,
    routeId: params.routeId
  });

  if (routeStopsRows.length === 0) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: "A rota não possui paradas para fechamento",
      details: { code: "EMPTY_ROUTE" }
    };
  }

  if (params.stoppedAtSeq != null && !routeStopsRows.some((stop) => stop.seq === params.stoppedAtSeq)) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: "stoppedAtSeq não pertence à rota informada",
      details: { code: "INVALID_STOP_POINT", stoppedAtSeq: params.stoppedAtSeq }
    };
  }

  const invalidSkippedSeqs = skippedStops
    .map((item) => item.seq)
    .filter((seq) => !routeStopsRows.some((stop) => stop.seq === seq));

  if (invalidSkippedSeqs.length > 0) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: "Há skippedStops com seq inválido para esta rota",
      details: { code: "INVALID_SKIPPED_STOPS", invalidSeqs: invalidSkippedSeqs }
    };
  }

  const plannedDone: RouteDayCloseItem[] = [];
  const plannedNotDone: RouteDayCloseItem[] = [];

  const plannedCodes = new Set<string>();
  const stopIdsDone: string[] = [];
  const stopIdsSkipped: string[] = [];

  for (const stop of routeStopsRows) {
    const code = stop.externalOrderCode?.trim().toUpperCase() ?? null;
    if (code) {
      plannedCodes.add(code);
    }

    const skippedReason = skippedStops.find((item) => item.seq === stop.seq)?.reason ?? null;
    const item = toItem({
      seq: stop.seq,
      stopId: stop.stopId,
      orderId: stop.orderId,
      externalOrderCode: stop.externalOrderCode,
      residentName: stop.residentName,
      addressLine1: stop.addressLine1,
      city: stop.city,
      state: stop.state,
      reason: skippedReason
    });

    if (code && reportedOrderCodes.includes(code)) {
      plannedDone.push(item);
      if (stop.stopId) stopIdsDone.push(stop.stopId);
    } else {
      plannedNotDone.push(item);
      if (stop.stopId) stopIdsSkipped.push(stop.stopId);
    }
  }

  if (params.routeComplete && plannedNotDone.length > 0) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: "routeComplete não pode ser true quando há pontos planejados não reportados",
      details: {
        code: "ROUTE_NOT_COMPLETE",
        plannedNotDoneCount: plannedNotDone.length
      }
    };
  }

  const doneNotPlanned = reportedOrderCodes.filter((code) => !plannedCodes.has(code));

  const reportId = randomUUID();
  const skippedPayload = plannedNotDone
    .filter((item) => item.reason && item.reason.trim().length > 0)
    .map((item) => ({ seq: item.seq, reason: item.reason }));

  await db.transaction(async (tx) => {
    if (stopIdsDone.length > 0) {
      await tx
        .update(routeStops)
        .set({
          stopStatus: "done",
          updatedAt: sql`now()`
        })
        .where(inArray(routeStops.id, stopIdsDone));
    }

    if (stopIdsSkipped.length > 0) {
      await tx
        .update(routeStops)
        .set({
          stopStatus: "skipped",
          updatedAt: sql`now()`
        })
        .where(inArray(routeStops.id, stopIdsSkipped));
    }

    const existingRows = await tx
      .select({ id: routeDayClosures.id })
      .from(routeDayClosures)
      .where(eq(routeDayClosures.routeId, params.routeId))
      .limit(1);

    if (existingRows[0]) {
      await tx
        .update(routeDayClosures)
        .set({
          assistantUserId: route.assistantUserId,
          inspectorId: route.inspectorId,
          submittedByUserId: params.submittedByUserId,
          routeComplete: params.routeComplete,
          stoppedAtSeq: params.stoppedAtSeq,
          notes: params.notes?.trim() || null,
          reportedOrderCodes,
          skippedStops: skippedPayload,
          plannedDone,
          plannedNotDone,
          doneNotPlanned,
          updatedAt: sql`now()`
        })
        .where(eq(routeDayClosures.routeId, params.routeId));
    } else {
      await tx.insert(routeDayClosures).values({
        id: reportId,
        routeId: params.routeId,
        routeDate: route.routeDate,
        assistantUserId: route.assistantUserId,
        inspectorId: route.inspectorId,
        submittedByUserId: params.submittedByUserId,
        routeComplete: params.routeComplete,
        stoppedAtSeq: params.stoppedAtSeq,
        notes: params.notes?.trim() || null,
        reportedOrderCodes,
        skippedStops: skippedPayload,
        plannedDone,
        plannedNotDone,
        doneNotPlanned
      });
    }

    await tx.insert(routeEvents).values({
      id: randomUUID(),
      routeId: params.routeId,
      eventType: "day_closed",
      fromStatus: route.status,
      toStatus: route.status,
      performedByUserId: params.submittedByUserId,
      reason: params.routeComplete ? "Fechamento diário marcado como rota completa" : "Fechamento diário registrado",
      metadata: {
        routeComplete: params.routeComplete,
        stoppedAtSeq: params.stoppedAtSeq,
        reportedOrderCodesCount: reportedOrderCodes.length,
        plannedDoneCount: plannedDone.length,
        plannedNotDoneCount: plannedNotDone.length,
        doneNotPlannedCount: doneNotPlanned.length
      }
    });
  });

  const created = await db
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

  const report = created[0]!;

  return {
    ok: true,
    route: {
      id: route.id,
      routeDate: route.routeDate
    },
    report: {
      id: report.id,
      routeId: report.routeId,
      routeDate: report.routeDate,
      assistantUserId: report.assistantUserId,
      inspectorId: report.inspectorId,
      submittedByUserId: report.submittedByUserId,
      routeComplete: report.routeComplete,
      stoppedAtSeq: report.stoppedAtSeq,
      notes: report.notes,
      reportedOrderCodes: Array.isArray(report.reportedOrderCodes) ? (report.reportedOrderCodes as string[]) : [],
      skippedStops: Array.isArray(report.skippedStops) ? (report.skippedStops as RouteDayCloseItem[]) : [],
      plannedDone: Array.isArray(report.plannedDone) ? (report.plannedDone as RouteDayCloseItem[]) : [],
      plannedNotDone: Array.isArray(report.plannedNotDone) ? (report.plannedNotDone as RouteDayCloseItem[]) : [],
      doneNotPlanned: Array.isArray(report.doneNotPlanned) ? (report.doneNotPlanned as string[]) : [],
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString()
    }
  };
}
