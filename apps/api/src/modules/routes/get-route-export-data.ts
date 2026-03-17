import { eq } from "drizzle-orm";
import { inspectorAccounts, inspectors, routeStops, routes, users } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type RouteExportData =
  | {
      ok: true;
      route: {
        id: string;
        routeDate: string;
        status: (typeof routes.status.enumValues)[number];
        version: number;
        originCity: string | null;
        inspectorAccountCode: string;
        inspector: {
          id: string | null;
          fullName: string | null;
          email: string | null;
        };
        assistant: {
          id: string | null;
          fullName: string | null;
          email: string | null;
        };
      };
      stops: Array<{
        seq: number;
        routeCategory: (typeof routeStops.routeCategory.enumValues)[number];
        residentName: string | null;
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        latitude: string | null;
        longitude: string | null;
        geocodeReviewRequired: boolean;
        geocodeQuality: string | null;
      }>;
    }
  | { ok: false; error: "NOT_FOUND" | "INVALID_STATUS"; message: string };

export async function getRouteExportData(params: {
  databaseUrl: string;
  routeId: string;
}): Promise<RouteExportData> {
  const { db } = getDb(params.databaseUrl);

  const rows = await db
    .select({
      id: routes.id,
      routeDate: routes.routeDate,
      status: routes.status,
      version: routes.version,
      originCity: routes.originCity,
      inspectorAccountCode: inspectorAccounts.accountCode,
      inspectorId: inspectors.id,
      inspectorFullName: inspectors.fullName,
      inspectorEmail: inspectors.email,
      assistantId: users.id,
      assistantFullName: users.fullName,
      assistantEmail: users.email
    })
    .from(routes)
    .innerJoin(inspectorAccounts, eq(inspectorAccounts.id, routes.inspectorAccountId))
    .leftJoin(inspectors, eq(inspectors.id, routes.inspectorId))
    .leftJoin(users, eq(users.id, routes.assistantUserId))
    .where(eq(routes.id, params.routeId))
    .limit(1);

  const route = rows[0];
  if (!route) {
    return { ok: false, error: "NOT_FOUND", message: "Rota não encontrada" };
  }

  if (!["draft", "published"].includes(route.status)) {
    return {
      ok: false,
      error: "INVALID_STATUS",
      message: `Status inválido para exportação (status=${route.status})`
    };
  }

  const stops = await db
    .select({
      seq: routeStops.seq,
      routeCategory: routeStops.routeCategory,
      residentName: routeStops.residentName,
      addressLine1: routeStops.addressLine1,
      addressLine2: routeStops.addressLine2,
      city: routeStops.city,
      state: routeStops.state,
      zipCode: routeStops.zipCode,
      latitude: routeStops.latitude,
      longitude: routeStops.longitude,
      geocodeReviewRequired: routeStops.geocodeReviewRequired,
      geocodeQuality: routeStops.geocodeQuality
    })
    .from(routeStops)
    .where(eq(routeStops.routeId, params.routeId))
    .orderBy(routeStops.seq);

  return {
    ok: true,
    route: {
      id: route.id,
      routeDate: route.routeDate,
      status: route.status,
      version: route.version,
      originCity: route.originCity,
      inspectorAccountCode: route.inspectorAccountCode,
      inspector: {
        id: route.inspectorId,
        fullName: route.inspectorFullName,
        email: route.inspectorEmail
      },
      assistant: {
        id: route.assistantId,
        fullName: route.assistantFullName,
        email: route.assistantEmail
      }
    },
    stops
  };
}
