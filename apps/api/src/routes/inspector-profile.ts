import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import {
  PermissionError,
  requireActiveUser,
  requireAuthenticated,
  requireOperationalUser,
  requireRole
} from "../lib/permissions.js";
import { getOwnInspectorProfile } from "../modules/inspectors/get-own-inspector-profile.js";
import { updateOwnInspectorProfile } from "../modules/inspectors/update-own-inspector-profile.js";

export function registerInspectorProfileRoutes(app: FastifyInstance, env: ApiEnv) {
  async function requireLinkedInspector(request: any) {
    const authSession = await requireAuthenticated(env, request);
    const operationalUser = await requireOperationalUser(env, authSession.user.id);
    requireActiveUser(operationalUser);
    await requireRole({ env, operationalUserId: operationalUser.id, allowed: ["inspector"] });

    if (!operationalUser.inspectorId) {
      throw new PermissionError({
        statusCode: 403,
        code: "OPERATIONAL_PROFILE_MISSING",
        message: "Usuário inspector sem vínculo com inspector operacional"
      });
    }

    return operationalUser;
  }

  app.get("/inspector-profile/me", async (request, reply) => {
    try {
      const operationalUser = await requireLinkedInspector(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const profile = await getOwnInspectorProfile({
        databaseUrl: env.databaseUrl,
        operationalUserId: operationalUser.id
      });

      if (!profile) {
        reply.status(404);
        return { ok: false, error: "NOT_FOUND", message: "Inspector vinculado não encontrado" };
      }

      return { ok: true, profile };
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

  app.patch("/inspector-profile/me", async (request, reply) => {
    try {
      const operationalUser = await requireLinkedInspector(request);

      if (!env.databaseUrl) {
        reply.status(500);
        return { ok: false, error: "INTERNAL_ERROR", message: "DATABASE_URL não definido" };
      }

      const result = await updateOwnInspectorProfile({
        databaseUrl: env.databaseUrl,
        operationalUserId: operationalUser.id,
        input: (request.body ?? {}) as any
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

      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "erro desconhecido" };
    }
  });
}
