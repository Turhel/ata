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
import { createTeamAssignment } from "../modules/team-assignments/create-team-assignment.js";
import { deactivateTeamAssignment } from "../modules/team-assignments/deactivate-team-assignment.js";
import { listTeamAssignments } from "../modules/team-assignments/list-team-assignments.js";

export function registerTeamAssignmentsRoutes(app: FastifyInstance, env: ApiEnv) {
  app.get("/team-assignments", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);
      const operationalUser = await requireOperationalUser(env, authSession.user.id);
      requireActiveUser(operationalUser);
      const role = await requireRole({
        env,
        operationalUserId: operationalUser.id,
        allowed: ["master", "admin", "assistant"]
      });

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const query = (request.query as Record<string, unknown> | undefined) ?? {};
      const includeInactive = query.includeInactive === "true" || query.includeInactive === true;
      const scopeRaw = typeof query.scope === "string" ? query.scope.trim() : "";
      const scope = scopeRaw === "mine" ? "mine" : "all";

      const assignments = await listTeamAssignments({
        databaseUrl: env.databaseUrl,
        actorUserId: operationalUser.id,
        actorRole: role as "master" | "admin" | "assistant",
        includeInactive,
        scope
      });

      return { ok: true, assignments };
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

  app.post("/team-assignments", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);
      const operationalUser = await requireOperationalUser(env, authSession.user.id);
      requireActiveUser(operationalUser);
      const role = await requireRole({
        env,
        operationalUserId: operationalUser.id,
        allowed: ["master", "admin"]
      });

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

       const result = await createTeamAssignment({
         databaseUrl: env.databaseUrl,
         actorUserId: operationalUser.id,
         actorRole: role as "master" | "admin",
         body: request.body
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

  app.delete("/team-assignments/:id", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);
      const operationalUser = await requireOperationalUser(env, authSession.user.id);
      requireActiveUser(operationalUser);
      const role = await requireRole({
        env,
        operationalUserId: operationalUser.id,
        allowed: ["master", "admin"]
      });

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

       const result = await deactivateTeamAssignment({
         databaseUrl: env.databaseUrl,
         actorUserId: operationalUser.id,
         actorRole: role as "master" | "admin",
         assignmentId: (request.params as any).id as string
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
