export type ApiEnv = {
  host: string;
  port: number;
  appEnv: "development" | "preview" | "production";
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  appWebUrl: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  databaseUrl?: string;
  nominatimBaseUrl?: string;
  routingEngineBaseUrl?: string;
};

function parseUrl(name: string, value: string) {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} inválido: ${value}`);
  }
}

export function getEnv(): ApiEnv {
  const host = process.env.HOST ?? "0.0.0.0";

  const portRaw = process.env.PORT ?? "3001";
  const port = Number(portRaw);
  if (!Number.isFinite(port)) {
    throw new Error(`PORT inválido: ${portRaw}`);
  }

  const databaseUrl =
    process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ""
      ? process.env.DATABASE_URL
      : undefined;

  const appEnvRaw = (process.env.APP_ENV ?? "development").trim();
  const appEnv =
    appEnvRaw === "production" || appEnvRaw === "preview" || appEnvRaw === "development"
      ? appEnvRaw
      : "development";

  const logLevelRaw = (process.env.LOG_LEVEL ?? "info").trim();
  const logLevel =
    logLevelRaw === "fatal" ||
    logLevelRaw === "error" ||
    logLevelRaw === "warn" ||
    logLevelRaw === "info" ||
    logLevelRaw === "debug" ||
    logLevelRaw === "trace"
      ? logLevelRaw
      : "info";

  const appWebUrl = parseUrl("APP_WEB_URL", process.env.APP_WEB_URL ?? "http://localhost:5173");

  const betterAuthSecret = process.env.BETTER_AUTH_SECRET ?? "";
  if (betterAuthSecret.trim() === "") {
    throw new Error("BETTER_AUTH_SECRET n\u00e3o definido");
  }
  if (appEnv !== "development" && betterAuthSecret.trim().length < 32) {
    throw new Error("BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres fora de development");
  }

  const betterAuthUrl = parseUrl("BETTER_AUTH_URL", process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`);
  const nominatimBaseUrl =
    process.env.NOMINATIM_BASE_URL && process.env.NOMINATIM_BASE_URL.trim() !== ""
      ? parseUrl("NOMINATIM_BASE_URL", process.env.NOMINATIM_BASE_URL.trim())
      : undefined;
  const routingEngineBaseUrl =
    process.env.ROUTING_ENGINE_BASE_URL && process.env.ROUTING_ENGINE_BASE_URL.trim() !== ""
      ? parseUrl("ROUTING_ENGINE_BASE_URL", process.env.ROUTING_ENGINE_BASE_URL.trim())
      : undefined;

  return {
    host,
    port,
    appEnv,
    logLevel,
    appWebUrl,
    betterAuthSecret,
    betterAuthUrl,
    databaseUrl,
    nominatimBaseUrl,
    routingEngineBaseUrl
  };
}
