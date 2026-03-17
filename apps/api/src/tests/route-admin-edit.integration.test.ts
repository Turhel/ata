import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import * as XLSX from "xlsx";
import { buildApp } from "../app.js";
import { inspectorAccounts, inspectors, userRoles, users } from "../db/schema.js";
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
    throw new Error("DATABASE_URL e BETTER_AUTH_SECRET são obrigatórios para os testes de edição de rotas");
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

  assert.equal(sessionResponse.statusCode, 200);
  const sessionBody = sessionResponse.json() as { user: { id: string } } | null;
  assert.ok(sessionBody);

  return { email, cookieHeader, authUserId: sessionBody.user.id };
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

  return { ...session, userId };
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

function buildRouteWorkbookBuffer(inspectorAccountCode: string) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([
    {
      STATUS: "Assigned",
      WORDER: "EDIT-ORDER-001",
      INSPECTOR: inspectorAccountCode,
      CLIENT: "CLIENT_EDIT",
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
      WORDER: "EDIT-ORDER-002",
      INSPECTOR: inspectorAccountCode,
      CLIENT: "CLIENT_EDIT",
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
    },
    {
      STATUS: "Assigned",
      WORDER: "EDIT-ORDER-003",
      INSPECTOR: inspectorAccountCode,
      CLIENT: "CLIENT_EDIT",
      NAME: "Resident Three",
      ADDRESS1: "300 Lake St",
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

integration("routes admin: reatribui assistant e resequencia stops manualmente", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const admin = await createAdminSession(app, db, "route-admin-edit");
  const assistantId = randomUUID();
  const inspectorId = randomUUID();
  const inspectorAccountCode = "ATAEDIT01";

  await db.insert(users).values({
    id: assistantId,
    email: "assistant-route-edit@test.local",
    fullName: "Assistant Route Edit",
    status: "active"
  });
  await db.insert(userRoles).values({
    id: randomUUID(),
    userId: assistantId,
    roleCode: "assistant",
    assignedByUserId: admin.userId,
    isActive: true
  });

  await db.insert(inspectors).values({
    id: inspectorId,
    fullName: "Inspector Route Edit",
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

  const multipart = buildMultipartFilePayload({
    fieldName: "file",
    fileName: "route-admin-edit.xlsx",
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
      "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      "content-length": String(multipart.body.length)
    },
    payload: multipart.body
  });

  assert.equal(sourceBatchResponse.statusCode, 200);
  const sourceBatchBody = sourceBatchResponse.json() as { ok: true; batch: { batchId: string } };

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
  const createRouteBody = createRouteResponse.json() as { ok: true; routeId: string };

  const reassignResponse = await app.inject({
    method: "PATCH",
    url: `/routes/${createRouteBody.routeId}/assistant`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: {
      assistantUserId: assistantId,
      reason: "Ajuste operacional"
    }
  });

  assert.equal(reassignResponse.statusCode, 200);
  const reassignBody = reassignResponse.json() as {
    ok: true;
    routeId: string;
    assistantUserId: string | null;
  };
  assert.equal(reassignBody.routeId, createRouteBody.routeId);
  assert.equal(reassignBody.assistantUserId, assistantId);

  const routeBeforeResequenceResponse = await app.inject({
    method: "GET",
    url: `/routes/${createRouteBody.routeId}`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(routeBeforeResequenceResponse.statusCode, 200);
  const routeBeforeResequenceBody = routeBeforeResequenceResponse.json() as {
    ok: true;
    route: { assistantUserId: string | null };
    stops: Array<{ id: string; addressLine1: string | null }>;
    events: Array<{ eventType: string }>;
  };
  assert.equal(routeBeforeResequenceBody.route.assistantUserId, assistantId);
  assert.ok(routeBeforeResequenceBody.events.some((event) => event.eventType === "assistant_reassigned"));

  const reversedStopIds = [...routeBeforeResequenceBody.stops].reverse().map((stop) => stop.id);
  const resequenceResponse = await app.inject({
    method: "POST",
    url: `/routes/${createRouteBody.routeId}/resequence`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: {
      stopIds: reversedStopIds,
      reason: "Reordenado manualmente"
    }
  });

  assert.equal(resequenceResponse.statusCode, 200);
  const resequenceBody = resequenceResponse.json() as {
    ok: true;
    routeId: string;
    totalStops: number;
  };
  assert.equal(resequenceBody.routeId, createRouteBody.routeId);
  assert.equal(resequenceBody.totalStops, 3);

  const routeAfterResequenceResponse = await app.inject({
    method: "GET",
    url: `/routes/${createRouteBody.routeId}`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(routeAfterResequenceResponse.statusCode, 200);
  const routeAfterResequenceBody = routeAfterResequenceResponse.json() as {
    ok: true;
    stops: Array<{ id: string; seq: number; addressLine1: string | null }>;
    events: Array<{ eventType: string; reason: string | null }>;
  };

  assert.deepEqual(
    routeAfterResequenceBody.stops.map((stop) => stop.id),
    reversedStopIds
  );
  assert.deepEqual(
    routeAfterResequenceBody.stops.map((stop) => stop.seq),
    [1, 2, 3]
  );
  assert.ok(routeAfterResequenceBody.events.some((event) => event.eventType === "reordered"));
  assert.ok(routeAfterResequenceBody.events.some((event) => event.reason === "Reordenado manualmente"));
});

