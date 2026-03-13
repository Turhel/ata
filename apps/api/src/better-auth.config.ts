import { betterAuth } from "better-auth";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL ?? "";
if (databaseUrl.trim() === "") {
  throw new Error("DATABASE_URL n\u00e3o definido (necess\u00e1rio para Better Auth)");
}

const betterAuthSecret = process.env.BETTER_AUTH_SECRET ?? "";
if (betterAuthSecret.trim() === "") {
  throw new Error("BETTER_AUTH_SECRET n\u00e3o definido");
}

export const auth = betterAuth({
  secret: betterAuthSecret,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  trustedOrigins: [process.env.APP_WEB_URL ?? "http://localhost:5173"],
  database: new Pool({
    connectionString: databaseUrl,
    options: "-c search_path=auth"
  })
});

