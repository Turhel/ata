import { and, eq, sql } from "drizzle-orm";
import { inspectorAccounts, orders, routeCandidates, routeStops, routes } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";
import type { OperationalUser } from "../users/get-user-by-auth-user-id.js";
import { getActiveRoleCodeByUserId } from "../users/get-active-role-by-user-id.js";

export type GetCurrentOperationalRouteResult =
  | {
      ok: true;
      route: {
        id: string;
        routeDate: string;
        status: (typeof routes.status.enumValues)[number];
        originCity: string | null;
        inspectorAccountCode: string;
        inspectorId: string | null;
        assistantUserId: string | null;
        stopCount: number;
        pendingStops: number;
        reviewStops: number;
      };
      stops: Array<{
        id: string;
        seq: number;
        externalOrderCode: string | null;
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
        geocodeReviewRequired: boolean;
      }>;
      viewer: {
        role: "assistant" | "inspector";
        userId: string;
        inspectorId: string | null;
      };
    }
  | { ok: false; error: "FORBIDDEN" | "NOT_FOUND"; message: string };

export async function getCurrentOperationalRoute(params: {
  databaseUrl: string;
  operationalUser: OperationalUser;
  routeDate: string;
}): Promise<GetCurrentOperationalRouteResult> {
  const role = await getActiveRoleCodeByUserId(params.databaseUrl, params.operationalUser.id);
  if (role !== "assistant" && role !== "inspector") {
    return {
      ok: false,
      error: "FORBIDDEN",
      message: "A visão operacional da rota é restrita a assistant e inspector"
    };
  }

  if (role === "inspector" && !params.operationalUser.inspectorId) {
    return {
      ok: false,
      error: "FORBIDDEN",
      message: "Inspector sem vínculo operacional com inspectors.id"
    };
  }

  const { db } = getDb(params.databaseUrl);
  const routeRows = await db
    .select({
      id: routes.id,
      routeDate: routes.routeDate,
      status: routes.status,
      originCity: routes.originCity,
      inspectorAccountCode: inspectorAccounts.accountCode,
      inspectorId: routes.inspectorId,
      assistantUserId: routes.assistantUserId
    })
    .from(routes)
    .innerJoin(inspectorAccounts, eq(inspectorAccounts.id, routes.inspectorAccountId))
    .where(
      role === "assistant"
        ? and(
            eq(routes.routeDate, params.routeDate),
            eq(routes.status, "published"),
            eq(routes.assistantUserId, params.operationalUser.id)
          )
        : and(
            eq(routes.routeDate, params.routeDate),
            eq(routes.status, "published"),
            eq(routes.inspectorId, params.operationalUser.inspectorId!)
          )
    )
    .limit(1);

  const route = routeRows[0];
  if (!route) {
    return {
      ok: false,
      error: "NOT_FOUND",
      message: "Nenhuma rota operacional publicada encontrada para este usuário nesta data"
    };
  }

  const stops = await db
    .select({
      id: routeStops.id,
      seq: routeStops.seq,
      externalOrderCode: sql<string | null>`coalesce(${orders.externalOrderCode}, ${routeCandidates.externalOrderCode})`,
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
      geocodeReviewRequired: routeStops.geocodeReviewRequired
    })
    .from(routeStops)
    .leftJoin(orders, eq(orders.id, routeStops.orderId))
    .leftJoin(routeCandidates, eq(routeCandidates.id, routeStops.candidateId))
    .where(eq(routeStops.routeId, route.id))
    .orderBy(routeStops.seq);

  return {
    ok: true,
    route: {
      id: route.id,
      routeDate: route.routeDate,
      status: route.status,
      originCity: route.originCity,
      inspectorAccountCode: route.inspectorAccountCode,
      inspectorId: route.inspectorId,
      assistantUserId: route.assistantUserId,
      stopCount: stops.length,
      pendingStops: stops.filter((stop) => stop.stopStatus === "pending").length,
      reviewStops: stops.filter((stop) => stop.geocodeReviewRequired).length
    },
    stops,
    viewer: {
      role,
      userId: params.operationalUser.id,
      inspectorId: params.operationalUser.inspectorId
    }
  };
}
