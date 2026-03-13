import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import { requireAuthenticated } from "../lib/permissions.js";
import { getUserByAuthUserId } from "../modules/users/get-user-by-auth-user-id.js";

export function registerMeRoute(app: FastifyInstance, env: ApiEnv) {
  app.get("/me", async (request, reply) => {
    try {
      const authSession = await requireAuthenticated(env, request);

      if (!env.databaseUrl) {
        reply.status(500);
        return {
          ok: false,
          error: "INTERNAL_ERROR",
          message: "DATABASE_URL n\u00e3o definido"
        };
      }

      const authUserId = authSession.user.id;
      const profile = await getUserByAuthUserId(env.databaseUrl, authUserId);

      const auth = {
        user: {
          id: authSession.user.id,
          email: authSession.user.email,
          name: authSession.user.name,
          image: authSession.user.image ?? null
        },
        session: {
          id: authSession.session.id,
          expiresAt: authSession.session.expiresAt.toISOString()
        }
      };

      if (!profile) {
        return { ok: true, auth, profile: null, profileStatus: "missing" };
      }

      return { ok: true, auth, profile, profileStatus: "linked" };
    } catch (error) {
      if (error instanceof Error && error.name === "PermissionError") {
        reply.status(401);
        return { ok: false, error: "UNAUTHORIZED", message: error.message };
      }

      const message = error instanceof Error ? error.message : "erro desconhecido";
      reply.status(500);
      return { ok: false, error: "INTERNAL_ERROR", message };
    }
  });
}
