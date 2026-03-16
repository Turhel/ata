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
      response.end(
        JSON.stringify([
          {
            lat: "31.8468781",
            lon: "-81.5959454",
            address: {
              house_number: "100",
              road: "Main Street",
              city: "Hinesville",
              state: "Georgia",
              postcode: "31313"
            }
          }
        ])
      );
      return;
    }

    if (street === "300 Side St." && city === "Approxville") {
      response.end(
        JSON.stringify([
          {
            lat: "32.0000000",
            lon: "-81.0000000",
            address: {
              house_number: "300",
              road: "Side Street",
              city: "Approxville",
              state: "Georgia",
              postcode: "99999"
            }
          }
        ])
      );
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
  const inspectorAccountCode = "ATAGEO04";
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([
    {
      STATUS: "Assigned",
      WORDER: "ROUTE-GEOCODE-001",
      INSPECTOR: inspectorAccountCode,
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
      WORDER: "ROUTE-GEOCODE-003",
      INSPECTOR: inspectorAccountCode,
      CLIENT: "CLIENT_X",
      NAME: "Resident Three",
      ADDRESS1: "300 Side St.",
      ADDRESS2: null,
      CITY: "Approxville",
      STATE: "GA",
      ZIP: "31399-1234",
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
      INSPECTOR: inspectorAccountCode,
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
  return {
    inspectorAccountCode,
    buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
  };
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

  const { inspectorAccountCode, buffer } = buildRouteWorkbookBuffer();

  await db.insert(inspectorAccounts).values({
    id: randomUUID(),
    accountCode: inspectorAccountCode,
    accountType: "field",
    currentInspectorId: inspectorId,
    isActive: true
  });

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
      inspectorAccountCode
    }
  });

  assert.equal(createRouteResponse.statusCode, 200);
  const createRouteBody = createRouteResponse.json() as {
    ok: true;
    routeId: string;
    alerts: {
      reviewRequiredCount: number;
      approximateCount: number;
      notFoundCount: number;
      pendingCount: number;
    };
  };
  assert.equal(createRouteBody.alerts.reviewRequiredCount, 0);
  assert.equal(createRouteBody.alerts.pendingCount, 3);

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
    preciseCandidates: number;
    approximateCandidates: number;
    reviewRequiredCandidates: number;
    notFoundCandidates: number;
    failedCandidates: number;
    skippedCandidates: number;
  };
  assert.deepEqual(geocodeBody, {
    ok: true,
    batchId: sourceBatchBody.batch.batchId,
    totalCandidates: 3,
    processedCandidates: 3,
    resolvedCandidates: 2,
    preciseCandidates: 1,
    approximateCandidates: 1,
    reviewRequiredCandidates: 1,
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
      geocodeQuality: routeCandidates.geocodeQuality,
      geocodeSource: routeCandidates.geocodeSource,
      geocodeReviewRequired: routeCandidates.geocodeReviewRequired,
      geocodeReviewReason: routeCandidates.geocodeReviewReason,
      normalizedAddressLine1: routeCandidates.normalizedAddressLine1,
      normalizedCity: routeCandidates.normalizedCity,
      normalizedState: routeCandidates.normalizedState,
      normalizedZipCode: routeCandidates.normalizedZipCode
    })
    .from(routeCandidates)
    .where(eq(routeCandidates.sourceBatchId, sourceBatchBody.batch.batchId));

  const candidateByCode = new Map(candidates.map((candidate) => [candidate.externalOrderCode, candidate]));
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.geocodeStatus, "resolved");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.latitude, "31.8468781");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.longitude, "-81.5959454");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.geocodeQuality, "precise");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.geocodeSource, "nominatim");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.geocodeReviewRequired, false);
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.normalizedAddressLine1, "100 MAIN ST");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.normalizedCity, "HINESVILLE");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.normalizedState, "GA");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-001")?.normalizedZipCode, "31313");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-003")?.geocodeStatus, "resolved");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-003")?.geocodeQuality, "approximate");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-003")?.geocodeReviewRequired, false);
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-002")?.geocodeStatus, "not_found");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-002")?.geocodeQuality, "not_found");
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-002")?.geocodeReviewRequired, true);
  assert.equal(candidateByCode.get("ROUTE-GEOCODE-002")?.geocodeReviewReason, "Nenhum resultado retornado pelo geocoder");

  const reviewCandidatesResponse = await app.inject({
    method: "GET",
    url: `/routes/source-batches/${sourceBatchBody.batch.batchId}/candidates?review=required`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(reviewCandidatesResponse.statusCode, 200);
  const reviewCandidatesBody = reviewCandidatesResponse.json() as {
    ok: true;
    candidates: Array<{ externalOrderCode: string; geocodeReviewRequired: boolean; geocodeQuality: string | null }>;
    meta: { total: number };
  };
  assert.equal(reviewCandidatesBody.meta.total, 1);
  assert.deepEqual(reviewCandidatesBody.candidates.map((candidate) => candidate.externalOrderCode), ["ROUTE-GEOCODE-002"]);
  assert.equal(reviewCandidatesBody.candidates[0]?.geocodeReviewRequired, true);
  assert.equal(reviewCandidatesBody.candidates[0]?.geocodeQuality, "not_found");

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
    route: {
      alerts: {
        reviewRequiredCount: number;
        approximateCount: number;
        notFoundCount: number;
        pendingCount: number;
      };
    };
    stops: Array<{
      addressLine1: string | null;
      geocodeStatus: string;
      geocodeQuality: string | null;
      geocodeSource: string | null;
      geocodeReviewRequired: boolean;
      geocodeReviewReason: string | null;
      normalizedAddressLine1: string | null;
      latitude: string | null;
      longitude: string | null;
    }>;
  };

  assert.equal(routeBody.route.alerts.reviewRequiredCount, 1);
  assert.equal(routeBody.route.alerts.approximateCount, 1);
  assert.equal(routeBody.route.alerts.notFoundCount, 1);
  assert.equal(routeBody.route.alerts.pendingCount, 0);
  const stopByAddress = new Map(routeBody.stops.map((stop) => [stop.addressLine1, stop]));
  assert.equal(stopByAddress.get("100 Main St")?.geocodeStatus, "resolved");
  assert.equal(stopByAddress.get("100 Main St")?.geocodeQuality, "precise");
  assert.equal(stopByAddress.get("100 Main St")?.geocodeReviewRequired, false);
  assert.equal(stopByAddress.get("100 Main St")?.normalizedAddressLine1, "100 MAIN ST");
  assert.equal(stopByAddress.get("100 Main St")?.latitude, "31.8468781");
  assert.equal(stopByAddress.get("100 Main St")?.longitude, "-81.5959454");
  assert.equal(stopByAddress.get("300 Side St.")?.geocodeStatus, "resolved");
  assert.equal(stopByAddress.get("300 Side St.")?.geocodeQuality, "approximate");
  assert.equal(stopByAddress.get("300 Side St.")?.geocodeReviewRequired, false);
  assert.equal(stopByAddress.get("200 Unknown Rd")?.geocodeStatus, "not_found");
  assert.equal(stopByAddress.get("200 Unknown Rd")?.geocodeQuality, "not_found");
  assert.equal(stopByAddress.get("200 Unknown Rd")?.geocodeReviewRequired, true);
  assert.equal(stopByAddress.get("200 Unknown Rd")?.geocodeReviewReason, "Nenhum resultado retornado pelo geocoder");

  const storedStops = await db
    .select({
      geocodeStatus: routeStops.geocodeStatus,
      geocodeQuality: routeStops.geocodeQuality
    })
    .from(routeStops);

  assert.ok(storedStops.some((stop) => stop.geocodeStatus === "resolved"));
  assert.ok(storedStops.some((stop) => stop.geocodeStatus === "not_found"));
  assert.ok(storedStops.some((stop) => stop.geocodeQuality === "precise"));
  assert.ok(storedStops.some((stop) => stop.geocodeQuality === "approximate"));

  const replacedRouteResponse = await app.inject({
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
      inspectorAccountCode,
      replaceExisting: true,
      replaceReason: "rebuild after geocode"
    }
  });

  assert.equal(replacedRouteResponse.statusCode, 200);
  const replacedRouteBody = replacedRouteResponse.json() as {
    ok: true;
    optimizationMode: string;
    alerts: {
      reviewRequiredCount: number;
      approximateCount: number;
      notFoundCount: number;
      pendingCount: number;
    };
  };
  assert.equal(replacedRouteBody.optimizationMode, "heuristic_geo_city_zip");
  assert.equal(replacedRouteBody.alerts.reviewRequiredCount, 1);
  assert.equal(replacedRouteBody.alerts.approximateCount, 1);
  assert.equal(replacedRouteBody.alerts.notFoundCount, 1);
  assert.equal(replacedRouteBody.alerts.pendingCount, 0);
});
