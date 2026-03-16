import { eq, sql } from "drizzle-orm";
import { routeCandidates, routeSourceBatches, routeStops, routes } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";
import { buildNormalizedAddress, classifyGeocodeResult } from "./address-normalization.js";

type GeocodeStatus = "pending" | "resolved" | "not_found" | "failed" | "skipped";

export type GeocodeRouteSourceBatchResult =
  | {
      ok: true;
      batchId: string;
      totalCandidates: number;
      processedCandidates: number;
      resolvedCandidates: number;
      preciseCandidates: number;
      approximateCandidates: number;
      reviewRequiredCandidates: number;
      notFoundCandidates: number;
      failedCandidates: number;
      skippedCandidates: number;
    }
  | { ok: false; error: "NOT_FOUND" | "BAD_REQUEST"; message: string };

function toNullableText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableNumberString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^-?\d+(\.\d+)?$/.test(trimmed) ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function buildAddressQuery(candidate: {
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}) {
  const street = toNullableText(candidate.addressLine1);
  const city = toNullableText(candidate.city);
  const state = toNullableText(candidate.state);
  const postalcode = toNullableText(candidate.zipCode);

  if (!street || !city || !state) {
    return null;
  }

  return {
    street,
    city,
    state,
    postalcode,
    countrycodes: "us",
    format: "jsonv2",
    addressdetails: "1",
    limit: "1"
  };
}

async function geocodeWithNominatim(params: {
  baseUrl: string;
  candidate: {
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  };
}) {
  const query = buildAddressQuery(params.candidate);
  if (!query) {
    return {
      status: "skipped" as const,
      latitude: null,
      longitude: null,
      source: null
    };
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) searchParams.set(key, value);
  }

  const response = await fetch(`${params.baseUrl}/search?${searchParams.toString()}`, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    return {
      status: "failed" as const,
      latitude: null,
      longitude: null,
      source: "nominatim"
    };
  }

  const body = (await response.json()) as Array<Record<string, unknown>>;
  const first = body[0] ?? null;
  if (!first) {
    return {
      status: "not_found" as const,
      latitude: null,
      longitude: null,
      source: "nominatim"
    };
  }

  const address = asRecord(first.address);

  return {
    status: "resolved" as const,
    latitude: toNullableNumberString(first.lat),
    longitude: toNullableNumberString(first.lon),
    source: "nominatim",
    resolvedAddress: {
      street: address
        ? [address.house_number, address.road]
            .filter((part) => typeof part === "string" && part.trim().length > 0)
            .join(" ")
        : null,
      city: address
        ? toNullableText(
            [address.city, address.town, address.village].find(
              (part) => typeof part === "string" && part.trim().length > 0
            ) ?? null
          )
        : null,
      state: address ? toNullableText(address.state) : null,
      zipCode: address ? toNullableText(address.postcode) : null
    }
  };
}

export async function geocodeRouteSourceBatch(params: {
  databaseUrl: string;
  sourceBatchId: string;
  nominatimBaseUrl: string;
  force?: boolean;
}) : Promise<GeocodeRouteSourceBatchResult> {
  const { db } = getDb(params.databaseUrl);

  const batchRows = await db
    .select({ id: routeSourceBatches.id })
    .from(routeSourceBatches)
    .where(eq(routeSourceBatches.id, params.sourceBatchId))
    .limit(1);

  if (!batchRows[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Route source batch não encontrado" };
  }

  const candidates = await db
    .select({
      id: routeCandidates.id,
      addressLine1: routeCandidates.addressLine1,
      city: routeCandidates.city,
      state: routeCandidates.state,
      zipCode: routeCandidates.zipCode,
      normalizedAddressLine1: routeCandidates.normalizedAddressLine1,
      normalizedCity: routeCandidates.normalizedCity,
      normalizedState: routeCandidates.normalizedState,
      normalizedZipCode: routeCandidates.normalizedZipCode,
      geocodeStatus: routeCandidates.geocodeStatus
    })
    .from(routeCandidates)
    .where(eq(routeCandidates.sourceBatchId, params.sourceBatchId));

  const targetCandidates = params.force
    ? candidates
    : candidates.filter((candidate) => candidate.geocodeStatus === "pending" || candidate.geocodeStatus === "failed");

  let resolvedCandidates = 0;
  let preciseCandidates = 0;
  let approximateCandidates = 0;
  let reviewRequiredCandidates = 0;
  let notFoundCandidates = 0;
  let failedCandidates = 0;
  let skippedCandidates = 0;

  for (const candidate of targetCandidates) {
    const geocoded = await geocodeWithNominatim({
      baseUrl: params.nominatimBaseUrl,
      candidate
    });

    const normalizedCandidate =
      candidate.normalizedAddressLine1 || candidate.normalizedCity || candidate.normalizedState || candidate.normalizedZipCode
        ? {
            normalizedAddressLine1: candidate.normalizedAddressLine1,
            normalizedCity: candidate.normalizedCity,
            normalizedState: candidate.normalizedState,
            normalizedZipCode: candidate.normalizedZipCode
          }
        : buildNormalizedAddress(candidate);

    const quality =
      geocoded.status === "resolved" && geocoded.resolvedAddress
        ? classifyGeocodeResult({
            candidate: normalizedCandidate,
            resolved: geocoded.resolvedAddress
          })
        : geocoded.status === "not_found"
          ? {
              quality: "not_found" as const,
              reviewRequired: true,
              reviewReason: "Nenhum resultado retornado pelo geocoder"
            }
          : geocoded.status === "skipped"
            ? {
                quality: "needs_review" as const,
                reviewRequired: true,
                reviewReason: "Endereço insuficiente para geocodificação"
              }
            : {
                quality: null,
                reviewRequired: true,
                reviewReason: "Falha temporária no provedor de geocode"
              };

    await db.transaction(async (tx) => {
      await tx
        .update(routeCandidates)
        .set({
          normalizedAddressLine1: normalizedCandidate.normalizedAddressLine1,
          normalizedCity: normalizedCandidate.normalizedCity,
          normalizedState: normalizedCandidate.normalizedState,
          normalizedZipCode: normalizedCandidate.normalizedZipCode,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
          geocodeStatus: geocoded.status satisfies GeocodeStatus,
          geocodeQuality: quality.quality,
          geocodeSource: geocoded.source,
          geocodeReviewRequired: quality.reviewRequired,
          geocodeReviewReason: quality.reviewReason,
          geocodedAt: sql`now()`,
          updatedAt: sql`now()`
        })
        .where(eq(routeCandidates.id, candidate.id));

      const routeRows = await tx
        .select({ id: routes.id })
        .from(routeStops)
        .innerJoin(routes, eq(routes.id, routeStops.routeId))
        .where(eq(routeStops.candidateId, candidate.id));

      if (routeRows.length > 0) {
        await tx
          .update(routeStops)
          .set({
            normalizedAddressLine1: normalizedCandidate.normalizedAddressLine1,
            normalizedCity: normalizedCandidate.normalizedCity,
            normalizedState: normalizedCandidate.normalizedState,
            normalizedZipCode: normalizedCandidate.normalizedZipCode,
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
            geocodeStatus: geocoded.status satisfies GeocodeStatus,
            geocodeQuality: quality.quality,
            geocodeSource: geocoded.source,
            geocodeReviewRequired: quality.reviewRequired,
            geocodeReviewReason: quality.reviewReason,
            geocodedAt: sql`now()`,
            updatedAt: sql`now()`
          })
          .where(eq(routeStops.candidateId, candidate.id));
      }
    });

    if (geocoded.status === "resolved") {
      resolvedCandidates += 1;
      if (quality.quality === "precise") preciseCandidates += 1;
      else if (quality.quality === "approximate") approximateCandidates += 1;
      if (quality.reviewRequired) reviewRequiredCandidates += 1;
    } else if (geocoded.status === "not_found") {
      notFoundCandidates += 1;
      reviewRequiredCandidates += 1;
    } else if (geocoded.status === "failed") {
      failedCandidates += 1;
      reviewRequiredCandidates += 1;
    } else {
      skippedCandidates += 1;
      reviewRequiredCandidates += 1;
    }
  }

  return {
    ok: true,
    batchId: params.sourceBatchId,
    totalCandidates: candidates.length,
    processedCandidates: targetCandidates.length,
    resolvedCandidates,
    preciseCandidates,
    approximateCandidates,
    reviewRequiredCandidates,
    notFoundCandidates,
    failedCandidates,
    skippedCandidates
  };
}
