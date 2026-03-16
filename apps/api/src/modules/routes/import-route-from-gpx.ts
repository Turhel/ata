import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  inspectors,
  inspectorAccounts,
  routeEvents,
  routeSourceBatches,
  routeCandidates,
  routes,
  routeStops
} from "../../db/schema.js";
import { getDb } from "../../lib/db.js";
import { getActiveRoleCodeByUserId } from "../users/get-active-role-by-user-id.js";
import { getUserById } from "../users/get-user-by-id.js";
import { parseRouteGpxBuffer, type ParsedRouteGpxStop } from "./parse-route-gpx.js";

type RouteStatus = (typeof routes.status.enumValues)[number];
type RouteStopCategory = (typeof routeStops.routeCategory.enumValues)[number];

type CandidateRow = {
  id: string;
  externalOrderCode: string;
  sourceStatus: "Assigned" | "Received" | "Canceled";
  residentName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  normalizedAddressLine1: string | null;
  normalizedCity: string | null;
  normalizedState: string | null;
  normalizedZipCode: string | null;
  latitude: string | null;
  longitude: string | null;
  dueDate: string | null;
  orderId: string | null;
};

export type ImportRouteFromGpxResult =
  | {
      ok: true;
      routeId: string;
      status: RouteStatus;
      version: number;
      totalStops: number;
      matchedStops: number;
      unmatchedStops: number;
      originCity: string | null;
      optimizationMode: "gpx_import";
      alerts: {
        reviewRequiredCount: number;
        approximateCount: number;
        notFoundCount: number;
        pendingCount: number;
      };
    }
  | { ok: false; error: "BAD_REQUEST" | "NOT_FOUND" | "FORBIDDEN" | "CONFLICT"; message: string };

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseBooleanish(value: unknown) {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "yes", "y", "sim", "s"].includes(normalized);
}

function toRouteCategory(params: {
  routeDate: string;
  dueDate: string | null;
  sym: string | null;
}): RouteStopCategory {
  const normalizedSym = String(params.sym ?? "").trim().toLowerCase();
  if (normalizedSym === "dark_green") return "exterior";
  if (normalizedSym === "pink") return "interior";
  if (normalizedSym === "brown") return "fint";
  if (normalizedSym === "dark_red") return "overdue";
  if (params.dueDate && params.dueDate < params.routeDate) return "overdue";
  return "regular";
}

function distanceScore(stop: ParsedRouteGpxStop, candidate: CandidateRow) {
  if (!stop.latitude || !stop.longitude || !candidate.latitude || !candidate.longitude) {
    return Number.POSITIVE_INFINITY;
  }

  const stopLat = Number(stop.latitude);
  const stopLon = Number(stop.longitude);
  const candidateLat = Number(candidate.latitude);
  const candidateLon = Number(candidate.longitude);
  if (![stopLat, stopLon, candidateLat, candidateLon].every(Number.isFinite)) {
    return Number.POSITIVE_INFINITY;
  }

  const latDiff = stopLat - candidateLat;
  const lonDiff = stopLon - candidateLon;
  return latDiff * latDiff + lonDiff * lonDiff;
}

function findCandidateForGpxStop(stop: ParsedRouteGpxStop, candidates: CandidateRow[]) {
  const exactAddressMatch = candidates.find((candidate) => {
    return (
      candidate.normalizedAddressLine1 === stop.normalizedAddressLine1 &&
      candidate.normalizedCity === stop.normalizedCity &&
      candidate.normalizedState === stop.normalizedState
    );
  });
  if (exactAddressMatch) return exactAddressMatch;

  const exactStreetOnlyMatch = candidates.find(
    (candidate) => candidate.normalizedAddressLine1 && candidate.normalizedAddressLine1 === stop.normalizedAddressLine1
  );
  if (exactStreetOnlyMatch) return exactStreetOnlyMatch;

  const geocodedCandidates = candidates
    .map((candidate) => ({ candidate, score: distanceScore(stop, candidate) }))
    .filter((item) => Number.isFinite(item.score))
    .sort((left, right) => left.score - right.score);

  const nearest = geocodedCandidates[0];
  return nearest && nearest.score <= 0.0004 ? nearest.candidate : null;
}

export async function importRouteFromGpx(params: {
  databaseUrl: string;
  createdByUserId: string;
  sourceBatchId: string;
  routeDate: string;
  inspectorAccountCode: string;
  assistantUserId: string | null;
  originCityOverride?: string | null;
  replaceExisting: boolean;
  replaceReason: string | null;
  fileName: string;
  buffer: Buffer;
}): Promise<ImportRouteFromGpxResult> {
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

  const { db } = getDb(params.databaseUrl);
  const sourceBatch = await db
    .select({ id: routeSourceBatches.id, routeDate: routeSourceBatches.routeDate })
    .from(routeSourceBatches)
    .where(eq(routeSourceBatches.id, params.sourceBatchId))
    .limit(1);

  if (!sourceBatch[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Source batch não encontrado" };
  }
  if (String(sourceBatch[0].routeDate) !== params.routeDate) {
    return { ok: false, error: "BAD_REQUEST", message: "routeDate não confere com o batch informado" };
  }

  const inspectorAccount = await db
    .select({
      id: inspectorAccounts.id,
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
    if (!assistant) return { ok: false, error: "NOT_FOUND", message: "Assistant não encontrado" };
    if (assistant.status !== "active") return { ok: false, error: "BAD_REQUEST", message: "Assistant não está ativo" };
    const role = await getActiveRoleCodeByUserId(params.databaseUrl, assistant.id);
    if (role !== "assistant") {
      return { ok: false, error: "BAD_REQUEST", message: "Usuário informado não tem role assistant ativa" };
    }
  }

  const existingActive = await db
    .select({ id: routes.id, status: routes.status, version: routes.version })
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
            .select({ id: inspectors.id, departureCity: inspectors.departureCity })
            .from(inspectors)
            .where(eq(inspectors.id, account.currentInspectorId))
            .limit(1)
        )[0] ?? null;

  const originCity =
    typeof params.originCityOverride === "string" && params.originCityOverride.trim()
      ? params.originCityOverride.trim()
      : inspector?.departureCity ?? null;

  const parsedStops = parseRouteGpxBuffer({ buffer: params.buffer });
  if (parsedStops.length === 0) {
    return { ok: false, error: "BAD_REQUEST", message: "GPX sem pontos de rota" };
  }

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
      normalizedAddressLine1: routeCandidates.normalizedAddressLine1,
      normalizedCity: routeCandidates.normalizedCity,
      normalizedState: routeCandidates.normalizedState,
      normalizedZipCode: routeCandidates.normalizedZipCode,
      latitude: routeCandidates.latitude,
      longitude: routeCandidates.longitude,
      dueDate: routeCandidates.dueDate,
      orderId: routeCandidates.orderId
    })
    .from(routeCandidates)
    .where(
      and(
        eq(routeCandidates.sourceBatchId, params.sourceBatchId),
        eq(routeCandidates.sourceInspectorAccountCode, inspectorAccountCode)
      )
    );

  const availableCandidates = candidates.filter((candidate) => candidate.sourceStatus !== "Canceled");
  const remainingCandidates = [...availableCandidates];

  const stopDrafts = parsedStops.map((stop) => {
    const matchedCandidate = findCandidateForGpxStop(stop, remainingCandidates);
    if (matchedCandidate) {
      const matchedIndex = remainingCandidates.findIndex((candidate) => candidate.id === matchedCandidate.id);
      if (matchedIndex >= 0) remainingCandidates.splice(matchedIndex, 1);
    }

    const reviewRequired = matchedCandidate == null;
    return {
      candidateId: matchedCandidate?.id ?? null,
      orderId: matchedCandidate?.orderId ?? null,
      residentName: matchedCandidate?.residentName ?? null,
      addressLine1: matchedCandidate?.addressLine1 ?? stop.addressLine1,
      addressLine2: matchedCandidate?.addressLine2 ?? null,
      city: matchedCandidate?.city ?? stop.city,
      state: matchedCandidate?.state ?? stop.state,
      zipCode: matchedCandidate?.zipCode ?? stop.zipCode,
      normalizedAddressLine1: matchedCandidate?.normalizedAddressLine1 ?? stop.normalizedAddressLine1,
      normalizedCity: matchedCandidate?.normalizedCity ?? stop.normalizedCity,
      normalizedState: matchedCandidate?.normalizedState ?? stop.normalizedState,
      normalizedZipCode: matchedCandidate?.normalizedZipCode ?? stop.normalizedZipCode,
      latitude: stop.latitude,
      longitude: stop.longitude,
      geocodeStatus: stop.latitude && stop.longitude ? "resolved" : "pending",
      geocodeQuality: reviewRequired ? "needs_review" : "precise",
      geocodeSource: "gpx",
      geocodeReviewRequired: reviewRequired,
      geocodeReviewReason: reviewRequired ? "GPX stop sem candidate correspondente no snapshot do dia" : null,
      dueDate: matchedCandidate?.dueDate ?? null,
      routeCategory: toRouteCategory({
        routeDate: params.routeDate,
        dueDate: matchedCandidate?.dueDate ?? null,
        sym: stop.sym
      }) satisfies RouteStopCategory
    };
  });

  const alerts = stopDrafts.reduce(
    (acc, stop) => {
      if (stop.geocodeReviewRequired) acc.reviewRequiredCount += 1;
      if (stop.geocodeQuality === "approximate") acc.approximateCount += 1;
      if (stop.geocodeStatus === "not_found") acc.notFoundCount += 1;
      if (stop.geocodeStatus === "pending") acc.pendingCount += 1;
      return acc;
    },
    { reviewRequiredCount: 0, approximateCount: 0, notFoundCount: 0, pendingCount: 0 }
  );

  await db.transaction(async (tx) => {
    if (existingActive[0]) {
      await tx.update(routes).set({ status: "superseded", updatedAt: sql`now()` }).where(eq(routes.id, existingActive[0].id));
    }

    await tx.insert(routes).values({
      id: routeId,
      routeDate: params.routeDate,
      sourceBatchId: params.sourceBatchId,
      inspectorAccountId: account.id,
      inspectorId: account.currentInspectorId ?? null,
      assistantUserId: params.assistantUserId ?? null,
      originCity,
      optimizationMode: "gpx_import",
      status: "draft",
      version: nextVersion,
      updatedAt: sql`now()`
    });

    if (existingActive[0]) {
      await tx
        .update(routes)
        .set({ supersededByRouteId: routeId, updatedAt: sql`now()` })
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

    await tx.insert(routeEvents).values([
      {
        id: randomUUID(),
        routeId,
        eventType: "created",
        fromStatus: null,
        toStatus: "draft",
        performedByUserId: params.createdByUserId,
        reason: params.replaceExisting ? params.replaceReason : null,
        metadata: {
          ...(params.replaceExisting ? { replaced: true } : {}),
          originCity,
          optimizationMode: "gpx_import",
          alerts
        }
      },
      {
        id: randomUUID(),
        routeId,
        eventType: "imported_gpx",
        fromStatus: null,
        toStatus: "draft",
        performedByUserId: params.createdByUserId,
        reason: params.fileName,
        metadata: {
          fileName: params.fileName,
          totalStops: stopDrafts.length,
          matchedStops: stopDrafts.filter((stop) => stop.candidateId != null).length,
          unmatchedStops: stopDrafts.filter((stop) => stop.candidateId == null).length
        }
      }
    ]);

    await tx.insert(routeStops).values(
      stopDrafts.map((stop, index) => ({
        id: randomUUID(),
        routeId,
        seq: index + 1,
        candidateId: stop.candidateId,
        orderId: stop.orderId,
        routeCategory: stop.routeCategory,
        stopStatus: "pending" as const,
        residentName: stop.residentName,
        addressLine1: stop.addressLine1,
        addressLine2: stop.addressLine2,
        city: stop.city,
        state: stop.state,
        zipCode: stop.zipCode,
        normalizedAddressLine1: stop.normalizedAddressLine1,
        normalizedCity: stop.normalizedCity,
        normalizedState: stop.normalizedState,
        normalizedZipCode: stop.normalizedZipCode,
        latitude: stop.latitude,
        longitude: stop.longitude,
        geocodeStatus: stop.geocodeStatus,
        geocodeQuality: stop.geocodeQuality,
        geocodeSource: stop.geocodeSource,
        geocodeReviewRequired: stop.geocodeReviewRequired,
        geocodeReviewReason: stop.geocodeReviewReason,
        dueDate: stop.dueDate,
        updatedAt: sql`now()`
      }))
    );
  });

  return {
    ok: true,
    routeId,
    status: "draft",
    version: nextVersion,
    totalStops: stopDrafts.length,
    matchedStops: stopDrafts.filter((stop) => stop.candidateId != null).length,
    unmatchedStops: stopDrafts.filter((stop) => stop.candidateId == null).length,
    originCity,
    optimizationMode: "gpx_import",
    alerts
  };
}
