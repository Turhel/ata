import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import { eq } from "drizzle-orm";
import {
  PermissionError,
  requireActiveUser,
  requireAuthenticated,
  requireOperationalUser,
  requireRole
} from "../lib/permissions.js";
import { normalizeApiError } from "../lib/api-errors.js";
import { orders } from "../db/schema.js";
import { getDb } from "../lib/db.js";
import { buildListMeta, normalizeSearch, parsePagination } from "../lib/listing.js";
import { approveOrder, rejectOrder, requestFollowUp } from "../modules/orders/admin-review.js";
import { claimOrder } from "../modules/orders/claim-order.js";
import {
  createOrderNoteAsAdminOrMaster,
  createOrderNoteAsAssistant
} from "../modules/orders/create-order-note.js";
import { getOrderById } from "../modules/orders/get-order-by-id.js";
import { listOrderEvents } from "../modules/orders/list-order-events.js";
import { listOrderNotes } from "../modules/orders/list-order-notes.js";
import { listOrders } from "../modules/orders/list-orders.js";
import { listOrdersForAssistant } from "../modules/orders/list-orders-assistant.js";
import { patchOrderAsAdminOrMaster, patchOrderAsAssistant } from "../modules/orders/patch-order.js";
import { returnToPool } from "../modules/orders/return-to-pool.js";
import { resubmitOrder } from "../modules/orders/resubmit-order.js";
import { submitOrder } from "../modules/orders/submit-order.js";
import { getActiveAssistantIdsByAdmin } from "../modules/team-assignments/get-active-assistant-ids-by-admin.js";

export function registerOrdersRoutes(app: FastifyInstance, env: ApiEnv) {
  const allowedOrderStatuses = [
    "available",
    "in_progress",
    "submitted",
    "follow_up",
    "rejected",
    "approved",
    "batched",
    "paid",
    "cancelled",
    "archived"
  ] as const;

  async function requireAdminOrMaster(request: any) {
    const authSession = await requireAuthenticated(env, request);
    const operationalUser = await requireOperationalUser(env, authSession.user.id);
    requireActiveUser(operationalUser);
    await requireRole({ env, operationalUserId: operationalUser.id, allowed: ["admin", "master"] });
    return operationalUser;
  }

  async function requireAssistant(request: any) {
    const authSession = await requireAuthenticated(env, request);
    const operationalUser = await requireOperationalUser(env, authSession.user.id);
    requireActiveUser(operationalUser);
    await requireRole({ env, operationalUserId: operationalUser.id, allowed: "assistant" });
    return operationalUser;
  }

  app.get("/orders", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);
      const operationalUser = await requireOperationalUser(env, authSession.user.id);
      requireActiveUser(operationalUser);
      const role = await requireRole({
        env,
        operationalUserId: operationalUser.id,
        allowed: ["admin", "master", "assistant", "inspector"]
      });

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const query = (request.query as Record<string, unknown> | undefined) ?? {};
      const pagination = parsePagination(query, { pageSize: 20, maxPageSize: 100 });
      const search = normalizeSearch(query.search);

      if (role === "admin" || role === "master") {
        const scopeRaw = typeof query.scope === "string" ? query.scope.trim() : "";
        if (scopeRaw && scopeRaw !== "all" && scopeRaw !== "team") {
          reply.status(400);
          return { ok: false, error: "BAD_REQUEST", message: "Parâmetro 'scope' inválido para /orders" };
        }
        if (role === "master" && scopeRaw === "team") {
          reply.status(400);
          return { ok: false, error: "BAD_REQUEST", message: "scope=team é válido apenas para admin" };
        }

        const statusRaw = typeof query.status === "string" ? query.status.trim() : "";
        if (statusRaw && !allowedOrderStatuses.includes(statusRaw as (typeof allowedOrderStatuses)[number])) {
          reply.status(400);
          return { ok: false, error: "BAD_REQUEST", message: "Parâmetro 'status' inválido para /orders" };
        }

        const assistantUserIds =
          role === "admin" && scopeRaw === "team"
            ? await getActiveAssistantIdsByAdmin({
                databaseUrl: env.databaseUrl,
                adminUserId: operationalUser.id
              })
            : undefined;

        const result = await listOrders({
          databaseUrl: env.databaseUrl,
          status: (statusRaw || null) as (typeof allowedOrderStatuses)[number] | null,
          search,
          assistantUserIds,
          includeAvailableWhenTeamScoped: scopeRaw === "team",
          ...pagination
        });
        return {
          ok: true,
          orders: result.orders,
          meta: buildListMeta({ page: pagination.page, pageSize: pagination.pageSize, total: result.total })
        };
      }

      if (role !== "assistant") {
        reply.status(403);
        return { ok: false, error: "FORBIDDEN", message: "Role não permitida para listar orders" };
      }

      const rawScope = (request.query as any)?.scope as string | undefined;
      const scope = rawScope?.trim() || "mine";
      if (scope !== "available" && scope !== "mine" && scope !== "follow-up") {
        reply.status(400);
        return {
          ok: false,
          error: "BAD_REQUEST",
          message: "Parâmetro 'scope' inválido. Use: available | mine | follow-up"
        };
      }

      const rows = await listOrdersForAssistant({
        databaseUrl: env.databaseUrl,
        assistantUserId: operationalUser.id,
        scope,
        search,
        ...pagination
      });

      return {
        ok: true,
        orders: rows.orders,
        meta: buildListMeta({ page: pagination.page, pageSize: pagination.pageSize, total: rows.total })
      };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });

  app.get("/orders/:id", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const id = (request.params as any).id as string;
      const result = await getOrderById({ databaseUrl: env.databaseUrl, orderId: id });
      if (!result) {
        reply.status(404);
        return { ok: false, error: "NOT_FOUND", message: "Order não encontrada" };
      }

      return { ok: true, ...result };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });

  app.get("/orders/:id/events", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);
      const operationalUser = await requireOperationalUser(env, authSession.user.id);
      requireActiveUser(operationalUser);
      const role = await requireRole({
        env,
        operationalUserId: operationalUser.id,
        allowed: ["admin", "master", "assistant", "inspector"]
      });

      if (role === "inspector") {
        reply.status(403);
        return { ok: false, error: "FORBIDDEN", message: "Role não permitida para consultar eventos" };
      }

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const id = (request.params as any).id as string;

      const { db } = getDb(env.databaseUrl);
      const existing = await db
        .select({ id: orders.id, assistantUserId: orders.assistantUserId })
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      const row = existing[0];
      if (!row) {
        reply.status(404);
        return { ok: false, error: "NOT_FOUND", message: "Order não encontrada" };
      }

      if (role === "assistant" && row.assistantUserId !== operationalUser.id) {
        reply.status(403);
        return { ok: false, error: "FORBIDDEN", message: "Você não tem acesso aos eventos desta order" };
      }

      const events = await listOrderEvents({ databaseUrl: env.databaseUrl, orderId: id });
      return { ok: true, events };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });

  app.get("/orders/:id/notes", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);
      const operationalUser = await requireOperationalUser(env, authSession.user.id);
      requireActiveUser(operationalUser);
      const role = await requireRole({
        env,
        operationalUserId: operationalUser.id,
        allowed: ["admin", "master", "assistant", "inspector"]
      });

      if (role === "inspector") {
        reply.status(403);
        return { ok: false, error: "FORBIDDEN", message: "Role não permitida para consultar notas" };
      }

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const id = (request.params as any).id as string;

      const { db } = getDb(env.databaseUrl);
      const existing = await db
        .select({ id: orders.id, assistantUserId: orders.assistantUserId })
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      const row = existing[0];
      if (!row) {
        reply.status(404);
        return { ok: false, error: "NOT_FOUND", message: "Order não encontrada" };
      }

      if (role === "assistant" && row.assistantUserId !== operationalUser.id) {
        reply.status(403);
        return { ok: false, error: "FORBIDDEN", message: "Você não tem acesso às notas desta order" };
      }

      const notes = await listOrderNotes({
        databaseUrl: env.databaseUrl,
        orderId: id,
        includeInternal: role === "admin" || role === "master"
      });

      return { ok: true, notes };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });

  app.post("/orders/:id/notes", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);
      const operationalUser = await requireOperationalUser(env, authSession.user.id);
      requireActiveUser(operationalUser);
      const role = await requireRole({
        env,
        operationalUserId: operationalUser.id,
        allowed: ["admin", "master", "assistant", "inspector"]
      });

      if (role === "inspector") {
        reply.status(403);
        return { ok: false, error: "FORBIDDEN", message: "Role não permitida para criar notas" };
      }

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const id = (request.params as any).id as string;
      const body = request.body as unknown;

      const result =
        role === "assistant"
          ? await createOrderNoteAsAssistant({
              databaseUrl: env.databaseUrl,
              orderId: id,
              authorUserId: operationalUser.id,
              body
            })
          : await createOrderNoteAsAdminOrMaster({
              databaseUrl: env.databaseUrl,
              orderId: id,
              authorUserId: operationalUser.id,
              body
            });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(normalized.legacyCode ? { details: { code: normalized.legacyCode } } : {})
        };
      }

      return { ok: true, note: result.note };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });

  app.post("/orders/:id/claim", async (request, reply) => {
    try {
      const actor = await requireAssistant(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const id = (request.params as any).id as string;
      const result = await claimOrder({
        databaseUrl: env.databaseUrl,
        orderId: id,
        actorUserId: actor.id
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(normalized.legacyCode ? { details: { code: normalized.legacyCode } } : {})
        };
      }

      return { ok: true, order: result.order };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });

  app.post("/orders/:id/submit", async (request, reply) => {
    try {
      const actor = await requireAssistant(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const id = (request.params as any).id as string;
      const result = await submitOrder({
        databaseUrl: env.databaseUrl,
        orderId: id,
        actorUserId: actor.id
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(result.details || normalized.legacyCode
            ? { details: { ...(result.details ?? {}), ...(normalized.legacyCode ? { code: normalized.legacyCode } : {}) } }
            : {})
        };
      }

      return { ok: true, order: result.order };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });

  app.post("/orders/:id/resubmit", async (request, reply) => {
    try {
      const actor = await requireAssistant(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const id = (request.params as any).id as string;
      const result = await resubmitOrder({
        databaseUrl: env.databaseUrl,
        orderId: id,
        actorUserId: actor.id
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(result.details || normalized.legacyCode
            ? { details: { ...(result.details ?? {}), ...(normalized.legacyCode ? { code: normalized.legacyCode } : {}) } }
            : {})
        };
      }

      return { ok: true, order: result.order };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });

  app.patch("/orders/:id", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);
      const operationalUser = await requireOperationalUser(env, authSession.user.id);
      requireActiveUser(operationalUser);
      const role = await requireRole({ env, operationalUserId: operationalUser.id, allowed: ["admin", "master", "assistant"] });

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const id = (request.params as any).id as string;
      const body = request.body as unknown;

      const result =
        role === "assistant"
          ? await patchOrderAsAssistant({
              databaseUrl: env.databaseUrl,
              orderId: id,
              actorUserId: operationalUser.id,
              body
            })
          : await patchOrderAsAdminOrMaster({ databaseUrl: env.databaseUrl, orderId: id, body });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(result.details || normalized.legacyCode
            ? { details: { ...(result.details ?? {}), ...(normalized.legacyCode ? { code: normalized.legacyCode } : {}) } }
            : {})
        };
      }

      return { ok: true, order: result.order };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });

  app.post("/orders/:id/follow-up", async (request, reply) => {
    try {
      const actor = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const body = request.body as any;
      const reason = typeof body?.reason === "string" ? body.reason : "";

      const id = (request.params as any).id as string;
      const result = await requestFollowUp({
        databaseUrl: env.databaseUrl,
        orderId: id,
        actorUserId: actor.id,
        reason
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(result.details || normalized.legacyCode
            ? { details: { ...(result.details ?? {}), ...(normalized.legacyCode ? { code: normalized.legacyCode } : {}) } }
            : {})
        };
      }

      return { ok: true, order: result.order };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });

  app.post("/orders/:id/reject", async (request, reply) => {
    try {
      const actor = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const body = request.body as any;
      const reason = typeof body?.reason === "string" ? body.reason : "";

      const id = (request.params as any).id as string;
      const result = await rejectOrder({
        databaseUrl: env.databaseUrl,
        orderId: id,
        actorUserId: actor.id,
        reason
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(result.details || normalized.legacyCode
            ? { details: { ...(result.details ?? {}), ...(normalized.legacyCode ? { code: normalized.legacyCode } : {}) } }
            : {})
        };
      }

      return { ok: true, order: result.order };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });

  app.post("/orders/:id/approve", async (request, reply) => {
    try {
      const actor = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const id = (request.params as any).id as string;
      const result = await approveOrder({
        databaseUrl: env.databaseUrl,
        orderId: id,
        actorUserId: actor.id
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(result.details || normalized.legacyCode
            ? { details: { ...(result.details ?? {}), ...(normalized.legacyCode ? { code: normalized.legacyCode } : {}) } }
            : {})
        };
      }

      return { ok: true, order: result.order };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });

  app.post("/orders/:id/return-to-pool", async (request, reply) => {
    try {
      const actor = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const body = request.body as any;
      const reason = typeof body?.reason === "string" ? body.reason : "";

      const id = (request.params as any).id as string;
      const result = await returnToPool({
        databaseUrl: env.databaseUrl,
        orderId: id,
        actorUserId: actor.id,
        reason
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(result.details || normalized.legacyCode
            ? { details: { ...(result.details ?? {}), ...(normalized.legacyCode ? { code: normalized.legacyCode } : {}) } }
            : {})
        };
      }

      return { ok: true, order: result.order };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });
}
