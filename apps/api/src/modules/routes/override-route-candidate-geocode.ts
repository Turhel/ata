import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { routeCandidates, routeEvents, routes, routeStops } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type OverrideRouteCandidateGeocodeResult =
  | {
      ok: true;
      candidate: {
        id: string;
        sourceBatchId: string;
        latitude: string;
        longitude: string;
        geocodeStatus: "resolved";
        geocodeQuality: "manual";
        geocodeSource: "manual";
        geocodeReviewRequired: false;
        geocodeReviewReason: null;
      };
      syncedRoutes: number;
      syncedStops: number;
    }
  | {
      ok: false;
      error: "BAD_REQUEST" | "NOT_FOUND";
      message: string;
    };

function parseCoordinate(value: unknown, label: string) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(parsed)) {
    return { ok: false as const, message: `${label} inválido` };
  }
  return { ok: true as const, value: parsed };
}

function normalizeOptionalText(value: unknown) {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export async function overrideRouteCandidateGeocode(params: {
  databaseUrl: string;
  sourceBatchId: string;
  candidateId: string;
  performedByUserId: string;
  latitude: unknown;
  longitude: unknown;
  normalizedAddressLine1?: unknown;
  normalizedCity?: unknown;
  normalizedState?: unknown;
  normalizedZipCode?: unknown;
  note?: unknown;
}): Promise<OverrideRouteCandidateGeocodeResult> {
  const latitude = parseCoordinate(params.latitude, "latitude");
  if (!latitude.ok) {
    return { ok: false, error: "BAD_REQUEST", message: latitude.message };
  }

  const longitude = parseCoordinate(params.longitude, "longitude");
  if (!longitude.ok) {
    return { ok: false, error: "BAD_REQUEST", message: longitude.message };
  }

  if (latitude.value < -90 || latitude.value > 90) {
    return { ok: false, error: "BAD_REQUEST", message: "latitude fora do intervalo válido" };
  }

  if (longitude.value < -180 || longitude.value > 180) {
    return { ok: false, error: "BAD_REQUEST", message: "longitude fora do intervalo válido" };
  }

  const { db } = getDb(params.databaseUrl);

  const candidateRows = await db
    .select({
      id: routeCandidates.id,
      sourceBatchId: routeCandidates.sourceBatchId,
      normalizedAddressLine1: routeCandidates.normalizedAddressLine1,
      normalizedCity: routeCandidates.normalizedCity,
      normalizedState: routeCandidates.normalizedState,
      normalizedZipCode: routeCandidates.normalizedZipCode,
      latitude: routeCandidates.latitude,
      longitude: routeCandidates.longitude,
      geocodeStatus: routeCandidates.geocodeStatus,
      geocodeQuality: routeCandidates.geocodeQuality,
      geocodeSource: routeCandidates.geocodeSource,
      geocodeReviewRequired: routeCandidates.geocodeReviewRequired,
      geocodeReviewReason: routeCandidates.geocodeReviewReason
    })
    .from(routeCandidates)
    .where(and(eq(routeCandidates.id, params.candidateId), eq(routeCandidates.sourceBatchId, params.sourceBatchId)))
    .limit(1);

  const candidate = candidateRows[0];
  if (!candidate) {
    return { ok: false, error: "NOT_FOUND", message: "Candidate não encontrado neste source batch" };
  }

  const nextNormalizedAddressLine1 =
    normalizeOptionalText(params.normalizedAddressLine1) ?? candidate.normalizedAddressLine1;
  const nextNormalizedCity = normalizeOptionalText(params.normalizedCity) ?? candidate.normalizedCity;
  const nextNormalizedState = normalizeOptionalText(params.normalizedState) ?? candidate.normalizedState;
  const nextNormalizedZipCode = normalizeOptionalText(params.normalizedZipCode) ?? candidate.normalizedZipCode;
  const note = normalizeOptionalText(params.note) ?? null;
  const latitudeText = latitude.value.toFixed(7);
  const longitudeText = longitude.value.toFixed(7);

  const activeRoutes = await db
    .select({ id: routes.id, status: routes.status })
    .from(routes)
    .where(
      and(
        eq(routes.sourceBatchId, params.sourceBatchId),
        inArray(routes.status, ["draft", "published"])
      )
    );

  const activeRouteIds = activeRoutes.map((route) => route.id);

  await db.transaction(async (tx) => {
    await tx
      .update(routeCandidates)
      .set({
        normalizedAddressLine1: nextNormalizedAddressLine1,
        normalizedCity: nextNormalizedCity,
        normalizedState: nextNormalizedState,
        normalizedZipCode: nextNormalizedZipCode,
        latitude: latitudeText,
        longitude: longitudeText,
        geocodeStatus: "resolved",
        geocodeQuality: "manual",
        geocodeSource: "manual",
        geocodeReviewRequired: false,
        geocodeReviewReason: null,
        geocodedAt: sql`now()`,
        updatedAt: sql`now()`
      })
      .where(eq(routeCandidates.id, params.candidateId));

    if (activeRouteIds.length > 0) {
      await tx
        .update(routeStops)
        .set({
          normalizedAddressLine1: nextNormalizedAddressLine1,
          normalizedCity: nextNormalizedCity,
          normalizedState: nextNormalizedState,
          normalizedZipCode: nextNormalizedZipCode,
          latitude: latitudeText,
          longitude: longitudeText,
          geocodeStatus: "resolved",
          geocodeQuality: "manual",
          geocodeSource: "manual",
          geocodeReviewRequired: false,
          geocodeReviewReason: null,
          geocodedAt: sql`now()`,
          updatedAt: sql`now()`
        })
        .where(and(eq(routeStops.candidateId, params.candidateId), inArray(routeStops.routeId, activeRouteIds)));

      await tx.insert(routeEvents).values(
        activeRoutes.map((route) => ({
          id: randomUUID(),
          routeId: route.id,
          eventType: "geocode_overridden" as const,
          fromStatus: route.status,
          toStatus: route.status,
          performedByUserId: params.performedByUserId,
          reason: note,
          metadata: {
            candidateId: params.candidateId,
            sourceBatchId: params.sourceBatchId,
            latitude: latitudeText,
            longitude: longitudeText
          }
        }))
      );
    }
  });

  const syncedStopsRows =
    activeRouteIds.length === 0
      ? [{ total: 0 }]
      : await db
          .select({ total: sql<number>`count(*)` })
          .from(routeStops)
          .where(and(eq(routeStops.candidateId, params.candidateId), inArray(routeStops.routeId, activeRouteIds)));

  return {
    ok: true,
    candidate: {
      id: params.candidateId,
      sourceBatchId: params.sourceBatchId,
      latitude: latitudeText,
      longitude: longitudeText,
      geocodeStatus: "resolved",
      geocodeQuality: "manual",
      geocodeSource: "manual",
      geocodeReviewRequired: false,
      geocodeReviewReason: null
    },
    syncedRoutes: activeRouteIds.length,
    syncedStops: Number(syncedStopsRows[0]?.total ?? 0)
  };
}
