import fastify from "fastify";
import cors from "@fastify/cors";
import type { ApiEnv } from "./env.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerMeRoute } from "./routes/me.js";
import { registerUsersRoutes } from "./routes/users.js";

export function buildApp(env: ApiEnv) {
  const app = fastify();

  if (env.appEnv === "development") {
    void app.register(cors, {
      origin: env.appWebUrl,
      credentials: true
    });
  }

  registerHealthRoute(app, env);
  registerAuthRoutes(app, env);
  registerMeRoute(app, env);
  registerUsersRoutes(app, env);

  return app;
}
