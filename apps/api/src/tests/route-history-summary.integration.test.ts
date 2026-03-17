import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import * as XLSX from "xlsx";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { inspectorAccounts, inspectors, users, userRoles } from "../db/schema.js";
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
    headers: { "content-type": "application/json", origin: appWebUrl, host: "localhost:3001" },
    payload: { email, password, name }
  });
  assert.ok(signUpResponse.statusCode >= 200 && signUpResponse.statusCode < 300);
  const cookieHeader = getCookieHeader(signUpResponse.headers["set-cookie"]);
  const sessionResponse = await app.inject({
    method: "GET",
    url: "/api/auth/get-session",
    headers: { cookie: cookieHeader, origin: appWebUrl, host: "localhost:3001" }
  });
  const body = sessionResponse.json() as { user: { id: string } } | null;
  assert.ok(body);
  return { authUserId: body.user.id, email, cookieHeader };
}

function buildTestEnv(): ApiEnv {
  if (!databaseUrl || !betterAuthSecret) throw new Error("env de teste ausente");
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

async function createUserWithRole(app: FastifyInstance, db: Database, label: string, roleCode: "admin" | "assistant") {
  const session = await signUpAndGetSession(app, label);
  const userId = randomUUID();
  await db.insert(users).values({
    id: userId,
    email: session.email,
    fullName: `${roleCode} ${label}`,
    status: "active",
    authUserId: session.authUserId
  });
  await db.insert(userRoles).values({
    id: randomUUID(),
    userId,
    roleCode,
    assignedByUserId: userId,
    isActive: true
  });
  return { ...session, userId };
}

function buildMultipartFilePayload(params: { fieldName: string; fileName: string; contentType: string; buffer: Buffer }) {
  const boundary = `----ata-portal-${randomUUID()}`;
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${params.fieldName}"; filename="${params.fileName}"\r\nContent-Type: ${params.contentType}\r\n\r\n`,
      "utf8"
    ),
    params.buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`, "utf8")
  ]);
  return { body, boundary };
}

function buildWorkbook(inspectorAccountCode: string, orderCode: string) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([
    {
      STATUS: "Assigned",
      WORDER: orderCode,
      INSPECTOR: inspectorAccountCode,
      CLIENT: "CLIENT_X",
      NAME: "Resident One",
      ADDRESS1: "100 Main St",
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

async function createRouteForDate(params: {
  app: FastifyInstance;
  adminCookie: string;
  inspectorAccountCode: string;
  routeDate: string;
  assistantUserId: string;
  orderCode: string;
  routeComplete: boolean;
}) {
  const multipart = buildMultipartFilePayload({
    fieldName: "file",
    fileName: `route-${params.routeDate}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: buildWorkbook(params.inspectorAccountCode, params.orderCode)
  });

  const batchResponse = await params.app.inject({
    method: "POST",
    url: `/routes/source-batches/xlsx?routeDate=${params.routeDate}`,
    headers: {
      cookie: params.adminCookie,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      "content-length": String(multipart.body.length)
    },
    payload: multipart.body
  });
  assert.equal(batchResponse.statusCode, 200);
  const batchBody = batchResponse.json() as { ok: true; batch: { batchId: string } };

  const createRouteResponse = await params.app.inject({
    method: "POST",
    url: "/routes",
    headers: {
      cookie: params.adminCookie,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: {
      sourceBatchId: batchBody.batch.batchId,
      routeDate: params.routeDate,
      inspectorAccountCode: params.inspectorAccountCode,
      assistantUserId: params.assistantUserId
    }
  });
  assert.equal(createRouteResponse.statusCode, 200);
  const createRouteBody = createRouteResponse.json() as { ok: true; routeId: string };

  await params.app.inject({
    method: "POST",
    url: `/routes/${createRouteBody.routeId}/publish`,
    headers: { cookie: params.adminCookie, origin: appWebUrl, host: "localhost:3001" }
  });

  await params.app.inject({
    method: "POST",
    url: `/routes/${createRouteBody.routeId}/day-close`,
    headers: {
      cookie: params.adminCookie,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: {
      reportedOrderCodes: [params.orderCode],
      routeComplete: params.routeComplete,
      notes: params.routeComplete ? "Completa" : "Parcial"
    }
  });
}

integration("routes history summary: admin vê período consolidado e assistant não acessa", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const admin = await createUserWithRole(app, db, "route-history-admin", "admin");
  const assistant = await createUserWithRole(app, db, "route-history-assistant", "assistant");
  const inspectorId = randomUUID();
  await db.insert(inspectors).values({
    id: inspectorId,
    fullName: "Inspector History",
    departureCity: "Hinesville",
    status: "active"
  });
  await db.insert(inspectorAccounts).values({
    id: randomUUID(),
    accountCode: "ATAHIST01",
    accountType: "field",
    currentInspectorId: inspectorId,
    isActive: true
  });

  await createRouteForDate({
    app,
    adminCookie: admin.cookieHeader,
    inspectorAccountCode: "ATAHIST01",
    routeDate: "2026-03-10",
    assistantUserId: assistant.userId,
    orderCode: "ROUTE-HIST-001",
    routeComplete: true
  });

  await createRouteForDate({
    app,
    adminCookie: admin.cookieHeader,
    inspectorAccountCode: "ATAHIST01",
    routeDate: "2026-03-11",
    assistantUserId: assistant.userId,
    orderCode: "ROUTE-HIST-002",
    routeComplete: false
  });

  const summaryResponse = await app.inject({
    method: "GET",
    url: `/routes/history-summary?dateFrom=2026-03-10&dateTo=2026-03-11&assistantUserId=${assistant.userId}`,
    headers: { cookie: admin.cookieHeader, origin: appWebUrl, host: "localhost:3001" }
  });

  assert.equal(summaryResponse.statusCode, 200);
  const summaryBody = summaryResponse.json() as {
    ok: true;
    totals: { routes: number; closedRoutes: number; completeRoutes: number; plannedDoneCount: number };
    summaries: Array<{ routeDate: string; inspectorAccountCode: string; routeComplete: boolean }>;
    byAssistant: Array<{ assistantUserId: string | null; routes: number; completeRoutes: number }>;
    byInspectorAccount: Array<{ inspectorAccountCode: string; routes: number; closedRoutes: number }>;
  };

  assert.equal(summaryBody.totals.routes, 2);
  assert.equal(summaryBody.totals.closedRoutes, 2);
  assert.equal(summaryBody.totals.completeRoutes, 1);
  assert.equal(summaryBody.totals.plannedDoneCount, 2);
  assert.equal(summaryBody.summaries.length, 2);
  assert.equal(summaryBody.summaries[0]?.inspectorAccountCode, "ATAHIST01");
  assert.equal(summaryBody.byAssistant[0]?.assistantUserId, assistant.userId);
  assert.equal(summaryBody.byAssistant[0]?.routes, 2);
  assert.equal(summaryBody.byAssistant[0]?.completeRoutes, 1);
  assert.equal(summaryBody.byInspectorAccount[0]?.inspectorAccountCode, "ATAHIST01");
  assert.equal(summaryBody.byInspectorAccount[0]?.routes, 2);
  assert.equal(summaryBody.byInspectorAccount[0]?.closedRoutes, 2);

  const assistantResponse = await app.inject({
    method: "GET",
    url: "/routes/history-summary?dateFrom=2026-03-10&dateTo=2026-03-11",
    headers: { cookie: assistant.cookieHeader, origin: appWebUrl, host: "localhost:3001" }
  });
  assert.equal(assistantResponse.statusCode, 403);
});

