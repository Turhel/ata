import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import {
  PermissionError,
  requireActiveUser,
  requireAuthenticated,
  requireOperationalUser,
  requireRole
} from "../lib/permissions.js";
import { getPoolImportBatchById } from "../modules/orders/get-pool-import-batch.js";
import { importPoolFromJsonNormalized } from "../modules/orders/import-pool-json.js";

export function registerPoolImportRoutes(app: FastifyInstance, env: ApiEnv) {
  async function requireAdminOrMaster(request: any) {
    const authSession = await requireAuthenticated(env, request);
    const operationalUser = await requireOperationalUser(env, authSession.user.id);
    requireActiveUser(operationalUser);
    await requireRole({ env, operationalUserId: operationalUser.id, allowed: ["admin", "master"] });
    return { authSession, operationalUser };
  }

  app.post("/pool-import", async (request, reply) => {
    try {
      const { operationalUser } = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const body = request.body as any;
      if (!body || typeof body !== "object") {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "Body JSON inválido" };
      }

      const fileName = body.fileName;
      const items = body.items;

      if (typeof fileName !== "string" || !Array.isArray(items)) {
        reply.status(400);
        return {
          ok: false,
          error: "BAD_REQUEST",
          message: "Payload inválido: esperado { fileName: string, items: array }"
        };
      }

      const result = await importPoolFromJsonNormalized({
        databaseUrl: env.databaseUrl,
        importedByUserId: operationalUser.id,
        payload: { fileName, items }
      });

      return {
        ok: true,
        batch: {
          id: result.batchId,
          fileName,
          status: result.status,
          counters: {
            totalRows: result.totalRows,
            insertedRows: result.insertedRows,
            updatedRows: result.updatedRows,
            ignoredRows: result.ignoredRows,
            errorRows: result.errorRows
          }
        }
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

  app.get("/pool-import/batches/:id", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const id = (request.params as any).id as string;
      const result = await getPoolImportBatchById({ databaseUrl: env.databaseUrl, batchId: id });
      if (!result) {
        reply.status(404);
        return { ok: false, error: "NOT_FOUND", message: "Batch não encontrado" };
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
}
