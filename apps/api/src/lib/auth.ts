import { betterAuth } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";
import { Pool } from "pg";
import type { ApiEnv } from "../env.js";

type BetterAuthInstance = ReturnType<typeof betterAuth>;
type AuthBundle = {
  pool: Pool;
  auth: BetterAuthInstance;
};

const authByConfig = new Map<string, AuthBundle>();

export function getAuth(env: ApiEnv) {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL n\u00e3o definido (necess\u00e1rio para Better Auth)");
  }

  const authKey = JSON.stringify({
    databaseUrl: env.databaseUrl,
    betterAuthSecret: env.betterAuthSecret,
    betterAuthUrl: env.betterAuthUrl,
    appWebUrl: env.appWebUrl
  });

  const cached = authByConfig.get(authKey);
  if (cached) {
    return cached.auth;
  }

  const authPool = new Pool({
      connectionString: env.databaseUrl,
      options: "-c search_path=auth"
    });

  const auth = betterAuth({
    secret: env.betterAuthSecret,
    baseURL: env.betterAuthUrl,
    trustedOrigins: [env.appWebUrl],
    database: authPool,
    emailAndPassword: {
      enabled: true
    }
  }) as BetterAuthInstance;

  authByConfig.set(authKey, { pool: authPool, auth });

  return auth;
}

export async function getSessionFromRequest(env: ApiEnv, request: { raw: { headers: any } }) {
  const auth = getAuth(env);
  return auth.api.getSession({ headers: fromNodeHeaders(request.raw.headers) });
}
