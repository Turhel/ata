import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { inspectorAccounts, inspectors, routeStops, users, userRoles } from "../db/schema.js";
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
  return { app, db };
}

async function createUserWithRole(
  app: FastifyInstance,
  db: Database,
  label: string,
  roleCode: "admin" | "assistant" | "inspector",
  extra?: { inspectorId?: string }
) {
  const session = await signUpAndGetSession(app, label);
  const userId = randomUUID();
  await db.insert(users).values({
    id: userId,
    email: session.email,
    fullName: `${roleCode} ${label}`,
    status: "active",
    authUserId: session.authUserId,
    inspectorId: extra?.inspectorId ?? null
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

function buildWorkbook(inspectorAccountCode: string) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([
    {
      STATUS: "Assigned",
      WORDER: "ROUTE-CLOSE-001",
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
    },
    {
      STATUS: "Assigned",
      WORDER: "ROUTE-CLOSE-002",
      INSPECTOR: inspectorAccountCode,
      CLIENT: "CLIENT_X",
      NAME: "Resident Two",
      ADDRESS1: "200 Main St",
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

integration("routes day close: assistant fecha o dia e inspector/admin consultam o resumo", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const admin = await createUserWithRole(app, db, "route-close-admin", "admin");
  const inspectorId = randomUUID();
  await db.insert(inspectors).values({
    id: inspectorId,
    fullName: "Inspector Close",
    departureCity: "Hinesville",
    status: "active"
  });
  const assistant = await createUserWithRole(app, db, "route-close-assistant", "assistant");
  const inspectorUser = await createUserWithRole(app, db, "route-close-inspector", "inspector", { inspectorId });

  await db.insert(inspectorAccounts).values({
    id: randomUUID(),
    accountCode: "ATACLOSE04",
    accountType: "field",
    currentInspectorId: inspectorId,
    isActive: true
  });

  const multipart = buildMultipartFilePayload({
    fieldName: "file",
    fileName: "route-close.xlsx",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: buildWorkbook("ATACLOSE04")
  });
  const batchResponse = await app.inject({
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
  assert.equal(batchResponse.statusCode, 200);
  const batchBody = batchResponse.json() as { ok: true; batch: { batchId: string } };

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
      sourceBatchId: batchBody.batch.batchId,
      routeDate: "2026-03-10",
      inspectorAccountCode: "ATACLOSE04",
      assistantUserId: assistant.userId
    }
  });
  assert.equal(createRouteResponse.statusCode, 200);
  const createRouteBody = createRouteResponse.json() as { ok: true; routeId: string };

  const publishResponse = await app.inject({
    method: "POST",
    url: `/routes/${createRouteBody.routeId}/publish`,
    headers: { cookie: admin.cookieHeader, origin: appWebUrl, host: "localhost:3001" }
  });
  assert.equal(publishResponse.statusCode, 200);

  const dayCloseResponse = await app.inject({
    method: "POST",
    url: `/routes/${createRouteBody.routeId}/day-close`,
    headers: {
      cookie: assistant.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: {
      reportedOrderCodes: ["ROUTE-CLOSE-001", "ROUTE-EXTRA-999"],
      routeComplete: false,
      stoppedAtSeq: 1,
      skippedStops: [{ seq: 2, reason: "Ponto ficou para trás no fim do dia" }],
      notes: "Relatório do assistant"
    }
  });
  assert.equal(dayCloseResponse.statusCode, 200);
  const dayCloseBody = dayCloseResponse.json() as {
    ok: true;
    report: {
      routeComplete: boolean;
      plannedDone: Array<{ externalOrderCode: string | null }>;
      plannedNotDone: Array<{ seq: number; reason?: string | null }>;
      doneNotPlanned: string[];
      stoppedAtSeq: number | null;
    };
  };
  assert.equal(dayCloseBody.report.routeComplete, false);
  assert.deepEqual(dayCloseBody.report.plannedDone.map((item) => item.externalOrderCode), ["ROUTE-CLOSE-001"]);
  assert.equal(dayCloseBody.report.plannedNotDone.length, 1);
  assert.equal(dayCloseBody.report.plannedNotDone[0]?.seq, 2);
  assert.equal(dayCloseBody.report.plannedNotDone[0]?.reason, "Ponto ficou para trás no fim do dia");
  assert.deepEqual(dayCloseBody.report.doneNotPlanned, ["ROUTE-EXTRA-999"]);
  assert.equal(dayCloseBody.report.stoppedAtSeq, 1);

  const stopRows = await db
    .select({ seq: routeStops.seq, stopStatus: routeStops.stopStatus })
    .from(routeStops)
    .where(eq(routeStops.routeId, createRouteBody.routeId))
    .orderBy(routeStops.seq);
  assert.deepEqual(
    stopRows.map((row) => ({ seq: row.seq, stopStatus: row.stopStatus })),
    [
      { seq: 1, stopStatus: "done" },
      { seq: 2, stopStatus: "skipped" }
    ]
  );

  const inspectorReadResponse = await app.inject({
    method: "GET",
    url: `/routes/${createRouteBody.routeId}/day-close`,
    headers: { cookie: inspectorUser.cookieHeader, origin: appWebUrl, host: "localhost:3001" }
  });
  assert.equal(inspectorReadResponse.statusCode, 200);
  const inspectorReadBody = inspectorReadResponse.json() as {
    ok: true;
    report: { doneNotPlanned: string[] } | null;
  };
  assert.ok(inspectorReadBody.report);
  assert.deepEqual(inspectorReadBody.report.doneNotPlanned, ["ROUTE-EXTRA-999"]);

  const adminReadResponse = await app.inject({
    method: "GET",
    url: `/routes/${createRouteBody.routeId}/day-close`,
    headers: { cookie: admin.cookieHeader, origin: appWebUrl, host: "localhost:3001" }
  });
  assert.equal(adminReadResponse.statusCode, 200);

  const outsider = await createUserWithRole(app, db, "route-close-outsider", "assistant");
  const outsiderResponse = await app.inject({
    method: "GET",
    url: `/routes/${createRouteBody.routeId}/day-close`,
    headers: { cookie: outsider.cookieHeader, origin: appWebUrl, host: "localhost:3001" }
  });
  assert.equal(outsiderResponse.statusCode, 403);
});
