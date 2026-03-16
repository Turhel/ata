export type ApiEnv = {
  host: string;
  port: number;
  appEnv: "development" | "preview" | "production";
  appWebUrl: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  databaseUrl?: string;
  nominatimBaseUrl?: string;
};

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

  const appWebUrl = process.env.APP_WEB_URL ?? "http://localhost:5173";

  const betterAuthSecret = process.env.BETTER_AUTH_SECRET ?? "";
  if (betterAuthSecret.trim() === "") {
    throw new Error("BETTER_AUTH_SECRET n\u00e3o definido");
  }

  const betterAuthUrl = process.env.BETTER_AUTH_URL ?? `http://localhost:${port}`;
  const nominatimBaseUrl =
    process.env.NOMINATIM_BASE_URL && process.env.NOMINATIM_BASE_URL.trim() !== ""
      ? process.env.NOMINATIM_BASE_URL.trim().replace(/\/+$/, "")
      : undefined;

  return { host, port, appEnv, appWebUrl, betterAuthSecret, betterAuthUrl, databaseUrl, nominatimBaseUrl };
}
