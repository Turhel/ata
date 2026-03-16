import { asc, eq } from "drizzle-orm";
import { routeEvents, routes, routeStops } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type GetRouteResult =
  | {
      ok: true;
      route: {
        id: string;
        routeDate: string;
        sourceBatchId: string;
        inspectorAccountId: string;
        inspectorId: string | null;
        assistantUserId: string | null;
        originCity: string | null;
        optimizationMode: string;
        status: (typeof routes.status.enumValues)[number];
        version: number;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      };
      stops: Array<{
        id: string;
        seq: number;
        candidateId: string | null;
        orderId: string | null;
        routeCategory: (typeof routeStops.routeCategory.enumValues)[number];
        stopStatus: (typeof routeStops.stopStatus.enumValues)[number];
        residentName: string | null;
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        latitude: string | null;
        longitude: string | null;
        geocodeStatus: string;
        geocodeSource: string | null;
        geocodedAt: Date | null;
        dueDate: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>;
      events: Array<{
        id: string;
        eventType: (typeof routeEvents.eventType.enumValues)[number];
        fromStatus: (typeof routes.status.enumValues)[number] | null;
        toStatus: (typeof routes.status.enumValues)[number] | null;
        performedByUserId: string;
        reason: string | null;
        metadata: unknown;
        createdAt: Date;
      }>;
    }
  | { ok: false; error: "NOT_FOUND"; message: string };

export async function getRouteById(params: {
  databaseUrl: string;
  routeId: string;
}): Promise<GetRouteResult> {
  const { db } = getDb(params.databaseUrl);

  const row = await db
    .select({
      id: routes.id,
      routeDate: routes.routeDate,
      sourceBatchId: routes.sourceBatchId,
      inspectorAccountId: routes.inspectorAccountId,
      inspectorId: routes.inspectorId,
      assistantUserId: routes.assistantUserId,
      originCity: routes.originCity,
      optimizationMode: routes.optimizationMode,
      status: routes.status,
      version: routes.version,
      publishedAt: routes.publishedAt,
      createdAt: routes.createdAt,
      updatedAt: routes.updatedAt
    })
    .from(routes)
    .where(eq(routes.id, params.routeId))
    .limit(1);

  const route = row[0];
  if (!route) {
    return { ok: false, error: "NOT_FOUND", message: "Rota não encontrada" };
  }

  const stops = await db
    .select({
      id: routeStops.id,
      seq: routeStops.seq,
      candidateId: routeStops.candidateId,
      orderId: routeStops.orderId,
      routeCategory: routeStops.routeCategory,
      stopStatus: routeStops.stopStatus,
      residentName: routeStops.residentName,
      addressLine1: routeStops.addressLine1,
      addressLine2: routeStops.addressLine2,
      city: routeStops.city,
      state: routeStops.state,
      zipCode: routeStops.zipCode,
      latitude: routeStops.latitude,
      longitude: routeStops.longitude,
      geocodeStatus: routeStops.geocodeStatus,
      geocodeSource: routeStops.geocodeSource,
      geocodedAt: routeStops.geocodedAt,
      dueDate: routeStops.dueDate,
      createdAt: routeStops.createdAt,
      updatedAt: routeStops.updatedAt
    })
    .from(routeStops)
    .where(eq(routeStops.routeId, params.routeId))
    .orderBy(asc(routeStops.seq));

  const events = await db
    .select({
      id: routeEvents.id,
      eventType: routeEvents.eventType,
      fromStatus: routeEvents.fromStatus,
      toStatus: routeEvents.toStatus,
      performedByUserId: routeEvents.performedByUserId,
      reason: routeEvents.reason,
      metadata: routeEvents.metadata,
      createdAt: routeEvents.createdAt
    })
    .from(routeEvents)
    .where(eq(routeEvents.routeId, params.routeId))
    .orderBy(asc(routeEvents.createdAt));

  return { ok: true, route, stops, events };
}
