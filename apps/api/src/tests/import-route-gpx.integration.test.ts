import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import * as XLSX from "xlsx";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { inspectorAccounts, inspectors, routeEvents, userRoles, users } from "../db/schema.js";
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

function buildTestEnv(): ApiEnv {
  if (!databaseUrl || !betterAuthSecret) {
    throw new Error("DATABASE_URL e BETTER_AUTH_SECRET são obrigatórios para os testes de GPX");
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
  const { db } = getDb(env.databaseUrl!);
  return { app, db };
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
  fields?: Record<string, string>;
}) {
  const boundary = `----ata-portal-${randomUUID()}`;
  const parts: Buffer[] = [];

  for (const [fieldName, value] of Object.entries(params.fields ?? {})) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"\r\n\r\n${value}\r\n`,
        "utf8"
      )
    );
  }

  parts.push(
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${params.fieldName}"; filename="${params.fileName}"\r\n` +
        `Content-Type: ${params.contentType}\r\n\r\n`,
      "utf8"
    )
  );
  parts.push(params.buffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"));

  return {
    body: Buffer.concat(parts),
    boundary
  };
}

function buildRouteWorkbookBuffer(inspectorAccountCode: string) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([
    {
      STATUS: "Assigned",
      WORDER: "GPX-ORDER-001",
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
      WORDER: "GPX-ORDER-002",
      INSPECTOR: inspectorAccountCode,
      CLIENT: "CLIENT_X",
      NAME: "Resident Two",
      ADDRESS1: "200 Side St",
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

function buildGpxBuffer() {
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <rte>
    <rtept lat="31.850000" lon="-81.600000">
      <name>200 Side St</name>
      <src>200 Side St, Hinesville GA 31313, United States</src>
      <sym>Brown</sym>
    </rtept>
    <rtept lat="31.8468781" lon="-81.5959454">
      <name>100 Main St</name>
      <src>100 Main St, Hinesville GA 31313, United States</src>
      <sym>Dark_Green</sym>
    </rtept>
    <rtept lat="31.900000" lon="-81.500000">
      <name>999 Missing Rd</name>
      <src>999 Missing Rd, Hinesville GA 31313, United States</src>
      <sym>Dark_Red</sym>
    </rtept>
  </rte>
</gpx>`,
    "utf8"
  );
}

integration("routes gpx: importa sequência externa e marca stops sem match para revisão", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const admin = await createAdminSession(app, db, "route-gpx");
  const inspectorId = randomUUID();
  const inspectorAccountCode = "ATAGPX04";

  await db.insert(inspectors).values({
    id: inspectorId,
    fullName: "Inspector Route GPX",
    departureCity: "Hinesville",
    status: "active"
  });

  await db.insert(inspectorAccounts).values({
    id: randomUUID(),
    accountCode: inspectorAccountCode,
    accountType: "field",
    currentInspectorId: inspectorId,
    isActive: true
  });

  const xlsxMultipart = buildMultipartFilePayload({
    fieldName: "file",
    fileName: "route-gpx.xlsx",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: buildRouteWorkbookBuffer(inspectorAccountCode)
  });

  const sourceBatchResponse = await app.inject({
    method: "POST",
    url: "/routes/source-batches/xlsx?routeDate=2026-03-10",
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": `multipart/form-data; boundary=${xlsxMultipart.boundary}`,
      "content-length": String(xlsxMultipart.body.length)
    },
    payload: xlsxMultipart.body
  });

  assert.equal(sourceBatchResponse.statusCode, 200);
  const sourceBatchBody = sourceBatchResponse.json() as { ok: true; batch: { batchId: string } };

  const gpxMultipart = buildMultipartFilePayload({
    fieldName: "file",
    fileName: "route.gpx",
    contentType: "application/gpx+xml",
    buffer: buildGpxBuffer(),
    fields: {
      sourceBatchId: sourceBatchBody.batch.batchId,
      routeDate: "2026-03-10",
      inspectorAccountCode
    }
  });

  const importResponse = await app.inject({
    method: "POST",
    url: "/routes/import-gpx",
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": `multipart/form-data; boundary=${gpxMultipart.boundary}`,
      "content-length": String(gpxMultipart.body.length)
    },
    payload: gpxMultipart.body
  });

  assert.equal(importResponse.statusCode, 200);
  const importBody = importResponse.json() as {
    ok: true;
    routeId: string;
    totalStops: number;
    matchedStops: number;
    unmatchedStops: number;
    optimizationMode: string;
    alerts: { reviewRequiredCount: number };
  };
  assert.equal(importBody.totalStops, 3);
  assert.equal(importBody.matchedStops, 2);
  assert.equal(importBody.unmatchedStops, 1);
  assert.equal(importBody.optimizationMode, "gpx_import");
  assert.equal(importBody.alerts.reviewRequiredCount, 1);

  const routeResponse = await app.inject({
    method: "GET",
    url: `/routes/${importBody.routeId}`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(routeResponse.statusCode, 200);
  const routeBody = routeResponse.json() as {
    ok: true;
    route: { optimizationMode: string; alerts: { reviewRequiredCount: number } };
    stops: Array<{
      seq: number;
      addressLine1: string | null;
      routeCategory: string;
      candidateId: string | null;
      geocodeSource: string | null;
      geocodeReviewRequired: boolean;
      geocodeReviewReason: string | null;
    }>;
    events: Array<{ eventType: string }>;
  };

  assert.equal(routeBody.route.optimizationMode, "gpx_import");
  assert.equal(routeBody.route.alerts.reviewRequiredCount, 1);
  assert.deepEqual(
    routeBody.stops.map((stop) => [stop.seq, stop.addressLine1, stop.candidateId == null]),
    [
      [1, "200 Side St", false],
      [2, "100 Main St", false],
      [3, "999 Missing Rd", true]
    ]
  );
  assert.equal(routeBody.stops[0]?.routeCategory, "fint");
  assert.equal(routeBody.stops[1]?.routeCategory, "exterior");
  assert.equal(routeBody.stops[2]?.routeCategory, "overdue");
  assert.equal(routeBody.stops[2]?.geocodeSource, "gpx");
  assert.equal(routeBody.stops[2]?.geocodeReviewRequired, true);
  assert.equal(routeBody.stops[2]?.geocodeReviewReason, "GPX stop sem candidate correspondente no snapshot do dia");
  assert.ok(routeBody.events.some((event) => event.eventType === "imported_gpx"));

  const importedEvents = await db
    .select({ eventType: routeEvents.eventType, reason: routeEvents.reason, metadata: routeEvents.metadata })
    .from(routeEvents);
  assert.ok(importedEvents.some((event) => event.eventType === "imported_gpx" && event.reason === "route.gpx"));
});

