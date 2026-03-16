import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { inspectors, userRoles, users } from "../db/schema.js";
import type { ApiEnv } from "../env.js";
import { getDb } from "../lib/db.js";

const databaseUrl = process.env.DATABASE_URL;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
const appWebUrl = process.env.APP_WEB_URL ?? "http://localhost:5173";

const integration = databaseUrl && betterAuthSecret ? test : test.skip;

type Database = ReturnType<typeof getDb>["db"];

function buildTestEnv(): ApiEnv {
  if (!databaseUrl || !betterAuthSecret) {
    throw new Error("DATABASE_URL e BETTER_AUTH_SECRET são obrigatórios para os testes de inspector profile");
  }

  return {
    host: "127.0.0.1",
    port: 3001,
    appEnv: "development",
    appWebUrl,
    betterAuthSecret,
    betterAuthUrl,
    databaseUrl
  };
}

async function createTestApp() {
  const env = buildTestEnv();
  const app = await buildApp(env);
  const { db } = getDb(env.databaseUrl!);
  return { env, app, db };
}

function getCookieHeader(setCookieHeader: string | string[] | undefined) {
  if (!setCookieHeader) return "";

  return (Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader])
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

async function signUpAndGetSession(app: FastifyInstance, label: string) {
  const email = `${label}-${randomUUID()}@test.local`;
  const password = "Teste1234!";
  const name = `Test ${label}`;

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

  assert.ok(signUpResponse.statusCode >= 200 && signUpResponse.statusCode < 300);

  const cookieHeader = getCookieHeader(signUpResponse.headers["set-cookie"]);
  assert.ok(cookieHeader);

  const sessionResponse = await app.inject({
    method: "GET",
    url: "/api/auth/get-session",
    headers: {
      cookie: cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  const body = sessionResponse.json() as { user: { id: string } } | null;
  assert.ok(body);

  return {
    authUserId: body.user.id,
    email,
    cookieHeader
  };
}

async function createOperationalUser(params: {
  db: Database;
  authUserId: string;
  email: string;
  fullName: string;
  roleCode: "admin" | "inspector";
}) {
  const userId = randomUUID();

  await params.db.insert(users).values({
    id: userId,
    email: params.email,
    fullName: params.fullName,
    status: "active",
    authUserId: params.authUserId
  });

  await params.db.insert(userRoles).values({
    id: randomUUID(),
    userId,
    roleCode: params.roleCode,
    assignedByUserId: userId,
    isActive: true
  });

  return userId;
}

integration("inspector profile: admin vincula user inspector e o próprio inspetor atualiza departureCity", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const adminSession = await signUpAndGetSession(app, "admin-inspector-link");
  const inspectorSession = await signUpAndGetSession(app, "inspector-self-profile");

  await createOperationalUser({
    db,
    authUserId: adminSession.authUserId,
    email: adminSession.email,
    fullName: "Admin Link",
    roleCode: "admin"
  });

  const inspectorUserId = await createOperationalUser({
    db,
    authUserId: inspectorSession.authUserId,
    email: inspectorSession.email,
    fullName: "Inspector User",
    roleCode: "inspector"
  });

  const inspectorId = randomUUID();
  await db.insert(inspectors).values({
    id: inspectorId,
    fullName: "Inspector Person",
    departureCity: "Hartselle",
    status: "active"
  });

  const linkResponse = await app.inject({
    method: "PATCH",
    url: `/users/${inspectorUserId}/inspector-link`,
    headers: {
      cookie: adminSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: { inspectorId }
  });

  assert.equal(linkResponse.statusCode, 200);
  const linkBody = linkResponse.json() as {
    ok: true;
    user: { inspectorId: string | null; roleCode: string | null };
  };
  assert.equal(linkBody.user.inspectorId, inspectorId);
  assert.equal(linkBody.user.roleCode, "inspector");

  const meResponse = await app.inject({
    method: "GET",
    url: "/me",
    headers: {
      cookie: inspectorSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(meResponse.statusCode, 200);
  const meBody = meResponse.json() as {
    ok: true;
    profile: { inspectorId: string | null };
  };
  assert.equal(meBody.profile.inspectorId, inspectorId);

  const selfProfileResponse = await app.inject({
    method: "GET",
    url: "/inspector-profile/me",
    headers: {
      cookie: inspectorSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(selfProfileResponse.statusCode, 200);
  const selfProfileBody = selfProfileResponse.json() as {
    ok: true;
    profile: { inspectorId: string; departureCity: string | null };
  };
  assert.equal(selfProfileBody.profile.inspectorId, inspectorId);
  assert.equal(selfProfileBody.profile.departureCity, "Hartselle");

  const patchResponse = await app.inject({
    method: "PATCH",
    url: "/inspector-profile/me",
    headers: {
      cookie: inspectorSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: {
      departureCity: "Cullman",
      phone: "11999999999"
    }
  });

  assert.equal(patchResponse.statusCode, 200);
  const patchBody = patchResponse.json() as {
    ok: true;
    profile: { departureCity: string | null; phone: string | null };
  };
  assert.equal(patchBody.profile.departureCity, "Cullman");
  assert.equal(patchBody.profile.phone, "11999999999");
});

integration("inspector profile: inspector sem vínculo não acessa self-service", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const inspectorSession = await signUpAndGetSession(app, "inspector-unlinked");
  await createOperationalUser({
    db,
    authUserId: inspectorSession.authUserId,
    email: inspectorSession.email,
    fullName: "Inspector Unlinked",
    roleCode: "inspector"
  });

  const response = await app.inject({
    method: "GET",
    url: "/inspector-profile/me",
    headers: {
      cookie: inspectorSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(response.statusCode, 403);
  const body = response.json() as { ok: false; error: string };
  assert.equal(body.error, "FORBIDDEN");
});
