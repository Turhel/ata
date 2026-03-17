import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import {
  buildListMeta,
  parsePagination
} from "../lib/listing.js";
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
import { exportRouteEmailPreview } from "../modules/routes/export-route-email-preview.js";
import { exportRouteGpx } from "../modules/routes/export-route-gpx.js";
import { geocodeRouteSourceBatch } from "../modules/routes/geocode-route-source-batch.js";
import { getCurrentOperationalRoute } from "../modules/routes/get-current-operational-route.js";
import { getRouteDayClose } from "../modules/routes/get-route-day-close.js";
import { getRouteById } from "../modules/routes/get-route-by-id.js";
import { importRouteFromGpx } from "../modules/routes/import-route-from-gpx.js";
import { listRouteSourceBatchCandidates } from "../modules/routes/list-route-source-batch-candidates.js";
import { listRouteDaySummaries } from "../modules/routes/list-route-day-summaries.js";
import { listRouteHistorySummary } from "../modules/routes/list-route-history-summary.js";
import { listRoutes } from "../modules/routes/list-routes.js";
import { overrideRouteCandidateGeocode } from "../modules/routes/override-route-candidate-geocode.js";
import { publishRoute } from "../modules/routes/publish-route.js";
import { reassignRouteAssistant } from "../modules/routes/reassign-route-assistant.js";
import { resequenceRouteStops } from "../modules/routes/resequence-route-stops.js";
import { upsertRouteDayClose } from "../modules/routes/upsert-route-day-close.js";

export function registerRoutesRoutes(app: FastifyInstance, env: ApiEnv) {
  async function requireAdminOrMaster(request: any) {
    const authSession = await requireAuthenticated(env, request);
    const operationalUser = await requireOperationalUser(env, authSession.user.id);
    requireActiveUser(operationalUser);
    await requireRole({ env, operationalUserId: operationalUser.id, allowed: ["admin", "master"] });
    return { authSession, operationalUser };
  }

  app.get("/routes", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const query = (request.query as Record<string, unknown> | undefined) ?? {};
      const routeDate = typeof query.routeDate === "string" ? query.routeDate.trim() : "";
      const inspectorAccountCode =
        typeof query.inspectorAccountCode === "string" ? query.inspectorAccountCode.trim() : "";
      const status = typeof query.status === "string" ? query.status.trim() : "";

      if (routeDate && !/^\d{4}-\d{2}-\d{2}$/.test(routeDate)) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "Parâmetro routeDate inválido (YYYY-MM-DD)" };
      }

      const allowedStatuses = new Set(["draft", "published", "superseded", "cancelled"]);
      if (status && !allowedStatuses.has(status)) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "Parâmetro status inválido para /routes" };
      }

      const pagination = parsePagination(query, { pageSize: 20, maxPageSize: 100 });
      const result = await listRoutes({
        databaseUrl: env.databaseUrl,
        routeDate: routeDate || undefined,
        status: (status || undefined) as any,
        inspectorAccountCode: inspectorAccountCode || undefined,
        ...pagination
      });

      return {
        ok: true,
        routes: result.routes,
        meta: buildListMeta({
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: result.total
        })
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

  app.get("/routes/day-summary", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const query = (request.query as Record<string, unknown> | undefined) ?? {};
      const routeDate = typeof query.routeDate === "string" ? query.routeDate.trim() : "";
      const inspectorAccountCode =
        typeof query.inspectorAccountCode === "string" ? query.inspectorAccountCode.trim() : "";

      if (!/^\d{4}-\d{2}-\d{2}$/.test(routeDate)) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "Parâmetro routeDate obrigatório (YYYY-MM-DD)" };
      }

      const result = await listRouteDaySummaries({
        databaseUrl: env.databaseUrl,
        routeDate,
        inspectorAccountCode: inspectorAccountCode || undefined
      });

      return { ok: true, routeDate, ...result };
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

  app.get("/routes/history-summary", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL nÃ£o definido" };
      }

      const query = (request.query as Record<string, unknown> | undefined) ?? {};
      const dateFrom = typeof query.dateFrom === "string" ? query.dateFrom.trim() : "";
      const dateTo = typeof query.dateTo === "string" ? query.dateTo.trim() : "";
      const inspectorAccountCode =
        typeof query.inspectorAccountCode === "string" ? query.inspectorAccountCode.trim() : "";
      const assistantUserId =
        typeof query.assistantUserId === "string" ? query.assistantUserId.trim() : "";

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
        reply.status(400);
        return {
          ok: false,
          error: "BAD_REQUEST",
          message: "Parâmetros dateFrom e dateTo são obrigatórios (YYYY-MM-DD)"
        };
      }

      if (dateFrom > dateTo) {
        reply.status(400);
        return {
          ok: false,
          error: "BAD_REQUEST",
          message: "dateFrom não pode ser maior que dateTo"
        };
      }

      const result = await listRouteHistorySummary({
        databaseUrl: env.databaseUrl,
        dateFrom,
        dateTo,
        inspectorAccountCode: inspectorAccountCode || undefined,
        assistantUserId: assistantUserId || undefined
      });

      return {
        ok: true,
        dateFrom,
        dateTo,
        ...result
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

  app.get("/routes/operational/current", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);
      const operationalUser = await requireOperationalUser(env, authSession.user.id);
      requireActiveUser(operationalUser);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const query = (request.query as Record<string, unknown> | undefined) ?? {};
      const routeDate =
        typeof query.routeDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.routeDate.trim())
          ? query.routeDate.trim()
          : new Date().toISOString().slice(0, 10);

      const result = await getCurrentOperationalRoute({
        databaseUrl: env.databaseUrl,
        operationalUser,
        routeDate
      });

      if (!result.ok) {
        reply.status(result.error === "FORBIDDEN" ? 403 : 404);
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

  app.get("/routes/:id/day-close", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);
      const operationalUser = await requireOperationalUser(env, authSession.user.id);
      requireActiveUser(operationalUser);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const routeId = String((request.params as any).id ?? "").trim();
      if (!routeId) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "routeId obrigatório" };
      }

      const result = await getRouteDayClose({
        databaseUrl: env.databaseUrl,
        routeId,
        operationalUser
      });

      if (!result.ok) {
        reply.status(result.error === "FORBIDDEN" ? 403 : 404);
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

  app.post("/routes/:id/day-close", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);
      const operationalUser = await requireOperationalUser(env, authSession.user.id);
      requireActiveUser(operationalUser);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const routeId = String((request.params as any).id ?? "").trim();
      if (!routeId) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "routeId obrigatório" };
      }

      const body = ((request.body ?? {}) as Record<string, unknown>) ?? {};
      const reportedOrderCodes = Array.isArray(body.reportedOrderCodes)
        ? body.reportedOrderCodes.filter((item): item is string => typeof item === "string")
        : [];
      const routeComplete = body.routeComplete === true;
      const stoppedAtSeq =
        typeof body.stoppedAtSeq === "number" && Number.isInteger(body.stoppedAtSeq) ? body.stoppedAtSeq : null;
      const skippedStops = Array.isArray(body.skippedStops)
        ? body.skippedStops
            .map((item) =>
              typeof item === "object" && item != null
                ? {
                    seq: typeof (item as any).seq === "number" ? (item as any).seq : NaN,
                    reason: String((item as any).reason ?? "")
                  }
                : null
            )
            .filter((item): item is { seq: number; reason: string } => item != null)
        : [];
      const notes =
        typeof body.notes === "string" ? body.notes : body.notes == null ? null : String(body.notes ?? "");

      const result = await upsertRouteDayClose({
        databaseUrl: env.databaseUrl,
        routeId,
        operationalUser,
        submittedByUserId: operationalUser.id,
        reportedOrderCodes,
        routeComplete,
        stoppedAtSeq,
        skippedStops,
        notes
      });

      if (!result.ok) {
        reply.status(
          result.error === "FORBIDDEN"
            ? 403
            : result.error === "NOT_FOUND"
              ? 404
              : result.error === "INVALID_STATUS"
                ? 409
                : 422
        );
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

  app.post("/routes/source-batches/:id/geocode", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      if (!env.nominatimBaseUrl) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "NOMINATIM_BASE_URL não configurado" };
      }

      const sourceBatchId = String((request.params as any).id ?? "").trim();
      const body = ((request.body ?? {}) as Record<string, unknown>) ?? {};
      const force = body.force === true;

      if (!sourceBatchId) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "sourceBatchId obrigatório" };
      }

      const result = await geocodeRouteSourceBatch({
        databaseUrl: env.databaseUrl,
        sourceBatchId,
        nominatimBaseUrl: env.nominatimBaseUrl,
        force
      });

      if (!result.ok) {
        reply.status(result.error === "NOT_FOUND" ? 404 : 400);
        return {
          ok: false,
          error: result.error,
          message: result.message
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

  app.get("/routes/source-batches/:id/candidates", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const sourceBatchId = String((request.params as any).id ?? "").trim();
      if (!sourceBatchId) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "sourceBatchId obrigatório" };
      }

      const query = (request.query as Record<string, unknown> | undefined) ?? {};
      const review = typeof query.review === "string" ? query.review.trim() : "";
      if (review && review !== "required") {
        reply.status(400);
        return {
          ok: false,
          error: "BAD_REQUEST",
          message: "Parâmetro review inválido para /routes/source-batches/:id/candidates"
        };
      }

      const pagination = parsePagination(query, { pageSize: 50, maxPageSize: 200 });
      const result = await listRouteSourceBatchCandidates({
        databaseUrl: env.databaseUrl,
        sourceBatchId,
        review: review === "required" ? "required" : undefined,
        ...pagination
      });

      return {
        ok: true,
        candidates: result.candidates,
        meta: buildListMeta({
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: result.total
        })
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

  app.patch("/routes/source-batches/:id/candidates/:candidateId/geocode-override", async (request, reply) => {
    try {
      const { operationalUser } = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const sourceBatchId = String((request.params as any).id ?? "").trim();
      const candidateId = String((request.params as any).candidateId ?? "").trim();
      if (!sourceBatchId || !candidateId) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "sourceBatchId e candidateId são obrigatórios" };
      }

      const body = ((request.body ?? {}) as Record<string, unknown>) ?? {};
      const result = await overrideRouteCandidateGeocode({
        databaseUrl: env.databaseUrl,
        sourceBatchId,
        candidateId,
        performedByUserId: operationalUser.id,
        latitude: body.latitude,
        longitude: body.longitude,
        normalizedAddressLine1: body.normalizedAddressLine1,
        normalizedCity: body.normalizedCity,
        normalizedState: body.normalizedState,
        normalizedZipCode: body.normalizedZipCode,
        note: body.note
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
      const originCity =
        body.originCity == null ? null : String(body.originCity ?? "").trim();
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
        originCityOverride: originCity,
        routingEngineBaseUrl: env.routingEngineBaseUrl,
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

  app.post("/routes/import-gpx", async (request, reply) => {
    try {
      const { operationalUser } = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const file = await (request as any).file?.();
      if (!file) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "Arquivo .gpx não enviado" };
      }

      const fileName = String(file.filename ?? "").trim();
      if (!fileName.toLowerCase().endsWith(".gpx")) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "Envie um arquivo .gpx válido" };
      }

      const fieldValue = (fieldName: string) => String((file.fields?.[fieldName]?.value ?? "") as any).trim();
      const sourceBatchId = fieldValue("sourceBatchId");
      const routeDate = fieldValue("routeDate");
      const inspectorAccountCode = fieldValue("inspectorAccountCode");
      const assistantUserId = fieldValue("assistantUserId") || null;
      const originCity = fieldValue("originCity") || null;
      const replaceExisting = ["true", "1", "yes", "y", "sim", "s"].includes(fieldValue("replaceExisting").toLowerCase());
      const replaceReason = fieldValue("replaceReason") || null;

      if (!sourceBatchId || !routeDate || !inspectorAccountCode) {
        reply.status(400);
        return {
          ok: false,
          error: "BAD_REQUEST",
          message: "Campos sourceBatchId, routeDate e inspectorAccountCode são obrigatórios"
        };
      }

      const buffer = await file.toBuffer();
      const result = await importRouteFromGpx({
        databaseUrl: env.databaseUrl,
        createdByUserId: operationalUser.id,
        sourceBatchId,
        routeDate,
        inspectorAccountCode,
        assistantUserId,
        originCityOverride: originCity,
        replaceExisting,
        replaceReason,
        fileName,
        buffer
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ...result,
          error: normalized.error,
          ...(normalized.legacyCode ? { details: { code: normalized.legacyCode } } : {})
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

  app.patch("/routes/:id/assistant", async (request, reply) => {
    try {
      const { operationalUser } = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL nÃ£o definido" };
      }

      const routeId = String((request.params as any).id ?? "").trim();
      if (!routeId) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "id obrigatÃ³rio" };
      }

      const body = ((request.body ?? {}) as Record<string, unknown>) ?? {};
      const assistantUserId =
        body.assistantUserId == null ? null : String(body.assistantUserId ?? "").trim() || null;
      const reason = body.reason == null ? null : String(body.reason ?? "").trim();

      const result = await reassignRouteAssistant({
        databaseUrl: env.databaseUrl,
        routeId,
        assistantUserId,
        performedByUserId: operationalUser.id,
        reason
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

  app.post("/routes/:id/resequence", async (request, reply) => {
    try {
      const { operationalUser } = await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL nÃ£o definido" };
      }

      const routeId = String((request.params as any).id ?? "").trim();
      if (!routeId) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "id obrigatÃ³rio" };
      }

      const body = ((request.body ?? {}) as Record<string, unknown>) ?? {};
      const stopIds = Array.isArray(body.stopIds)
        ? body.stopIds.filter((value): value is string => typeof value === "string" && value.trim() !== "")
        : [];
      const reason = body.reason == null ? null : String(body.reason ?? "").trim();

      const result = await resequenceRouteStops({
        databaseUrl: env.databaseUrl,
        routeId,
        stopIds,
        performedByUserId: operationalUser.id,
        reason
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

  app.post("/routes/:id/export/gpx", async (request, reply) => {
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

      const query = (request.query as Record<string, unknown> | undefined) ?? {};
      const profileRaw = typeof query.profile === "string" ? query.profile.trim() : "";
      const profile = profileRaw || "inroute_legacy";
      if (profile !== "inroute_legacy" && profile !== "generic_gpx") {
        reply.status(400);
        return {
          ok: false,
          error: "BAD_REQUEST",
          message: "Parâmetro profile inválido para /routes/:id/export/gpx"
        };
      }

      const result = await exportRouteGpx({
        databaseUrl: env.databaseUrl,
        routeId: id,
        generatedByUserId: operationalUser.id,
        profile
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

  app.post("/routes/:id/export/email-preview", async (request, reply) => {
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

      const result = await exportRouteEmailPreview({
        databaseUrl: env.databaseUrl,
        routeId: id,
        generatedByUserId: operationalUser.id
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
