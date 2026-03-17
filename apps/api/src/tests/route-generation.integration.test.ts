import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import * as XLSX from "xlsx";
import { and, eq } from "drizzle-orm";
import { buildApp } from "../app.js";
import { inspectorAccounts, inspectors, routeCandidates, userRoles, users } from "../db/schema.js";
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

function buildTestEnv(overrides: Partial<ApiEnv> = {}): ApiEnv {
  if (!databaseUrl || !betterAuthSecret) {
    throw new Error("DATABASE_URL e BETTER_AUTH_SECRET são obrigatórios para os testes de rotas");
  }

  return {
    host: "127.0.0.1",
    port: 3001,
    appEnv: "development",
    logLevel: "fatal",    appWebUrl,
    betterAuthSecret,
    betterAuthUrl,
    databaseUrl,
    ...overrides
  };
}

async function createTestApp(overrides: Partial<ApiEnv> = {}) {
  const env = buildTestEnv(overrides);
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

function buildSmallRouteWorkbookBuffer(inspectorAccountCode: string) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([
    {
      STATUS: "Assigned",
      WORDER: "MATRIX-ORDER-001",
      INSPECTOR: inspectorAccountCode,
      CLIENT: "CLIENT_MATRIX",
      NAME: "Resident A",
      ADDRESS1: "100 Alpha St",
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
      WORDER: "MATRIX-ORDER-002",
      INSPECTOR: inspectorAccountCode,
      CLIENT: "CLIENT_MATRIX",
      NAME: "Resident B",
      ADDRESS1: "200 Bravo St",
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
      WORDER: "MATRIX-ORDER-003",
      INSPECTOR: inspectorAccountCode,
      CLIENT: "CLIENT_MATRIX",
      NAME: "Resident C",
      ADDRESS1: "300 Charlie St",
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
    }
  ]);

  XLSX.utils.book_append_sheet(workbook, sheet, "Routes");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
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
  }).onConflictDoUpdate({
    target: inspectorAccounts.accountCode,
    set: {
      currentInspectorId: inspectorId,
      accountType: "field",
      isActive: true
    }
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
    alerts: {
      reviewRequiredCount: number;
      approximateCount: number;
      notFoundCount: number;
      pendingCount: number;
    };
  };
  assert.equal(createRouteBody.originCity, "HINESVILLE");
  assert.equal(createRouteBody.optimizationMode, "heuristic_city_zip");
  assert.equal(createRouteBody.totalStops, originalAccountCandidates.length);
  assert.equal(createRouteBody.alerts.reviewRequiredCount, 0);
  assert.equal(createRouteBody.alerts.approximateCount, 0);
  assert.equal(createRouteBody.alerts.notFoundCount, 0);
  assert.equal(createRouteBody.alerts.pendingCount, originalAccountCandidates.length);

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
    route: {
      originCity: string | null;
      optimizationMode: string;
      alerts: {
        reviewRequiredCount: number;
        approximateCount: number;
        notFoundCount: number;
        pendingCount: number;
      };
    };
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
  assert.equal(routeBody.route.alerts.reviewRequiredCount, 0);
  assert.equal(routeBody.route.alerts.approximateCount, 0);
  assert.equal(routeBody.route.alerts.notFoundCount, 0);
  assert.equal(routeBody.route.alerts.pendingCount, originalAccountCandidates.length);
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

integration("routes: usa matriz OSRM quando todos os candidates já têm coordenadas", async (t) => {
  const osrmServer = createServer((request, response) => {
    if (!request.url?.startsWith("/table/v1/driving/")) {
      response.statusCode = 404;
      response.end("not found");
      return;
    }

    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify({
        code: "Ok",
        distances: [
          [0, 100, 10],
          [100, 0, 5],
          [10, 5, 0]
        ]
      })
    );
  });

  await new Promise<void>((resolve) => osrmServer.listen(0, "127.0.0.1", () => resolve()));
  const address = osrmServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Não foi possível iniciar o servidor fake de OSRM");
  }

  const { app, db } = await createTestApp({
    routingEngineBaseUrl: `http://127.0.0.1:${address.port}`
  });
  t.after(async () => {
    await app.close();
    await new Promise<void>((resolve, reject) => osrmServer.close((error) => (error ? reject(error) : resolve())));
  });

  const admin = await createAdminSession(app, db, "route-matrix-osrm");
  const inspectorId = randomUUID();
  const inspectorAccountCode = "ATAMTX01";

  await db.insert(inspectors).values({
    id: inspectorId,
    fullName: "Inspector Matrix Test",
    departureCity: "HINESVILLE",
    status: "active"
  });

  await db
    .insert(inspectorAccounts)
    .values({
      id: randomUUID(),
      accountCode: inspectorAccountCode,
      accountType: "field",
      currentInspectorId: inspectorId,
      isActive: true
    })
    .onConflictDoUpdate({
      target: inspectorAccounts.accountCode,
      set: {
        currentInspectorId: inspectorId,
        accountType: "field",
        isActive: true
      }
    });

  const multipart = buildMultipartFilePayload({
    fieldName: "file",
    fileName: "matrix-route.xlsx",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: buildSmallRouteWorkbookBuffer(inspectorAccountCode)
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
  const sourceBatchBody = sourceBatchResponse.json() as { ok: true; batch: { batchId: string } };

  const batchCandidates = await db
    .select({
      id: routeCandidates.id,
      externalOrderCode: routeCandidates.externalOrderCode
    })
    .from(routeCandidates)
    .where(
      and(
        eq(routeCandidates.sourceBatchId, sourceBatchBody.batch.batchId),
        eq(routeCandidates.sourceInspectorAccountCode, inspectorAccountCode)
      )
    )
    .orderBy(routeCandidates.lineNumber);

  assert.equal(batchCandidates.length, 3);

  const coordinatesByOrderCode = new Map([
    ["MATRIX-ORDER-001", { latitude: "31.000000", longitude: "-81.000000" }],
    ["MATRIX-ORDER-002", { latitude: "31.100000", longitude: "-81.100000" }],
    ["MATRIX-ORDER-003", { latitude: "31.010000", longitude: "-81.010000" }]
  ]);

  for (const candidate of batchCandidates) {
    const coordinates = coordinatesByOrderCode.get(candidate.externalOrderCode);
    assert.ok(coordinates);
    await db
      .update(routeCandidates)
      .set({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        geocodeStatus: "resolved",
        geocodeQuality: "precise",
        geocodeSource: "nominatim"
      })
      .where(eq(routeCandidates.id, candidate.id));
  }

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
      inspectorAccountCode
    }
  });

  assert.equal(createRouteResponse.statusCode, 200);
  const createRouteBody = createRouteResponse.json() as {
    ok: true;
    routeId: string;
    optimizationMode: string;
    alerts: {
      pendingCount: number;
      reviewRequiredCount: number;
      approximateCount: number;
      notFoundCount: number;
    };
  };
  assert.equal(createRouteBody.optimizationMode, "matrix_osrm");
  assert.equal(createRouteBody.alerts.pendingCount, 0);
  assert.equal(createRouteBody.alerts.reviewRequiredCount, 0);
  assert.equal(createRouteBody.alerts.approximateCount, 0);
  assert.equal(createRouteBody.alerts.notFoundCount, 0);

  const routeDetailResponse = await app.inject({
    method: "GET",
    url: `/routes/${createRouteBody.routeId}`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(routeDetailResponse.statusCode, 200);
  const routeDetailBody = routeDetailResponse.json() as {
    ok: true;
    route: { optimizationMode: string };
    stops: Array<{ addressLine1: string | null }>;
  };

  assert.equal(routeDetailBody.route.optimizationMode, "matrix_osrm");
  assert.deepEqual(routeDetailBody.stops.map((stop) => stop.addressLine1), [
    "100 Alpha St",
    "300 Charlie St",
    "200 Bravo St"
  ]);
});

