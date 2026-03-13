import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import { pingDb } from "../lib/db.js";

export function registerHealthRoute(app: FastifyInstance, env: ApiEnv) {
  app.get("/health", async () => {
    if (!env.databaseUrl) {
      return { ok: true, db: { ok: false, error: "DATABASE_URL não definido" } };
    }

    try {
      await pingDb(env.databaseUrl);
      return { ok: true, db: { ok: true } };
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro desconhecido";
      return { ok: true, db: { ok: false, error: message } };
    }
  });
}
