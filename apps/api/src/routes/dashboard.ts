import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import {
  PermissionError,
  requireActiveUser,
  requireAuthenticated,
  requireOperationalUser,
  requireRole
} from "../lib/permissions.js";
import { getAdminDashboard } from "../modules/dashboard/get-admin-dashboard.js";
import { getAssistantDashboard } from "../modules/dashboard/get-assistant-dashboard.js";

export function registerDashboardRoutes(app: FastifyInstance, env: ApiEnv) {
  app.get("/dashboard/admin", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);
      const operationalUser = await requireOperationalUser(env, authSession.user.id);
      requireActiveUser(operationalUser);
      const role = await requireRole({ env, operationalUserId: operationalUser.id, allowed: ["admin", "master"] });

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      return {
        ok: true,
        dashboard: await getAdminDashboard({
          databaseUrl: env.databaseUrl,
          actorUserId: operationalUser.id,
          actorRole: role as "admin" | "master"
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

  app.get("/dashboard/assistant", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);
      const operationalUser = await requireOperationalUser(env, authSession.user.id);
      requireActiveUser(operationalUser);
      await requireRole({ env, operationalUserId: operationalUser.id, allowed: "assistant" });

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      return {
        ok: true,
        dashboard: await getAssistantDashboard({
          databaseUrl: env.databaseUrl,
          assistantUserId: operationalUser.id
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
}
