import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import { closePaymentBatch } from "../modules/payments/close-payment-batch.js";
import {
  PermissionError,
  requireActiveUser,
  requireAuthenticated,
  requireOperationalUser,
  requireRole
} from "../lib/permissions.js";
import { createPaymentBatch } from "../modules/payments/create-payment-batch.js";
import { getPaymentBatchById } from "../modules/payments/get-payment-batch-by-id.js";
import { listPaymentBatches } from "../modules/payments/list-payment-batches.js";
import { payPaymentBatch } from "../modules/payments/pay-payment-batch.js";

export function registerPaymentBatchRoutes(app: FastifyInstance, env: ApiEnv) {
  async function requireAdminOrMaster(request: any) {
    const authSession = await requireAuthenticated(env, request);
    const operationalUser = await requireOperationalUser(env, authSession.user.id);
    requireActiveUser(operationalUser);
    await requireRole({ env, operationalUserId: operationalUser.id, allowed: ["admin", "master"] });
    return operationalUser;
  }

  app.get("/payment-batches", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      return { ok: true, batches: await listPaymentBatches(env.databaseUrl) };
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

  app.get("/payment-batches/:id", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const result = await getPaymentBatchById({
        databaseUrl: env.databaseUrl,
        batchId: (request.params as any).id as string
      });

      if (!result) {
        reply.status(404);
        return { ok: false, error: "NOT_FOUND", message: "Lote não encontrado" };
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

  app.post("/payment-batches", async (request, reply) => {
    try {
      const operationalUser = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const result = await createPaymentBatch({
        databaseUrl: env.databaseUrl,
        actorUserId: operationalUser.id,
        body: request.body
      });

      if (!result.ok) {
        const status =
          result.error === "NOT_FOUND"
            ? 404
            : result.error === "CONFLICT"
              ? 409
              : result.error === "INVALID_STATUS"
                ? 409
                : result.error === "ORDER_INCOMPLETE"
                  ? 422
                  : 400;
        reply.status(status);
        return result;
      }

      return result;
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

  app.post("/payment-batches/:id/close", async (request, reply) => {
    try {
      const operationalUser = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const result = await closePaymentBatch({
        databaseUrl: env.databaseUrl,
        batchId: (request.params as any).id as string,
        actorUserId: operationalUser.id
      });

      if (!result.ok) {
        const status =
          result.error === "NOT_FOUND" ? 404 : result.error === "ORDER_INCOMPLETE" ? 422 : 409;
        reply.status(status);
        return result;
      }

      return result;
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

  app.post("/payment-batches/:id/pay", async (request, reply) => {
    try {
      const operationalUser = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const result = await payPaymentBatch({
        databaseUrl: env.databaseUrl,
        batchId: (request.params as any).id as string,
        actorUserId: operationalUser.id
      });

      if (!result.ok) {
        const status =
          result.error === "NOT_FOUND" ? 404 : result.error === "ORDER_INCOMPLETE" ? 422 : 409;
        reply.status(status);
        return result;
      }

      return result;
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
