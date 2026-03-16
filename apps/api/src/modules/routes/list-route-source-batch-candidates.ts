import { and, count, desc, eq } from "drizzle-orm";
import { routeCandidates } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function listRouteSourceBatchCandidates(params: {
  databaseUrl: string;
  sourceBatchId: string;
  review?: "required";
  page: number;
  pageSize: number;
  offset: number;
}) {
  const { db } = getDb(params.databaseUrl);
  const conditions = [eq(routeCandidates.sourceBatchId, params.sourceBatchId)];

  if (params.review === "required") {
    conditions.push(eq(routeCandidates.geocodeReviewRequired, true));
  }

  const whereClause = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: routeCandidates.id,
        lineNumber: routeCandidates.lineNumber,
        externalOrderCode: routeCandidates.externalOrderCode,
        sourceStatus: routeCandidates.sourceStatus,
        sourceInspectorAccountCode: routeCandidates.sourceInspectorAccountCode,
        residentName: routeCandidates.residentName,
        addressLine1: routeCandidates.addressLine1,
        city: routeCandidates.city,
        state: routeCandidates.state,
        zipCode: routeCandidates.zipCode,
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
        geocodeReviewReason: routeCandidates.geocodeReviewReason,
        geocodedAt: routeCandidates.geocodedAt,
        createdAt: routeCandidates.createdAt,
        updatedAt: routeCandidates.updatedAt
      })
      .from(routeCandidates)
      .where(whereClause)
      .orderBy(desc(routeCandidates.lineNumber))
      .limit(params.pageSize)
      .offset(params.offset),
    db.select({ total: count() }).from(routeCandidates).where(whereClause)
  ]);

  return {
    candidates: rows,
    total: totalRows[0]?.total ?? 0
  };
}
