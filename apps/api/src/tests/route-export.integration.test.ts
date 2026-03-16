import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import * as XLSX from "xlsx";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { buildApp } from "../app.js";
import { inspectorAccounts, inspectors, routeEvents, users, userRoles } from "../db/schema.js";
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
    throw new Error("DATABASE_URL e BETTER_AUTH_SECRET são obrigatórios para os testes de export");
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

  return { ...session, userId };
}

function buildMultipartFilePayload(params: {
  fieldName: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
  fields?: Record<string, string>;
}) {
  const boundary = `----ata-portal-${randomUUID()}`;
  const chunks: Buffer[] = [];

  for (const [fieldName, value] of Object.entries(params.fields ?? {})) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"\r\n\r\n${value}\r\n`,
        "utf8"
      )
    );
  }

  chunks.push(
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${params.fieldName}"; filename="${params.fileName}"\r\n` +
        `Content-Type: ${params.contentType}\r\n\r\n`,
      "utf8"
    )
  );
  chunks.push(params.buffer);
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"));

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
      WORDER: "EXPORT-ORDER-001",
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
      WORDER: "EXPORT-ORDER-002",
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
  </rte>
</gpx>`,
    "utf8"
  );
}

integration("routes export: gera GPX e preview de email com auditoria", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const admin = await createAdminSession(app, db, "route-export");
  const assistantId = randomUUID();
  const inspectorId = randomUUID();
  const inspectorAccountCode = "ATAEXP04";

  await db.insert(users).values({
    id: assistantId,
    email: "assistant-export@test.local",
    fullName: "Assistant Export",
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
    fullName: "Inspector Export",
    email: "inspector-export@test.local",
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
    fileName: "route-export.xlsx",
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

  const gpxMultipart = buildMultipartFilePayload({
    fieldName: "file",
    fileName: "route-export.gpx",
    contentType: "application/gpx+xml",
    buffer: buildGpxBuffer(),
    fields: {
      sourceBatchId: sourceBatchBody.batch.batchId,
      routeDate: "2026-03-10",
      inspectorAccountCode,
      assistantUserId: assistantId
    }
  });

  const createRouteResponse = await app.inject({
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

  assert.equal(createRouteResponse.statusCode, 200);
  const createRouteBody = createRouteResponse.json() as { ok: true; routeId: string };

  const publishResponse = await app.inject({
    method: "POST",
    url: `/routes/${createRouteBody.routeId}/publish`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });
  assert.equal(publishResponse.statusCode, 200);

  const exportGpxResponse = await app.inject({
    method: "POST",
    url: `/routes/${createRouteBody.routeId}/export/gpx`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(exportGpxResponse.statusCode, 200);
  const exportGpxBody = exportGpxResponse.json() as {
    ok: true;
    fileName: string;
    contentType: string;
    content: string;
  };
  assert.equal(exportGpxBody.contentType, "application/gpx+xml");
  assert.match(exportGpxBody.fileName, /^route-ATAEXP04-2026-03-10-v1\.gpx$/);
  assert.match(exportGpxBody.content, /<gpx/);
  assert.match(exportGpxBody.content, /<rte>/);
  assert.match(exportGpxBody.content, /<name>100 Main St<\/name>/);

  const emailPreviewResponse = await app.inject({
    method: "POST",
    url: `/routes/${createRouteBody.routeId}/export/email-preview`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(emailPreviewResponse.statusCode, 200);
  const emailPreviewBody = emailPreviewResponse.json() as {
    ok: true;
    subject: string;
    recipients: {
      inspectorEmail: string | null;
      assistantEmail: string | null;
    };
    textBody: string;
    htmlBody: string;
  };
  assert.match(emailPreviewBody.subject, /ATAEXP04 - 2026-03-10/);
  assert.equal(emailPreviewBody.recipients.inspectorEmail, "inspector-export@test.local");
  assert.equal(emailPreviewBody.recipients.assistantEmail, "assistant-export@test.local");
  assert.match(emailPreviewBody.textBody, /Paradas:/);
  assert.match(emailPreviewBody.textBody, /100 Main St/);
  assert.match(emailPreviewBody.htmlBody, /<ol>/);

  const exportEvents = await db
    .select({
      eventType: routeEvents.eventType,
      reason: routeEvents.reason
    })
    .from(routeEvents)
    .where(eq(routeEvents.routeId, createRouteBody.routeId));

  assert.ok(exportEvents.some((event) => event.eventType === "export_generated" && event.reason === "gpx"));
  assert.ok(exportEvents.some((event) => event.eventType === "export_generated" && event.reason === "email_preview"));
});
