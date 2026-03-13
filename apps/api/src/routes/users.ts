import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import {
  PermissionError,
  requireActiveUser,
  requireAuthenticated,
  requireOperationalUser,
  requireRole
} from "../lib/permissions.js";
import { listOperationalUsers } from "../modules/users/list-users.js";
import { approvePendingUser, blockUser, reactivateUser } from "../modules/users/mutate-user-status.js";

export function registerUsersRoutes(app: FastifyInstance, env: ApiEnv) {
  async function requireAdminOrMaster(request: any) {
    const authSession = await requireAuthenticated(env, request);
    const operationalUser = await requireOperationalUser(env, authSession.user.id);
    requireActiveUser(operationalUser);
    await requireRole({ env, operationalUserId: operationalUser.id, allowed: ["admin", "master"] });
    return operationalUser;
  }

  app.get("/users", async (request, reply) => {
    try {
      await requireAdminOrMaster(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL n\u00e3o definido" };
      }

      const users = await listOperationalUsers(env.databaseUrl);
      return { ok: true, users };
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
        reply.status(result.error === "NOT_FOUND" ? 404 : 409);
        return {
          ok: false,
          error: result.error === "NOT_FOUND" ? "NOT_FOUND" : "INVALID_STATE",
          message: result.message
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
        reply.status(404);
        return { ok: false, error: "NOT_FOUND", message: result.message };
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
        reply.status(result.error === "NOT_FOUND" ? 404 : 409);
        return {
          ok: false,
          error: result.error === "NOT_FOUND" ? "NOT_FOUND" : "INVALID_STATE",
          message: result.message
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
}
