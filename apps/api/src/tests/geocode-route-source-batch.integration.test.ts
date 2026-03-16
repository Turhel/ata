import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import * as XLSX from "xlsx";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { buildApp } from "../app.js";
import { inspectorAccounts, inspectors, routeCandidates, routeStops, userRoles, users } from "../db/schema.js";
import type { ApiEnv } from "../env.js";
import { getDb } from "../lib/db.js";

const databaseUrl = process.env.DATABASE_URL;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
const appWebUrl = process.env.APP_WEB_URL ?? "http://localhost:5173";

const integration = databaseUrl && betterAuthSecret ? test : test.skip;

type Database = ReturnType<typeof getDb>["db"];

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

async function startFakeNominatim() {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const street = url.searchParams.get("street");
    const city = url.searchParams.get("city");

    response.setHeader("content-type", "application/json");

    if (street === "100 Main St" && city === "Hinesville") {
      response.end(JSON.stringify([{ lat: "31.8468781", lon: "-81.5959454" }]));
      return;
    }

    if (street === "200 Unknown Rd" && city === "Nowhere") {
      response.end(JSON.stringify([]));
      return;
    }

    response.statusCode = 500;
    response.end(JSON.stringify({ error: "unexpected query" }));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Falha ao iniciar servidor fake do Nominatim");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

function buildTestEnv(nominatimBaseUrl: string): ApiEnv {
  if (!databaseUrl || !betterAuthSecret) {
    throw new Error("DATABASE_URL e BETTER_AUTH_SECRET são obrigatórios para os testes de geocode");
  }

  return {
    host: "127.0.0.1",
    port: 3001,
    appEnv: "development",
    appWebUrl,
    betterAuthSecret,
    betterAuthUrl,
    databaseUrl,
    nominatimBaseUrl
  };
}

async function createTestApp(nominatimBaseUrl: string) {
  const env = buildTestEnv(nominatimBaseUrl);
  const app = await buildApp(env);
  const { db } = getDb(env.databaseUrl!);
  return { env, app, db };
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

  return {
    body: Buffer.concat(chunks),
    boundary
  };
}

function buildRouteWorkbookBuffer() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([
    {
      STATUS: "Assigned",
      WORDER: "ROUTE-GEOCODE-001",
      INSPECTOR: "ATAVEND04",
      CLIENT: "CLIENT_X",
      NAME: "Resident One",
      ADDRESS1: "100 Main St",
      ADDRESS2: null,
      CITY: "Hinesville",
      STATE: "GA",
      ZIP: "31313",
      OTYPE: "E3RNN",
      DUEDATE: "03/10/2026",
      "START DATE": "03/10/2026",
      WINDOW: "N",
      RUSH: "N",
      FOLLOWUP: "N",
      VACANT: "N"
    },
    {
      STATUS: "Assigned",
      WORDER: "ROUTE-GEOCODE-002",
      INSPECTOR: "ATAVEND04",
      CLIENT: "CLIENT_X",
      NAME: "Resident Two",
      ADDRESS1: "200 Unknown Rd",
      ADDRESS2: null,
      CITY: "Nowhere",
      STATE: "GA",
      ZIP: "00000",
      OTYPE: "E3RNN",
      DUEDATE: "03/10/2026",
      "START DATE": "03/10/2026",
      WINDOW: "N",
      RUSH: "N",
      FOLLOWUP: "N",
      VACANT: "N"
    }
  ]);

  XLSX.utils.book_append_sheet(workbook, sheet, "Routes");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

integration("routes geocode: geocodifica candidates do batch e sincroniza stops existentes", async (t) => {
  const fakeNominatim = await startFakeNominatim();
  t.after(async () => {
    await fakeNominatim.close();
  });

  const { app, db } = await createTestApp(fakeNominatim.baseUrl);
  t.after(async () => {
    await app.close();
  });

  const admin = await createAdminSession(app, db, "route-geocode");
  const inspectorId = randomUUID();

  await db.insert(inspectors).values({
    id: inspectorId,
    fullName: "Inspector Route Geocode",
    departureCity: "Hinesville",
    status: "active"
  });

  await db.insert(inspectorAccounts).values({
    id: randomUUID(),
    accountCode: "ATAVEND04",
    accountType: "field",
    currentInspectorId: inspectorId,
    isActive: true
  });

  const buffer = buildRouteWorkbookBuffer();
  const multipart = buildMultipartFilePayload({
    fieldName: "file",
    fileName: "route-geocode.xlsx",
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
  const createRouteBody = createRouteResponse.json() as { ok: true; routeId: string };

  const geocodeResponse = await app.inject({
    method: "POST",
    url: `/routes/source-batches/${sourceBatchBody.batch.batchId}/geocode`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: { force: true }
  });

  assert.equal(geocodeResponse.statusCode, 200);
  const geocodeBody = geocodeResponse.json() as {
    ok: true;
    totalCandidates: number;
    processedCandidates: number;
    resolvedCandidates: number;
    notFoundCandidates: number;
    failedCandidates: number;
    skippedCandidates: number;
  };
  assert.deepEqual(geocodeBody, {
    ok: true,
    batchId: sourceBatchBody.batch.batchId,
    totalCandidates: 2,
    processedCandidates: 2,
    resolvedCandidates: 1,
    notFoundCandidates: 1,
    failedCandidates: 0,
    skippedCandidates: 0
  });

  const candidates = await db
    .select({
      id: routeCandidates.id,
      externalOrderCode: routeCandidates.externalOrderCode,
      latitude: routeCandidates.latitude,
      longitude: routeCandidates.longitude,
      geocodeStatus: routeCandidates.geocodeStatus,
      geocodeSource: routeCandidates.geocodeSource
    })
    .from(routeCandidates)
    .where(eq(routeCandidates.sourceBatchId, sourceBatchBody.batch.batchId));

  const candidateByCode = new Map(candidates.map((candidate) => [candidate.externalOrderCode, candidate]));
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.geocodeStatus, "resolved");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.latitude, "31.8468781");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.longitude, "-81.5959454");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.geocodeSource, "nominatim");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-002")?.geocodeStatus, "not_found");

  const routeResponse = await app.inject({
    method: "GET",
    url: `/routes/${createRouteBody.routeId}`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(routeResponse.statusCode, 200);
  const routeBody = routeResponse.json() as {
    ok: true;
    stops: Array<{
      addressLine1: string | null;
      geocodeStatus: string;
      geocodeSource: string | null;
      latitude: string | null;
      longitude: string | null;
    }>;
  };

  const stopByAddress = new Map(routeBody.stops.map((stop) => [stop.addressLine1, stop]));
  assert.equal(stopByAddress.get("100 Main St")?.geocodeStatus, "resolved");
  assert.equal(stopByAddress.get("100 Main St")?.latitude, "31.8468781");
  assert.equal(stopByAddress.get("100 Main St")?.longitude, "-81.5959454");
  assert.equal(stopByAddress.get("200 Unknown Rd")?.geocodeStatus, "not_found");

  const storedStops = await db
    .select({
      geocodeStatus: routeStops.geocodeStatus
    })
    .from(routeStops);

  assert.ok(storedStops.some((stop) => stop.geocodeStatus === "resolved"));
  assert.ok(storedStops.some((stop) => stop.geocodeStatus === "not_found"));
});
