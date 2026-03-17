import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { routeEvents, routes } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";
import { getActiveRoleCodeByUserId } from "../users/get-active-role-by-user-id.js";
import { getUserById } from "../users/get-user-by-id.js";

export type ReassignRouteAssistantResult =
  | {
      ok: true;
      routeId: string;
      assistantUserId: string | null;
      updatedAt: string;
    }
  | {
      ok: false;
      error: "NOT_FOUND" | "BAD_REQUEST" | "INVALID_STATUS";
      message: string;
    };

export async function reassignRouteAssistant(params: {
  databaseUrl: string;
  routeId: string;
  assistantUserId: string | null;
  performedByUserId: string;
  reason?: string | null;
}): Promise<ReassignRouteAssistantResult> {
  const { db } = getDb(params.databaseUrl);

  const existingRoute = await db
    .select({
      id: routes.id,
      status: routes.status,
      assistantUserId: routes.assistantUserId
    })
    .from(routes)
    .where(eq(routes.id, params.routeId))
    .limit(1);

  const route = existingRoute[0];
  if (!route) {
    return { ok: false, error: "NOT_FOUND", message: "Rota não encontrada" };
  }

  if (!["draft", "published"].includes(route.status)) {
    return {
      ok: false,
      error: "INVALID_STATUS",
      message: `Status inválido para reatribuição (status=${route.status})`
    };
  }

  let nextAssistantUserId: string | null = null;
  if (params.assistantUserId) {
    const assistant = await getUserById(params.databaseUrl, params.assistantUserId);
    if (!assistant) {
      return { ok: false, error: "NOT_FOUND", message: "Assistant não encontrado" };
    }
    if (assistant.status !== "active") {
      return { ok: false, error: "BAD_REQUEST", message: "Assistant não está ativo" };
    }
    const roleCode = await getActiveRoleCodeByUserId(params.databaseUrl, assistant.id);
    if (roleCode !== "assistant") {
      return { ok: false, error: "BAD_REQUEST", message: "Usuário informado não tem role assistant ativa" };
    }
    nextAssistantUserId = assistant.id;
  }

  const updatedRows = await db
    .update(routes)
    .set({
      assistantUserId: nextAssistantUserId,
      updatedAt: sql`now()`
    })
    .where(and(eq(routes.id, params.routeId)))
    .returning({
      id: routes.id,
      updatedAt: routes.updatedAt
    });

  const updatedRoute = updatedRows[0];
  if (!updatedRoute) {
    return { ok: false, error: "NOT_FOUND", message: "Rota não encontrada após atualização" };
  }

  await db.insert(routeEvents).values({
    id: randomUUID(),
    routeId: params.routeId,
    eventType: "assistant_reassigned",
    fromStatus: route.status,
    toStatus: route.status,
    performedByUserId: params.performedByUserId,
    reason: params.reason?.trim() || null,
    metadata: {
      previousAssistantUserId: route.assistantUserId,
      nextAssistantUserId
    }
  });

  return {
    ok: true,
    routeId: updatedRoute.id,
    assistantUserId: nextAssistantUserId,
    updatedAt: updatedRoute.updatedAt.toISOString()
  };
}
