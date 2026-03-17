import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import { pingDb } from "../lib/db.js";

export function registerHealthRoute(app: FastifyInstance, env: ApiEnv) {
  app.get("/health", async () => {
    const timestamp = new Date().toISOString();
    const base = {
      ok: true as const,
      app: {
        env: env.appEnv,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp
      },
      services: {
        betterAuth: {
          configured: Boolean(env.betterAuthUrl && env.betterAuthSecret)
        },
        nominatim: {
          configured: Boolean(env.nominatimBaseUrl)
        },
        routingEngine: {
          configured: Boolean(env.routingEngineBaseUrl)
        }
      }
    };

    if (!env.databaseUrl) {
      return {
        ...base,
        db: { ok: false, error: "DATABASE_URL não definido" }
      };
    }

    try {
      await pingDb(env.databaseUrl);
      return {
        ...base,
        db: { ok: true }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro desconhecido";
      return {
        ...base,
        db: { ok: false, error: message }
      };
    }
  });
}
