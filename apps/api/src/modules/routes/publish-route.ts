import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { routeEvents, routes } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type PublishRouteResult =
  | { ok: true; routeId: string; status: (typeof routes.status.enumValues)[number] }
  | { ok: false; error: "NOT_FOUND" | "INVALID_STATUS"; message: string };

export async function publishRoute(params: {
  databaseUrl: string;
  routeId: string;
  publishedByUserId: string;
}): Promise<PublishRouteResult> {
  const { db } = getDb(params.databaseUrl);

  const row = await db
    .select({ id: routes.id, status: routes.status })
    .from(routes)
    .where(eq(routes.id, params.routeId))
    .limit(1);

  const route = row[0];
  if (!route) return { ok: false, error: "NOT_FOUND", message: "Rota não encontrada" };
  if (route.status !== "draft") {
    return { ok: false, error: "INVALID_STATUS", message: `Status inválido para publicar (status=${route.status})` };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(routes)
      .set({
        status: "published",
        publishedAt: sql`now()`,
        publishedByUserId: params.publishedByUserId,
        updatedAt: sql`now()`
      })
      .where(eq(routes.id, params.routeId));

    await tx.insert(routeEvents).values({
      id: randomUUID(),
      routeId: params.routeId,
      eventType: "published",
      fromStatus: "draft",
      toStatus: "published",
      performedByUserId: params.publishedByUserId,
      reason: null,
      metadata: null
    });
  });

  return { ok: true, routeId: params.routeId, status: "published" };
}

