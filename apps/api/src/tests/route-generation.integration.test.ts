import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { inspectorAccounts, inspectors, userRoles, users } from "../db/schema.js";
import type { ApiEnv } from "../env.js";
import { getDb } from "../lib/db.js";
import { buildNormalizedAddress } from "../modules/routes/address-normalization.js";
import { parseRouteSourceXlsxBuffer } from "../modules/routes/parse-route-source-xlsx.js";

const databaseUrl = process.env.DATABASE_URL;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
const appWebUrl = process.env.APP_WEB_URL ?? "http://localhost:5173";
const routeSourceXlsxPath = fileURLToPath(
  new URL("../../../../docs/arquivos/InspectionsFull.xlsx", import.meta.url)
);

const integration = databaseUrl && betterAuthSecret ? test : test.skip;

type Database = ReturnType<typeof getDb>["db"];

function buildTestEnv(): ApiEnv {
  if (!databaseUrl || !betterAuthSecret) {
    throw new Error("DATABASE_URL e BETTER_AUTH_SECRET são obrigatórios para os testes de rotas");
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

  assert.ok(
    signUpResponse.statusCode >= 200 && signUpResponse.statusCode < 300,
    `sign-up deveria funcionar, mas retornou ${signUpResponse.statusCode}: ${signUpResponse.body}`
  );

  const cookieHeader = getCookieHeader(signUpResponse.headers["set-cookie"]);
  assert.ok(cookieHeader, "sign-up deveria retornar cookie de sessão");

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
  const body = sessionResponse.json() as { user: { id: string } } | null;
  assert.ok(body, "get-session deveria retornar sessão válida");

  return {
    authUserId: body.user.id,
    email,
    cookieHeader
  };
}

async function createAdminSession(app: FastifyInstance, db: Database, label: string) {
  const session = await signUpAndGetSession(app, label);
  const userId = randomUUID();

  await db.insert(users).values({
    id: userId,
    email: session.email,
    fullName: `Admin ${label}`,
    status: "active",
    authUserId: session.authUserId
  });

  await db.insert(userRoles).values({
    id: randomUUID(),
    userId,
    roleCode: "admin",
    assignedByUserId: userId,
    isActive: true
  });

  return session;
}

function buildMultipartFilePayload(params: {
  fieldName: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}) {
  const boundary = `----ata-portal-${randomUUID()}`;
  const chunks = [
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${params.fieldName}"; filename="${params.fileName}"\r\n` +
        `Content-Type: ${params.contentType}\r\n\r\n`,
      "utf8"
    ),
    params.buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`, "utf8")
  ];

  const body = Buffer.concat(chunks);

  return {
    body,
    boundary
  };
}

function normalizeCity(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

integration("routes: cria rota otimizada usando a cidade de partida do inspetor", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const admin = await createAdminSession(app, db, "route-origin-city");
  const inspectorId = randomUUID();
  const inspectorAccountId = randomUUID();

  await db.insert(inspectors).values({
    id: inspectorId,
    fullName: "Inspector Route Test",
    departureCity: "HINESVILLE",
    status: "active"
  });

  await db.insert(inspectorAccounts).values({
    id: inspectorAccountId,
    accountCode: "ATAVEND04",
    accountType: "field",
    currentInspectorId: inspectorId,
    isActive: true
  });

  const buffer = await readFile(routeSourceXlsxPath);
  const parsedCandidates = parseRouteSourceXlsxBuffer({ buffer });
  const originalAccountCandidates = parsedCandidates.filter(
    (candidate) => candidate.sourceInspectorAccountCode === "ATAVEND04" && candidate.sourceStatus !== "Canceled"
  );
  const originalFirstCity = originalAccountCandidates[0]?.city ?? null;
  assert.equal(normalizeCity(originalFirstCity), "LUDOWICI");

  const multipart = buildMultipartFilePayload({
    fieldName: "file",
    fileName: "InspectionsFull.xlsx",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer
  });

  const sourceBatchResponse = await app.inject({
    method: "POST",
    url: "/routes/source-batches/xlsx?routeDate=2026-03-10",
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      "content-length": String(multipart.body.length)
    },
    payload: multipart.body
  });

  assert.equal(sourceBatchResponse.statusCode, 200);
  const sourceBatchBody = sourceBatchResponse.json() as {
    ok: true;
    batch: { batchId: string };
  };

  const createRouteResponse = await app.inject({
    method: "POST",
    url: "/routes",
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: {
      sourceBatchId: sourceBatchBody.batch.batchId,
      routeDate: "2026-03-10",
      inspectorAccountCode: "ATAVEND04"
    }
  });

  assert.equal(createRouteResponse.statusCode, 200);
  const createRouteBody = createRouteResponse.json() as {
    ok: true;
    routeId: string;
    totalStops: number;
    originCity: string | null;
    optimizationMode: string;
  };
  assert.equal(createRouteBody.originCity, "HINESVILLE");
  assert.equal(createRouteBody.optimizationMode, "heuristic_city_zip");
  assert.equal(createRouteBody.totalStops, originalAccountCandidates.length);

  const getRouteResponse = await app.inject({
    method: "GET",
    url: `/routes/${createRouteBody.routeId}`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(getRouteResponse.statusCode, 200);
  const routeBody = getRouteResponse.json() as {
    ok: true;
    route: { originCity: string | null; optimizationMode: string };
    stops: Array<{
      addressLine1: string | null;
      city: string | null;
      state: string | null;
      zipCode: string | null;
      normalizedAddressLine1: string | null;
      normalizedCity: string | null;
      normalizedState: string | null;
      normalizedZipCode: string | null;
      geocodeStatus: string;
      geocodeQuality: string | null;
      geocodeSource: string | null;
      geocodeReviewRequired: boolean;
      geocodeReviewReason: string | null;
      latitude: string | null;
      longitude: string | null;
    }>;
  };

  assert.equal(routeBody.route.originCity, "HINESVILLE");
  assert.equal(routeBody.route.optimizationMode, "heuristic_city_zip");
  assert.ok(routeBody.stops.length > 0);
  assert.equal(normalizeCity(routeBody.stops[0]?.city), "HINESVILLE");
  assert.notEqual(normalizeCity(routeBody.stops[0]?.city), normalizeCity(originalFirstCity));
  assert.ok(routeBody.stops.slice(0, 3).every((stop) => normalizeCity(stop.city) === "HINESVILLE"));
  const expectedNormalizedFirstStop = buildNormalizedAddress({
    addressLine1: routeBody.stops[0]?.addressLine1 ?? null,
    city: routeBody.stops[0]?.city ?? null,
    state: routeBody.stops[0]?.state ?? null,
    zipCode: routeBody.stops[0]?.zipCode ?? null
  });
  assert.equal(routeBody.stops[0]?.normalizedAddressLine1, expectedNormalizedFirstStop.normalizedAddressLine1);
  assert.equal(routeBody.stops[0]?.normalizedCity, expectedNormalizedFirstStop.normalizedCity);
  assert.equal(routeBody.stops[0]?.normalizedState, expectedNormalizedFirstStop.normalizedState);
  assert.equal(routeBody.stops[0]?.normalizedZipCode, expectedNormalizedFirstStop.normalizedZipCode);
  assert.equal(routeBody.stops[0]?.geocodeStatus, "pending");
  assert.equal(routeBody.stops[0]?.geocodeQuality, null);
  assert.equal(routeBody.stops[0]?.geocodeSource, null);
  assert.equal(routeBody.stops[0]?.geocodeReviewRequired, false);
  assert.equal(routeBody.stops[0]?.geocodeReviewReason, null);
  assert.equal(routeBody.stops[0]?.latitude, null);
  assert.equal(routeBody.stops[0]?.longitude, null);

  const listRoutesResponse = await app.inject({
    method: "GET",
    url: "/routes?routeDate=2026-03-10&inspectorAccountCode=ATAVEND04",
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(listRoutesResponse.statusCode, 200);
  const listRoutesBody = listRoutesResponse.json() as {
    ok: true;
    routes: Array<{
      id: string;
      routeDate: string;
      inspectorAccountCode: string;
      originCity: string | null;
      optimizationMode: string;
      totalStops: number;
    }>;
    meta: { total: number };
  };

  assert.equal(listRoutesBody.meta.total, 1);
  assert.equal(listRoutesBody.routes[0]?.id, createRouteBody.routeId);
  assert.equal(listRoutesBody.routes[0]?.routeDate, "2026-03-10");
  assert.equal(listRoutesBody.routes[0]?.inspectorAccountCode, "ATAVEND04");
  assert.equal(listRoutesBody.routes[0]?.originCity, "HINESVILLE");
  assert.equal(listRoutesBody.routes[0]?.optimizationMode, "heuristic_city_zip");
  assert.equal(listRoutesBody.routes[0]?.totalStops, originalAccountCandidates.length);
});
