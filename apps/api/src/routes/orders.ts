import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import {
  PermissionError,
  requireActiveUser,
  requireAuthenticated,
  requireOperationalUser,
  requireRole
} from "../lib/permissions.js";
import { approveOrder, rejectOrder, requestFollowUp } from "../modules/orders/admin-review.js";
import { claimOrder } from "../modules/orders/claim-order.js";
import { getOrderById } from "../modules/orders/get-order-by-id.js";
import { listOrders } from "../modules/orders/list-orders.js";
import { listOrdersForAssistant } from "../modules/orders/list-orders-assistant.js";
import { returnToPool } from "../modules/orders/return-to-pool.js";
import { submitOrder } from "../modules/orders/submit-order.js";

export function registerOrdersRoutes(app: FastifyInstance, env: ApiEnv) {
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

      if (role === "admin" || role === "master") {
        const rows = await listOrders(env.databaseUrl);
        return { ok: true, orders: rows };
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
        scope
      });

      return { ok: true, orders: rows };
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
        reply.status(result.error === "NOT_FOUND" ? 404 : 409);
        return { ok: false, error: result.error, message: result.message };
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
        const status =
          result.error === "NOT_FOUND"
            ? 404
            : result.error === "FORBIDDEN"
              ? 403
              : result.error === "ORDER_INCOMPLETE"
                ? 422
                : 409;

        reply.status(status);
        return {
          ok: false,
          error: result.error,
          message: result.message,
          ...(result.details ? { details: result.details } : {})
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
        const status = result.error === "NOT_FOUND" ? 404 : result.error === "ORDER_INCOMPLETE" ? 422 : 409;
        reply.status(status);
        return {
          ok: false,
          error: result.error,
          message: result.message,
          ...(result.details ? { details: result.details } : {})
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
        const status = result.error === "NOT_FOUND" ? 404 : result.error === "ORDER_INCOMPLETE" ? 422 : 409;
        reply.status(status);
        return {
          ok: false,
          error: result.error,
          message: result.message,
          ...(result.details ? { details: result.details } : {})
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
        const status =
          result.error === "NOT_FOUND"
            ? 404
            : result.error === "ORDER_INCOMPLETE"
              ? 422
              : 409;

        reply.status(status);
        return {
          ok: false,
          error: result.error,
          message: result.message,
          ...(result.details ? { details: result.details } : {})
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
        const status = result.error === "NOT_FOUND" ? 404 : result.error === "ORDER_INCOMPLETE" ? 422 : 409;
        reply.status(status);
        return {
          ok: false,
          error: result.error,
          message: result.message,
          ...(result.details ? { details: result.details } : {})
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
