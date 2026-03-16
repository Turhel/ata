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
import { listClients } from "../modules/catalogs/list-clients.js";
import { listInspectorAccounts } from "../modules/catalogs/list-inspector-accounts.js";
import { listInspectors } from "../modules/catalogs/list-inspectors.js";
import { listWorkTypes } from "../modules/catalogs/list-work-types.js";
import { createClient, updateClient } from "../modules/catalogs/upsert-client.js";
import { createInspectorAccount, updateInspectorAccount } from "../modules/catalogs/upsert-inspector-account.js";
import { createInspector, updateInspector } from "../modules/catalogs/upsert-inspector.js";
import { createWorkType, updateWorkType } from "../modules/catalogs/upsert-work-type.js";

export function registerCatalogRoutes(app: FastifyInstance, env: ApiEnv) {
  async function requireAdminOrMaster(request: unknown) {
    const authSession = await requireAuthenticated(env, request as { raw: { headers: any } });
    const operationalUser = await requireOperationalUser(env, authSession.user.id);
    requireActiveUser(operationalUser);
    await requireRole({ env, operationalUserId: operationalUser.id, allowed: ["admin", "master"] });
    return operationalUser;
  }

  app.get("/clients", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      return { ok: true, clients: await listClients(env.databaseUrl) };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "erro desconhecido" };
    }
  });

  app.get("/inspectors", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      return { ok: true, inspectors: await listInspectors(env.databaseUrl) };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "erro desconhecido" };
    }
  });

  app.post("/inspectors", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const result = await createInspector({
        databaseUrl: env.databaseUrl,
        input: (request.body ?? {}) as any
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(normalized.legacyCode ? { details: { ...(result as any).details, code: normalized.legacyCode } } : {})
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

      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "erro desconhecido" };
    }
  });

  app.patch("/inspectors/:id", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const result = await updateInspector({
        databaseUrl: env.databaseUrl,
        inspectorId: (request.params as any).id as string,
        input: (request.body ?? {}) as any
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(normalized.legacyCode ? { details: { ...(result as any).details, code: normalized.legacyCode } } : {})
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

      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "erro desconhecido" };
    }
  });

  app.get("/inspector-accounts", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      return { ok: true, inspectorAccounts: await listInspectorAccounts(env.databaseUrl) };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "erro desconhecido" };
    }
  });

  app.post("/inspector-accounts", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const result = await createInspectorAccount({
        databaseUrl: env.databaseUrl,
        input: (request.body ?? {}) as any
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(normalized.legacyCode ? { details: { ...(result as any).details, code: normalized.legacyCode } } : {})
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

      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "erro desconhecido" };
    }
  });

  app.patch("/inspector-accounts/:id", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const result = await updateInspectorAccount({
        databaseUrl: env.databaseUrl,
        inspectorAccountId: (request.params as any).id as string,
        input: (request.body ?? {}) as any
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(normalized.legacyCode ? { details: { ...(result as any).details, code: normalized.legacyCode } } : {})
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

      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "erro desconhecido" };
    }
  });

  app.post("/clients", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const result = await createClient({
        databaseUrl: env.databaseUrl,
        input: (request.body ?? {}) as any
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(normalized.legacyCode ? { details: { ...(result as any).details, code: normalized.legacyCode } } : {})
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

      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "erro desconhecido" };
    }
  });

  app.patch("/clients/:id", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const result = await updateClient({
        databaseUrl: env.databaseUrl,
        clientId: (request.params as any).id as string,
        input: (request.body ?? {}) as any
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(normalized.legacyCode ? { details: { ...(result as any).details, code: normalized.legacyCode } } : {})
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

      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "erro desconhecido" };
    }
  });

  app.get("/work-types", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      return { ok: true, workTypes: await listWorkTypes(env.databaseUrl) };
    } catch (error) {
      if (error instanceof PermissionError) {
        reply.status(error.statusCode);
        return {
          ok: false,
          error: error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          message: error.message
        };
      }

      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "erro desconhecido" };
    }
  });

  app.post("/work-types", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const result = await createWorkType({
        databaseUrl: env.databaseUrl,
        input: (request.body ?? {}) as any
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(normalized.legacyCode ? { details: { ...(result as any).details, code: normalized.legacyCode } } : {})
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

      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "erro desconhecido" };
    }
  });

  app.patch("/work-types/:id", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const result = await updateWorkType({
        databaseUrl: env.databaseUrl,
        workTypeId: (request.params as any).id as string,
        input: (request.body ?? {}) as any
      });

      if (!result.ok) {
        const normalized = normalizeApiError(result.error);
        reply.status(normalized.statusCode);
        return {
          ok: false,
          error: normalized.error,
          message: result.message,
          ...(normalized.legacyCode ? { details: { ...(result as any).details, code: normalized.legacyCode } } : {})
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

      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "erro desconhecido" };
    }
  });
}
