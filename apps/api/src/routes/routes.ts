import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import {
  PermissionError,
  requireActiveUser,
  requireAuthenticated,
  requireOperationalUser,
  requireRole
} from "../lib/permissions.js";
import { normalizeApiError } from "../lib/api-errors.js";
import { createRouteSourceBatchFromXlsx } from "../modules/routes/create-route-source-batch.js";
import { createRoute } from "../modules/routes/create-route.js";
import { getRouteById } from "../modules/routes/get-route-by-id.js";
import { publishRoute } from "../modules/routes/publish-route.js";

export function registerRoutesRoutes(app: FastifyInstance, env: ApiEnv) {
  async function requireAdminOrMaster(request: any) {
    const authSession = await requireAuthenticated(env, request);
    const operationalUser = await requireOperationalUser(env, authSession.user.id);
    requireActiveUser(operationalUser);
    await requireRole({ env, operationalUserId: operationalUser.id, allowed: ["admin", "master"] });
    return { authSession, operationalUser };
  }

  app.post("/routes/source-batches/xlsx", async (request, reply) => {
    try {
      const { operationalUser } = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const file = await (request as any).file?.();
      if (!file) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "Arquivo .xlsx não enviado" };
      }

      const fileName = String(file.filename ?? "").trim();
      if (!fileName.toLowerCase().endsWith(".xlsx")) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "Envie um arquivo .xlsx válido" };
      }

      const queryRouteDate = (request.query as any)?.routeDate;
      const routeDateRaw = String((file.fields?.routeDate?.value ?? queryRouteDate ?? "") as any).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(routeDateRaw)) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "Campo routeDate obrigatório (YYYY-MM-DD)" };
      }

      const buffer = await file.toBuffer();
      const result = await createRouteSourceBatchFromXlsx({
        databaseUrl: env.databaseUrl,
        uploadedByUserId: operationalUser.id,
        routeDate: routeDateRaw,
        fileName,
        buffer
      });

      return { ok: true, batch: result };
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

  app.post("/routes", async (request, reply) => {
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

      const sourceBatchId = String(body.sourceBatchId ?? "").trim();
      const routeDate = String(body.routeDate ?? "").trim();
      const inspectorAccountCode = String(body.inspectorAccountCode ?? "").trim();
      const assistantUserId =
        body.assistantUserId == null ? null : String(body.assistantUserId ?? "").trim();
      const replaceExisting = Boolean(body.replaceExisting ?? false);
      const replaceReason = body.replaceReason == null ? null : String(body.replaceReason ?? "").trim();

      if (!sourceBatchId || !routeDate || !inspectorAccountCode) {
        reply.status(400);
        return {
          ok: false,
          error: "BAD_REQUEST",
          message: "Payload inválido: esperado { sourceBatchId, routeDate, inspectorAccountCode }"
        };
      }

      const result = await createRoute({
        databaseUrl: env.databaseUrl,
        createdByUserId: operationalUser.id,
        sourceBatchId,
        routeDate,
        inspectorAccountCode,
        assistantUserId,
        replaceExisting,
        replaceReason
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

  app.post("/routes/:id/publish", async (request, reply) => {
    try {
      const { operationalUser } = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const id = String((request.params as any).id ?? "").trim();
      if (!id) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "id obrigatório" };
      }

      const result = await publishRoute({
        databaseUrl: env.databaseUrl,
        routeId: id,
        publishedByUserId: operationalUser.id
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

  app.get("/routes/:id", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const id = String((request.params as any).id ?? "").trim();
      const result = await getRouteById({ databaseUrl: env.databaseUrl, routeId: id });
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
