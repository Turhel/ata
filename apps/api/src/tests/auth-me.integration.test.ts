import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import type { ApiEnv } from "../env.js";
import { buildApp } from "../app.js";
import { getDb } from "../lib/db.js";

const databaseUrl = process.env.DATABASE_URL;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
const appWebUrl = process.env.APP_WEB_URL ?? "http://localhost:5173";

const integration = databaseUrl && betterAuthSecret ? test : test.skip;

function buildTestEnv(): ApiEnv {
  if (!databaseUrl || !betterAuthSecret) {
    throw new Error("DATABASE_URL e BETTER_AUTH_SECRET são obrigatórios para os testes de auth");
  }

  return {
    host: "127.0.0.1",
    port: 3001,
    appEnv: "development",
    logLevel: "fatal",    appWebUrl,
    betterAuthSecret,
    betterAuthUrl,
    databaseUrl
  };
}

async function createTestApp() {
  const env = buildTestEnv();
  const app = await buildApp(env);
  return { env, app };
}

function getCookieHeader(setCookieHeader: string | string[] | undefined) {
  if (!setCookieHeader) {
    return "";
  }

  const cookies = (Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader])
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean);

  return cookies.join("; ");
}

async function signUpAndGetSession(app: FastifyInstance, suffix: string) {
  const email = `auth-me-${suffix}-${randomUUID()}@test.local`;
  const password = "Teste1234!";
  const name = `Auth Me ${suffix}`;

  const signUpResponse = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    headers: {
      "content-type": "application/json",
      origin: appWebUrl,
      host: "localhost:3001"
    },
    payload: { email, password, name }
  });

  assert.ok(
    signUpResponse.statusCode >= 200 && signUpResponse.statusCode < 300,
    `sign-up deveria funcionar, mas retornou ${signUpResponse.statusCode}: ${signUpResponse.body}`
  );

  const cookieHeader = getCookieHeader(signUpResponse.headers["set-cookie"]);
  assert.ok(cookieHeader.length > 0, "sign-up deveria retornar cookie de sessão");

  const sessionResponse = await app.inject({
    method: "GET",
    url: "/api/auth/get-session",
    headers: {
      cookie: cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(sessionResponse.statusCode, 200);
  const sessionBody = sessionResponse.json() as {
    user: { id: string; email: string; name: string };
    session: { id: string };
  } | null;

  assert.ok(sessionBody, "get-session deveria retornar uma sessão válida");

  return {
    email,
    password,
    name,
    authUserId: sessionBody.user.id,
    cookieHeader
  };
}

integration("/me retorna 401 quando a sessão está ausente", async (t) => {
  const { app } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/me",
    headers: {
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), {
    ok: false,
    error: "UNAUTHORIZED",
    message: "Sessão inválida ou ausente"
  });
});

integration("/me retorna profileStatus=missing quando existe sessão sem perfil operacional", async (t) => {
  const { app } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const signed = await signUpAndGetSession(app, "missing");

  const meResponse = await app.inject({
    method: "GET",
    url: "/me",
    headers: {
      cookie: signed.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(meResponse.statusCode, 200);
  const body = meResponse.json() as {
    ok: true;
    auth: { user: { id: string; email: string; name: string } };
    profile: null;
    profileStatus: "missing";
  };

  assert.equal(body.ok, true);
  assert.equal(body.profileStatus, "missing");
  assert.equal(body.profile, null);
  assert.equal(body.auth.user.id, signed.authUserId);
  assert.equal(body.auth.user.email, signed.email);
});

integration("/me retorna profileStatus=linked e expõe o perfil operacional existente", async (t) => {
  const { app, env } = await createTestApp();
  const { db } = getDb(env.databaseUrl!);

  t.after(async () => {
    await app.close();
  });

  const signed = await signUpAndGetSession(app, "linked");
  const operationalUserId = randomUUID();

  await db.insert(users).values({
    id: operationalUserId,
    email: signed.email,
    fullName: "Usuário Operacional Linkado",
    status: "active",
    authUserId: signed.authUserId
  });

  t.after(async () => {
    await db.delete(users).where(eq(users.id, operationalUserId));
  });

  const meResponse = await app.inject({
    method: "GET",
    url: "/me",
    headers: {
      cookie: signed.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(meResponse.statusCode, 200);
  const body = meResponse.json() as {
    ok: true;
    profileStatus: "linked";
    profile: {
      id: string;
      email: string;
      fullName: string;
      status: "active" | "pending" | "blocked" | "inactive";
      authUserId: string | null;
    };
  };

  assert.equal(body.ok, true);
  assert.equal(body.profileStatus, "linked");
  assert.equal(body.profile.id, operationalUserId);
  assert.equal(body.profile.email, signed.email);
  assert.equal(body.profile.fullName, "Usuário Operacional Linkado");
  assert.equal(body.profile.status, "active");
  assert.equal(body.profile.authUserId, signed.authUserId);
});

integration("/me mantém o perfil linkado mesmo quando o usuário operacional está blocked", async (t) => {
  const { app, env } = await createTestApp();
  const { db } = getDb(env.databaseUrl!);

  t.after(async () => {
    await app.close();
  });

  const signed = await signUpAndGetSession(app, "blocked");
  const operationalUserId = randomUUID();

  await db.insert(users).values({
    id: operationalUserId,
    email: signed.email,
    fullName: "Usuário Operacional Bloqueado",
    status: "blocked",
    authUserId: signed.authUserId
  });

  t.after(async () => {
    await db.delete(users).where(eq(users.id, operationalUserId));
  });

  const meResponse = await app.inject({
    method: "GET",
    url: "/me",
    headers: {
      cookie: signed.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(meResponse.statusCode, 200);
  const body = meResponse.json() as {
    ok: true;
    profileStatus: "linked";
    profile: { status: string; authUserId: string | null };
  };

  assert.equal(body.ok, true);
  assert.equal(body.profileStatus, "linked");
  assert.equal(body.profile.status, "blocked");
  assert.equal(body.profile.authUserId, signed.authUserId);
});

