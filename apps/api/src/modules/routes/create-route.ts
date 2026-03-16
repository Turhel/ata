import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  inspectors,
  inspectorAccounts,
  routeSourceBatches,
  routeCandidates,
  routeEvents,
  routes,
  routeStops
} from "../../db/schema.js";
import { getDb } from "../../lib/db.js";
import { getActiveRoleCodeByUserId } from "../users/get-active-role-by-user-id.js";
import { getUserById } from "../users/get-user-by-id.js";
import { optimizeRouteStops } from "./optimize-route-stops.js";

type RouteStatus = (typeof routes.status.enumValues)[number];
type RouteStopCategory = (typeof routeStops.routeCategory.enumValues)[number];

export type CreateRouteResult =
  | {
      ok: true;
      routeId: string;
      status: RouteStatus;
      version: number;
      totalStops: number;
      originCity: string | null;
      optimizationMode: "heuristic_city_zip";
    }
  | { ok: false; error: "BAD_REQUEST" | "NOT_FOUND" | "FORBIDDEN" | "CONFLICT"; message: string };

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toRouteCategory(params: { routeDate: string; dueDate: string | null }): RouteStopCategory {
  if (!params.dueDate) return "regular";
  return params.dueDate < params.routeDate ? "overdue" : "regular";
}

export async function createRoute(params: {
  databaseUrl: string;
  createdByUserId: string;
  sourceBatchId: string;
  routeDate: string;
  inspectorAccountCode: string;
  assistantUserId: string | null;
  originCityOverride?: string | null;
  replaceExisting: boolean;
  replaceReason: string | null;
}): Promise<CreateRouteResult> {
  if (!isIsoDate(params.routeDate)) {
    return { ok: false, error: "BAD_REQUEST", message: "routeDate inválido (YYYY-MM-DD)" };
  }

  const inspectorAccountCode = params.inspectorAccountCode.trim();
  if (!inspectorAccountCode) {
    return { ok: false, error: "BAD_REQUEST", message: "inspectorAccountCode obrigatório" };
  }

  if (params.replaceExisting && (!params.replaceReason || !params.replaceReason.trim())) {
    return { ok: false, error: "BAD_REQUEST", message: "replaceReason obrigatório ao substituir rota" };
  }

  const originCityOverride =
    typeof params.originCityOverride === "string" && params.originCityOverride.trim()
      ? params.originCityOverride.trim()
      : null;

  const { db } = getDb(params.databaseUrl);

  const sourceBatchRows = await db
    .select({ id: routeSourceBatches.id, routeDate: routeSourceBatches.routeDate })
    .from(routeSourceBatches)
    .where(eq(routeSourceBatches.id, params.sourceBatchId))
    .limit(1);

  const sourceBatch = sourceBatchRows[0];
  if (!sourceBatch) {
    return { ok: false, error: "NOT_FOUND", message: "Source batch não encontrado" };
  }
  if (String(sourceBatch.routeDate) !== params.routeDate) {
    return { ok: false, error: "BAD_REQUEST", message: "routeDate não confere com o batch informado" };
  }

  const inspectorAccount = await db
    .select({
      id: inspectorAccounts.id,
      accountCode: inspectorAccounts.accountCode,
      currentInspectorId: inspectorAccounts.currentInspectorId,
      isActive: inspectorAccounts.isActive
    })
    .from(inspectorAccounts)
    .where(eq(inspectorAccounts.accountCode, inspectorAccountCode))
    .limit(1);

  const account = inspectorAccount[0];
  if (!account) {
    return { ok: false, error: "NOT_FOUND", message: "Inspector account não encontrada" };
  }
  if (!account.isActive) {
    return { ok: false, error: "BAD_REQUEST", message: "Inspector account está inativa" };
  }

  if (params.assistantUserId) {
    const assistant = await getUserById(params.databaseUrl, params.assistantUserId);
    if (!assistant) {
      return { ok: false, error: "NOT_FOUND", message: "Assistant não encontrado" };
    }
    if (assistant.status !== "active") {
      return { ok: false, error: "BAD_REQUEST", message: "Assistant não está ativo" };
    }
    const role = await getActiveRoleCodeByUserId(params.databaseUrl, assistant.id);
    if (role !== "assistant") {
      return { ok: false, error: "BAD_REQUEST", message: "Usuário informado não tem role assistant ativa" };
    }
  }

  const existingActive = await db
    .select({
      id: routes.id,
      status: routes.status,
      version: routes.version
    })
    .from(routes)
    .where(
      and(
        eq(routes.routeDate, params.routeDate),
        eq(routes.inspectorAccountId, account.id),
        inArray(routes.status, ["draft", "published"])
      )
    )
    .limit(1);

  if (existingActive[0] && !params.replaceExisting) {
    return { ok: false, error: "CONFLICT", message: "Já existe rota ativa para este inspetor neste dia" };
  }

  const latestVersion = await db
    .select({ version: routes.version })
    .from(routes)
    .where(and(eq(routes.routeDate, params.routeDate), eq(routes.inspectorAccountId, account.id)))
    .orderBy(desc(routes.version))
    .limit(1);

  const nextVersion = (latestVersion[0]?.version ?? 0) + 1;
  const routeId = randomUUID();

  const inspector =
    account.currentInspectorId == null
      ? null
      : (
          await db
            .select({
              id: inspectors.id,
              departureCity: inspectors.departureCity
            })
            .from(inspectors)
            .where(eq(inspectors.id, account.currentInspectorId))
            .limit(1)
        )[0] ?? null;

  const originCity = originCityOverride ?? inspector?.departureCity ?? null;

  const candidates = await db
    .select({
      id: routeCandidates.id,
      externalOrderCode: routeCandidates.externalOrderCode,
      sourceStatus: routeCandidates.sourceStatus,
      residentName: routeCandidates.residentName,
      addressLine1: routeCandidates.addressLine1,
      addressLine2: routeCandidates.addressLine2,
      city: routeCandidates.city,
      state: routeCandidates.state,
      zipCode: routeCandidates.zipCode,
      latitude: routeCandidates.latitude,
      longitude: routeCandidates.longitude,
      geocodeStatus: routeCandidates.geocodeStatus,
      geocodeSource: routeCandidates.geocodeSource,
      geocodedAt: routeCandidates.geocodedAt,
      dueDate: routeCandidates.dueDate,
      isRush: routeCandidates.isRush,
      orderId: routeCandidates.orderId,
      lineNumber: routeCandidates.lineNumber
    })
    .from(routeCandidates)
    .where(
      and(
        eq(routeCandidates.sourceBatchId, params.sourceBatchId),
        eq(routeCandidates.sourceInspectorAccountCode, inspectorAccountCode)
      )
    )
    .orderBy(routeCandidates.lineNumber);

  const nonCancelledCandidates = candidates.filter((candidate) => candidate.sourceStatus !== "Canceled");
  if (nonCancelledCandidates.length === 0) {
    return { ok: false, error: "BAD_REQUEST", message: "Nenhuma linha elegível encontrada para esta conta" };
  }

  const optimized = optimizeRouteStops({
    candidates: nonCancelledCandidates,
    routeDate: params.routeDate,
    originCity
  });

  await db.transaction(async (tx) => {
    if (existingActive[0]) {
      await tx
        .update(routes)
        .set({
          status: "superseded",
          updatedAt: sql`now()`
        })
        .where(eq(routes.id, existingActive[0].id));
    }

    await tx.insert(routes).values({
      id: routeId,
      routeDate: params.routeDate,
      sourceBatchId: params.sourceBatchId,
      inspectorAccountId: account.id,
      inspectorId: account.currentInspectorId ?? null,
      assistantUserId: params.assistantUserId ?? null,
      originCity: optimized.originCity,
      optimizationMode: optimized.optimizationMode,
      status: "draft",
      version: nextVersion,
      updatedAt: sql`now()`
    });

    if (existingActive[0]) {
      await tx
        .update(routes)
        .set({
          supersededByRouteId: routeId,
          updatedAt: sql`now()`
        })
        .where(eq(routes.id, existingActive[0].id));

      await tx.insert(routeEvents).values({
        id: randomUUID(),
        routeId: existingActive[0].id,
        eventType: "superseded",
        fromStatus: existingActive[0].status,
        toStatus: "superseded",
        performedByUserId: params.createdByUserId,
        reason: params.replaceReason,
        metadata: { supersededByRouteId: routeId }
      });
    }

    await tx.insert(routeEvents).values({
      id: randomUUID(),
      routeId,
      eventType: "created",
      fromStatus: null,
      toStatus: "draft",
      performedByUserId: params.createdByUserId,
      reason: params.replaceExisting ? params.replaceReason : null,
      metadata: {
        ...(params.replaceExisting ? { replaced: true } : {}),
        originCity: optimized.originCity,
        optimizationMode: optimized.optimizationMode
      }
    });

    await tx.insert(routeStops).values(
      optimized.ordered.map((candidate, index) => ({
        id: randomUUID(),
        routeId,
        seq: index + 1,
        candidateId: candidate.id,
        orderId: candidate.orderId ?? null,
        routeCategory: toRouteCategory({ routeDate: params.routeDate, dueDate: candidate.dueDate }),
        stopStatus: "pending" as const,
        residentName: candidate.residentName,
        addressLine1: candidate.addressLine1,
        addressLine2: candidate.addressLine2,
        city: candidate.city,
        state: candidate.state,
        zipCode: candidate.zipCode,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        geocodeStatus: candidate.geocodeStatus,
        geocodeSource: candidate.geocodeSource,
        geocodedAt: candidate.geocodedAt,
        dueDate: candidate.dueDate,
        updatedAt: sql`now()`
      }))
    );
  });

  return {
    ok: true,
    routeId,
    status: "draft",
    version: nextVersion,
    totalStops: optimized.ordered.length,
    originCity: optimized.originCity,
    optimizationMode: optimized.optimizationMode
  };
}
