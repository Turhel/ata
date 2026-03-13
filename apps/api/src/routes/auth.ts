import type { FastifyInstance } from "fastify";
import type { ApiEnv } from "../env.js";
import { getAuth } from "../lib/auth.js";

export function registerAuthRoutes(app: FastifyInstance, env: ApiEnv) {
  const auth = getAuth(env);

  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`);

        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (!value) return;
          if (Array.isArray(value)) {
            value.forEach((v) => headers.append(key, v.toString()));
            return;
          }
          headers.append(key, value.toString());
        });

        const body =
          request.body == null
            ? undefined
            : typeof request.body === "string"
              ? request.body
              : JSON.stringify(request.body);

        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(body ? { body } : {})
        });

        const response = await auth.handler(req);

        reply.status(response.status);

        const maybeHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
        if (typeof maybeHeaders.getSetCookie === "function") {
          const cookies = maybeHeaders.getSetCookie();
          if (cookies.length > 0) reply.header("set-cookie", cookies);
        }

        response.headers.forEach((value, key) => {
          if (key.toLowerCase() === "set-cookie") return;
          reply.header(key, value);
        });

        reply.send(response.body ? await response.text() : null);
      } catch (error) {
        const meta = { method: request.method, url: request.url };
        app.log.error({ error, ...meta }, "Authentication Error");

        if ((process.env.APP_ENV ?? "development") === "development") {
          console.error("[AUTH_FAILURE]", meta);
          console.error(error);
        }
        reply.status(500).send({
          error: "Internal authentication error",
          code: "AUTH_FAILURE"
        });
      }
    }
  });
}
