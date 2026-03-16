import fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import type { ApiEnv } from "./env.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerMeRoute } from "./routes/me.js";
import { registerUsersRoutes } from "./routes/users.js";
import { registerPoolImportRoutes } from "./routes/pool-import.js";
import { registerOrdersRoutes } from "./routes/orders.js";
import { registerCatalogRoutes } from "./routes/catalogs.js";
import { registerPaymentBatchRoutes } from "./routes/payment-batches.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerTeamAssignmentsRoutes } from "./routes/team-assignments.js";
import { registerRoutesRoutes } from "./routes/routes.js";

export async function buildApp(env: ApiEnv) {
  const app = fastify().withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute"
  });

  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 10 * 1024 * 1024
    }
  });

  if (env.appEnv === "development") {
    await app.register(cors, {
      origin: env.appWebUrl,
      credentials: true
    });
  }

  registerHealthRoute(app, env);
  registerAuthRoutes(app, env);
  registerMeRoute(app, env);
  registerUsersRoutes(app, env);
  registerCatalogRoutes(app, env);
  registerTeamAssignmentsRoutes(app, env);
  registerPoolImportRoutes(app, env);
  registerOrdersRoutes(app, env);
  registerPaymentBatchRoutes(app, env);
  registerDashboardRoutes(app, env);
  registerRoutesRoutes(app, env);

  return app;
}

