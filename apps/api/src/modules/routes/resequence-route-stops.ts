import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { routeEvents, routes, routeStops } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type ResequenceRouteStopsResult =
  | {
      ok: true;
      routeId: string;
      totalStops: number;
      updatedAt: string;
    }
  | {
      ok: false;
      error: "NOT_FOUND" | "BAD_REQUEST" | "INVALID_STATUS";
      message: string;
    };

export async function resequenceRouteStops(params: {
  databaseUrl: string;
  routeId: string;
  stopIds: string[];
  performedByUserId: string;
  reason?: string | null;
}): Promise<ResequenceRouteStopsResult> {
  const uniqueStopIds = [...new Set(params.stopIds.filter(Boolean))];
  if (uniqueStopIds.length === 0) {
    return { ok: false, error: "BAD_REQUEST", message: "stopIds obrigatório" };
  }
  if (uniqueStopIds.length !== params.stopIds.length) {
    return { ok: false, error: "BAD_REQUEST", message: "stopIds contém valores duplicados" };
  }

  const { db } = getDb(params.databaseUrl);

  const routeRows = await db
    .select({
      id: routes.id,
      status: routes.status
    })
    .from(routes)
    .where(eq(routes.id, params.routeId))
    .limit(1);

  const route = routeRows[0];
  if (!route) {
    return { ok: false, error: "NOT_FOUND", message: "Rota não encontrada" };
  }

  if (!["draft", "published"].includes(route.status)) {
    return {
      ok: false,
      error: "INVALID_STATUS",
      message: `Status inválido para resequenciamento (status=${route.status})`
    };
  }

  const existingStops = await db
    .select({
      id: routeStops.id
    })
    .from(routeStops)
    .where(eq(routeStops.routeId, params.routeId))
    .orderBy(routeStops.seq);

  if (existingStops.length === 0) {
    return { ok: false, error: "BAD_REQUEST", message: "Rota não possui stops para resequenciar" };
  }

  const existingIds = new Set(existingStops.map((stop) => stop.id));
  if (existingStops.length !== uniqueStopIds.length || uniqueStopIds.some((stopId) => !existingIds.has(stopId))) {
    return {
      ok: false,
      error: "BAD_REQUEST",
      message: "stopIds deve conter exatamente os stops atuais da rota"
    };
  }

  const updatedAt = await db.transaction(async (tx) => {
    await tx
      .update(routeStops)
      .set({
        seq: sql`${routeStops.seq} + 1000`,
        updatedAt: sql`now()`
      })
      .where(eq(routeStops.routeId, params.routeId));

    for (const [index, stopId] of uniqueStopIds.entries()) {
      await tx
        .update(routeStops)
        .set({
          seq: index + 1,
          updatedAt: sql`now()`
        })
        .where(and(eq(routeStops.id, stopId), eq(routeStops.routeId, params.routeId)));
    }

    const routeUpdate = await tx
      .update(routes)
      .set({ updatedAt: sql`now()` })
      .where(eq(routes.id, params.routeId))
      .returning({ updatedAt: routes.updatedAt });

    await tx.insert(routeEvents).values({
      id: randomUUID(),
      routeId: params.routeId,
      eventType: "reordered",
      fromStatus: route.status,
      toStatus: route.status,
      performedByUserId: params.performedByUserId,
      reason: params.reason?.trim() || null,
      metadata: {
        totalStops: uniqueStopIds.length,
        stopIds: uniqueStopIds
      }
    });

    return routeUpdate[0]?.updatedAt ?? new Date();
  });

  return {
    ok: true,
    routeId: params.routeId,
    totalStops: uniqueStopIds.length,
    updatedAt: updatedAt.toISOString()
  };
}
