import { betterAuth } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";
import { Pool } from "pg";
import type { ApiEnv } from "../env.js";

let authPool: Pool | undefined;
type BetterAuthInstance = ReturnType<typeof betterAuth>;
let authInstance: BetterAuthInstance | undefined;

export function getAuth(env: ApiEnv) {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL n\u00e3o definido (necess\u00e1rio para Better Auth)");
  }

  if (!authPool) {
    authPool = new Pool({
      connectionString: env.databaseUrl,
      options: "-c search_path=auth"
    });
  }

  if (!authInstance) {
    authInstance = betterAuth({
      secret: env.betterAuthSecret,
      baseURL: env.betterAuthUrl,
      trustedOrigins: [env.appWebUrl],
      database: authPool,
      emailAndPassword: {
        enabled: true
      }
    }) as BetterAuthInstance;
  }

  return authInstance;
}

export async function getSessionFromRequest(env: ApiEnv, request: { raw: { headers: any } }) {
  const auth = getAuth(env);
  return auth.api.getSession({ headers: fromNodeHeaders(request.raw.headers) });
}
