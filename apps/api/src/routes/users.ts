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
import { buildListMeta, normalizeSearch, parsePagination } from "../lib/listing.js";
import { changeUserRole } from "../modules/users/change-user-role.js";
import { linkUserToInspector } from "../modules/users/link-user-inspector.js";
import { listOperationalUsers } from "../modules/users/list-users.js";
import { approvePendingUser, blockUser, reactivateUser } from "../modules/users/mutate-user-status.js";

export function registerUsersRoutes(app: FastifyInstance, env: ApiEnv) {
  const allowedStatuses = ["pending", "active", "blocked", "inactive"] as const;

  async function requireAdminOrMaster(request: any) {
    const authSession = await requireAuthenticated(env, request);
    const operationalUser = await requireOperationalUser(env, authSession.user.id);
    requireActiveUser(operationalUser);
    await requireRole({ env, operationalUserId: operationalUser.id, allowed: ["admin", "master"] });
    return operationalUser;
  }

  async function requireMasterOrAdminForRoleChange(request: any) {
    const authSession = await requireAuthenticated(env, request);
    const operationalUser = await requireOperationalUser(env, authSession.user.id);
    requireActiveUser(operationalUser);
    const role = await requireRole({ env, operationalUserId: operationalUser.id, allowed: ["admin", "master"] });
    return { operationalUser, role };
  }

  app.get("/users", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL n\u00e3o definido" };
      }

      const query = (request.query as Record<string, unknown> | undefined) ?? {};
      const statusRaw = typeof query.status === "string" ? query.status.trim() : "";
      if (statusRaw && !allowedStatuses.includes(statusRaw as (typeof allowedStatuses)[number])) {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "Parâmetro 'status' inválido para /users" };
      }
      const status = (statusRaw || undefined) as (typeof allowedStatuses)[number] | undefined;
      const pagination = parsePagination(query, { pageSize: 20, maxPageSize: 100 });
      const result = await listOperationalUsers({
        databaseUrl: env.databaseUrl,
        status,
        search: normalizeSearch(query.search),
        ...pagination
      });

      return {
        ok: true,
        users: result.users,
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

  app.post("/users/:id/approve", async (request, reply) => {
    try {
      const actor = await requireAdminOrMaster(request);
      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL n\u00e3o definido" };
      }

      const targetId = (request.params as any).id as string;
      const result = await approvePendingUser({
        databaseUrl: env.databaseUrl,
        targetUserId: targetId,
        approvedByUserId: actor.id
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

      return { ok: true, user: result.user };
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

  app.post("/users/:id/block", async (request, reply) => {
    try {
      const actor = await requireAdminOrMaster(request);
      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL n\u00e3o definido" };
      }

      const targetId = (request.params as any).id as string;
      const result = await blockUser({
        databaseUrl: env.databaseUrl,
        targetUserId: targetId,
        blockedByUserId: actor.id
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

      return { ok: true, user: result.user };
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

  app.post("/users/:id/reactivate", async (request, reply) => {
    try {
      const actor = await requireAdminOrMaster(request);
      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL n\u00e3o definido" };
      }

      const targetId = (request.params as any).id as string;
      const result = await reactivateUser({
        databaseUrl: env.databaseUrl,
        targetUserId: targetId,
        reactivatedByUserId: actor.id
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

      return { ok: true, user: result.user };
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

  app.patch("/users/:id/role", async (request, reply) => {
    try {
      const { operationalUser, role } = await requireMasterOrAdminForRoleChange(request);
      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const body = (request.body ?? {}) as Record<string, unknown>;
      const roleCode = typeof body.roleCode === "string" ? body.roleCode.trim() : "";
      if (roleCode !== "master" && roleCode !== "admin" && roleCode !== "assistant" && roleCode !== "inspector") {
        reply.status(400);
        return { ok: false, error: "BAD_REQUEST", message: "roleCode inválido" };
      }

      const result = await changeUserRole({
        databaseUrl: env.databaseUrl,
        actorUserId: operationalUser.id,
        actorRole: role,
        targetUserId: (request.params as any).id as string,
        roleCode
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

  app.patch("/users/:id/inspector-link", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);
      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const body = (request.body ?? {}) as Record<string, unknown>;
      const inspectorId =
        body.inspectorId == null ? null : String(body.inspectorId ?? "").trim();

      const result = await linkUserToInspector({
        databaseUrl: env.databaseUrl,
        targetUserId: (request.params as any).id as string,
        inspectorId: inspectorId || null
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
}
