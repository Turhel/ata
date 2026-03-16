import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import { closePaymentBatch } from "../modules/payments/close-payment-batch.js";
import { normalizeApiError } from "../lib/api-errors.js";
import {
  PermissionError,
  requireActiveUser,
  requireAuthenticated,
  requireOperationalUser,
  requireRole
} from "../lib/permissions.js";
import { buildListMeta, normalizeSearch, parsePagination } from "../lib/listing.js";
import { createPaymentBatch } from "../modules/payments/create-payment-batch.js";
import { getPaymentBatchById } from "../modules/payments/get-payment-batch-by-id.js";
import { listPaymentBatches } from "../modules/payments/list-payment-batches.js";
import { payPaymentBatch } from "../modules/payments/pay-payment-batch.js";

export function registerPaymentBatchRoutes(app: FastifyInstance, env: ApiEnv) {
  const allowedStatuses = ["open", "closed", "paid", "cancelled"] as const;

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

      const query = (request.query as Record<string, unknown> | undefined) ?? {};
      const pagination = parsePagination(query, { pageSize: 20, maxPageSize: 100 });
      const statusRaw = typeof query.status === "string" ? query.status.trim() : "";
      if (statusRaw && !allowedStatuses.includes(statusRaw as (typeof allowedStatuses)[number])) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "Parâmetro 'status' inválido para /payment-batches" };
      }
      const result = await listPaymentBatches({
        databaseUrl: env.databaseUrl,
        status: (statusRaw || undefined) as (typeof allowedStatuses)[number] | undefined,
        search: normalizeSearch(query.search),
        ...pagination
      });

      return {
        ok: true,
        batches: result.batches,
        meta: buildListMeta({ page: pagination.page, pageSize: pagination.pageSize, total: result.total })
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
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ...result,
          error: normalized.error,
          ...(normalized.legacyCode ? { details: { ...(result as any).details, code: normalized.legacyCode } } : {})
        } as any;
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
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ...result,
          error: normalized.error,
          ...(normalized.legacyCode ? { details: { ...(result as any).details, code: normalized.legacyCode } } : {})
        } as any;
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
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ...result,
          error: normalized.error,
          ...(normalized.legacyCode ? { details: { ...(result as any).details, code: normalized.legacyCode } } : {})
        } as any;
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
