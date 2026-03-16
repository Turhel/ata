import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { buildApp } from "../app.js";
import {
  clients,
  inspectorAccounts,
  orderEvents,
  orders,
  poolImportItems,
  userRoles,
  users,
  workTypes
} from "../db/schema.js";
import type { ApiEnv } from "../env.js";
import { getDb } from "../lib/db.js";
import { parsePoolXlsxBuffer } from "../modules/orders/parse-pool-xlsx.js";

const databaseUrl = process.env.DATABASE_URL;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
const appWebUrl = process.env.APP_WEB_URL ?? "http://localhost:5173";

const integration = databaseUrl && betterAuthSecret ? test : test.skip;
const realPoolXlsxPath = fileURLToPath(
  new URL("../../../../docs/arquivos/InspectionsFull.xlsx", import.meta.url)
);

type Database = ReturnType<typeof getDb>["db"];

function buildTestEnv(): ApiEnv {
  if (!databaseUrl || !betterAuthSecret) {
    throw new Error("DATABASE_URL e BETTER_AUTH_SECRET são obrigatórios para os testes de importação");
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
  const body = sessionResponse.json() as { user: { id: string; email: string; name: string } } | null;
  assert.ok(body, "get-session deveria retornar sessão válida");

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
  roleCode: "master" | "admin" | "assistant" | "inspector";
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

async function seedCatalogs(db: Database, params: {
  clientCodes?: string[];
  workTypeCodes?: string[];
  inspectorAccountCodes?: string[];
}) {
  for (const clientCode of params.clientCodes ?? []) {
    await db
      .insert(clients)
      .values({
        id: randomUUID(),
        clientCode,
        name: clientCode,
        isActive: true
      })
      .onConflictDoNothing();
  }

  for (const code of params.workTypeCodes ?? []) {
    await db
      .insert(workTypes)
      .values({
        id: randomUUID(),
        code,
        name: code,
        isActive: true
      })
      .onConflictDoNothing();
  }

  for (const accountCode of params.inspectorAccountCodes ?? []) {
    await db
      .insert(inspectorAccounts)
      .values({
        id: randomUUID(),
        accountCode,
        accountType: "field",
        description: accountCode,
        isActive: true
      })
      .onConflictDoNothing();
  }
}

async function createAdminSession(app: FastifyInstance, db: Database, label: string) {
  const adminSession = await signUpAndGetSession(app, label);
  const operationalUserId = await createOperationalUser({
    db,
    authUserId: adminSession.authUserId,
    email: adminSession.email,
    fullName: `Admin ${label}`,
    roleCode: "admin"
  });

  return { ...adminSession, operationalUserId };
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

integration("pool import: cria batch parcial, lista falhas e reprocessa item corrigido", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const admin = await createAdminSession(app, db, "pool-json-reprocess");

  await seedCatalogs(db, {
    clientCodes: ["CLIENT_OK"],
    workTypeCodes: ["WORK_OK"],
    inspectorAccountCodes: ["ATAVEND01"]
  });

  const importResponse = await app.inject({
    method: "POST",
    url: "/pool-import",
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: {
      fileName: "pool-normalized.json",
      items: [
        {
          lineNumber: 1,
          externalOrderCode: "POOL-OK-001",
          sourceStatus: "Assigned",
          residentName: "Cliente Válido",
          addressLine1: "Rua 1",
          addressLine2: null,
          city: "Fortaleza",
          state: "CE",
          zipCode: "60000-000",
          availableDate: "2026-03-16",
          deadlineDate: "2026-03-18",
          isRush: false,
          isVacant: false,
          sourceInspectorAccountCode: "ATAVEND01",
          sourceClientCode: "CLIENT_OK",
          sourceWorkTypeCode: "WORK_OK",
          rawPayload: {
            residentName: "Cliente Válido",
            addressLine1: "Rua 1",
            city: "Fortaleza",
            state: "CE",
            zipCode: "60000-000",
            availableDate: "2026-03-16",
            deadlineDate: "2026-03-18",
            isRush: false,
            isVacant: false
          }
        },
        {
          lineNumber: 2,
          externalOrderCode: "POOL-FAIL-001",
          sourceStatus: "Assigned",
          residentName: "Cliente Pendente",
          addressLine1: "Rua 2",
          addressLine2: null,
          city: "Caucaia",
          state: "CE",
          zipCode: "61600-000",
          availableDate: "2026-03-16",
          deadlineDate: "2026-03-19",
          isRush: true,
          isVacant: false,
          sourceInspectorAccountCode: "ATAVEND99",
          sourceClientCode: "CLIENT_MISSING",
          sourceWorkTypeCode: "WORK_MISSING",
          rawPayload: {
            residentName: "Cliente Pendente",
            addressLine1: "Rua 2",
            city: "Caucaia",
            state: "CE",
            zipCode: "61600-000",
            availableDate: "2026-03-16",
            deadlineDate: "2026-03-19",
            isRush: true,
            isVacant: false
          }
        }
      ]
    }
  });

  assert.equal(importResponse.statusCode, 200);
  const importBody = importResponse.json() as {
    ok: true;
    batch: {
      id: string;
      status: string;
      counters: {
        totalRows: number;
        insertedRows: number;
        updatedRows: number;
        ignoredRows: number;
        errorRows: number;
      };
    };
  };

  assert.equal(importBody.batch.status, "partially_completed");
  assert.deepEqual(importBody.batch.counters, {
    totalRows: 2,
    insertedRows: 1,
    updatedRows: 0,
    ignoredRows: 0,
    errorRows: 1
  });

  const batchResponse = await app.inject({
    method: "GET",
    url: `/pool-import/batches/${importBody.batch.id}`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(batchResponse.statusCode, 200);
  const batchBody = batchResponse.json() as {
    ok: true;
    batch: { id: string; status: string };
    items: Array<{ externalOrderCode: string; importAction: string }>;
  };
  assert.equal(batchBody.batch.id, importBody.batch.id);
  assert.equal(batchBody.items.length, 2);
  assert.deepEqual(
    batchBody.items.map((item) => [item.externalOrderCode, item.importAction]),
    [
      ["POOL-OK-001", "created"],
      ["POOL-FAIL-001", "failed"]
    ]
  );

  const failuresResponse = await app.inject({
    method: "GET",
    url: `/pool-import/batches/${importBody.batch.id}/failures`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(failuresResponse.statusCode, 200);
  const failuresBody = failuresResponse.json() as {
    ok: true;
    failures: Array<{
      id: string;
      failureCategory: string;
      unresolvedReferences: string[];
    }>;
  };
  assert.equal(failuresBody.failures.length, 1);
  assert.equal(failuresBody.failures[0]?.failureCategory, "catalog_resolution");
  assert.deepEqual(failuresBody.failures[0]?.unresolvedReferences, [
    "client:CLIENT_MISSING",
    "work_type:WORK_MISSING",
    "inspector_account:ATAVEND99"
  ]);

  await seedCatalogs(db, {
    clientCodes: ["CLIENT_MISSING"],
    workTypeCodes: ["WORK_MISSING"],
    inspectorAccountCodes: ["ATAVEND99"]
  });

  const reprocessResponse = await app.inject({
    method: "POST",
    url: `/pool-import/items/${failuresBody.failures[0]?.id}/reprocess`,
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(reprocessResponse.statusCode, 200);
  const reprocessBody = reprocessResponse.json() as {
    ok: true;
    batch: { status: string; insertedRows: number; updatedRows: number; errorRows: number };
    item: { importAction: string; errorMessage: string | null };
  };
  assert.equal(reprocessBody.batch.status, "completed");
  assert.equal(reprocessBody.batch.insertedRows, 2);
  assert.equal(reprocessBody.batch.updatedRows, 0);
  assert.equal(reprocessBody.batch.errorRows, 0);
  assert.equal(reprocessBody.item.importAction, "created");
  assert.equal(reprocessBody.item.errorMessage, null);

  const importedOrders = await db
    .select({ externalOrderCode: orders.externalOrderCode })
    .from(orders)
    .where(
      and(
        eq(orders.externalOrderCode, "POOL-OK-001")
      )
    );

  const reprocessedItem = await db
    .select({
      externalOrderCode: poolImportItems.externalOrderCode,
      importAction: poolImportItems.importAction
    })
    .from(poolImportItems)
    .where(eq(poolImportItems.id, failuresBody.failures[0]!.id))
    .limit(1);

  assert.equal(importedOrders.length, 1);
  assert.equal(reprocessedItem[0]?.importAction, "created");
});

integration("pool import: source_status Canceled cancela order aberta e evita evento duplicado em reimportação idêntica", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const admin = await createAdminSession(app, db, "pool-canceled");

  await seedCatalogs(db, {
    clientCodes: ["CLIENT_CANCEL"],
    workTypeCodes: ["WORK_CANCEL"],
    inspectorAccountCodes: ["ATAVEND02"]
  });

  const baseItem = {
    lineNumber: 1,
    externalOrderCode: "POOL-CANCEL-001",
    residentName: "Order Cancelada",
    addressLine1: "Rua Cancelada",
    addressLine2: null,
    city: "Fortaleza",
    state: "CE",
    zipCode: "60000-000",
    availableDate: "2026-03-16",
    deadlineDate: "2026-03-20",
    isRush: false,
    isVacant: false,
    sourceInspectorAccountCode: "ATAVEND02",
    sourceClientCode: "CLIENT_CANCEL",
    sourceWorkTypeCode: "WORK_CANCEL",
    rawPayload: {
      residentName: "Order Cancelada",
      addressLine1: "Rua Cancelada",
      city: "Fortaleza",
      state: "CE",
      availableDate: "2026-03-16",
      deadlineDate: "2026-03-20"
    }
  };

  const firstImportResponse = await app.inject({
    method: "POST",
    url: "/pool-import",
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: {
      fileName: "pool-cancel-1.json",
      items: [{ ...baseItem, sourceStatus: "Assigned" }]
    }
  });

  assert.equal(firstImportResponse.statusCode, 200);

  const secondImportResponse = await app.inject({
    method: "POST",
    url: "/pool-import",
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: {
      fileName: "pool-cancel-2.json",
      items: [{ ...baseItem, sourceStatus: "Canceled" }]
    }
  });

  assert.equal(secondImportResponse.statusCode, 200);

  const importedOrderRows = await db
    .select({
      id: orders.id,
      sourceStatus: orders.sourceStatus,
      status: orders.status,
      cancelledAt: orders.cancelledAt
    })
    .from(orders)
    .where(eq(orders.externalOrderCode, "POOL-CANCEL-001"))
    .limit(1);

  const importedOrder = importedOrderRows[0];
  assert.ok(importedOrder);
  assert.equal(importedOrder.sourceStatus, "Canceled");
  assert.equal(importedOrder.status, "cancelled");
  assert.ok(importedOrder.cancelledAt);

  const cancellationEventsAfterFirstCancellation = await db
    .select({ id: orderEvents.id, eventType: orderEvents.eventType })
    .from(orderEvents)
    .where(and(eq(orderEvents.orderId, importedOrder.id), eq(orderEvents.eventType, "cancelled_from_source")));

  assert.equal(cancellationEventsAfterFirstCancellation.length, 1);

  const thirdImportResponse = await app.inject({
    method: "POST",
    url: "/pool-import",
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: {
      fileName: "pool-cancel-3.json",
      items: [{ ...baseItem, sourceStatus: "Canceled" }]
    }
  });

  assert.equal(thirdImportResponse.statusCode, 200);

  const cancellationEventsAfterReimport = await db
    .select({ id: orderEvents.id, eventType: orderEvents.eventType })
    .from(orderEvents)
    .where(and(eq(orderEvents.orderId, importedOrder.id), eq(orderEvents.eventType, "cancelled_from_source")));

  assert.equal(cancellationEventsAfterReimport.length, 1);
});

integration("pool import: aceita upload do XLSX real de teste", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const admin = await createAdminSession(app, db, "pool-xlsx-real");
  const buffer = await readFile(realPoolXlsxPath);
  const parsedPayload = parsePoolXlsxBuffer({
    buffer,
    fileName: "InspectionsFull.xlsx"
  });

  await seedCatalogs(db, {
    clientCodes: [...new Set(parsedPayload.items.map((item) => item.sourceClientCode).filter(Boolean))] as string[],
    workTypeCodes: [...new Set(parsedPayload.items.map((item) => item.sourceWorkTypeCode).filter(Boolean))] as string[],
    inspectorAccountCodes: [...new Set(parsedPayload.items.map((item) => item.sourceInspectorAccountCode).filter(Boolean))] as string[]
  });

  const multipart = buildMultipartFilePayload({
    fieldName: "file",
    fileName: "InspectionsFull.xlsx",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer
  });

  const response = await app.inject({
    method: "POST",
    url: "/pool-import/xlsx",
    headers: {
      cookie: admin.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": `multipart/form-data; boundary=${multipart.boundary}`,
      "content-length": String(multipart.body.length)
    },
    payload: multipart.body
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    ok: true;
    batch: {
      status: string;
      counters: {
        totalRows: number;
        insertedRows: number;
        updatedRows: number;
        ignoredRows: number;
        errorRows: number;
      };
    };
  };

  assert.equal(body.batch.status, "completed");
  assert.equal(body.batch.counters.totalRows, parsedPayload.items.length);
  assert.equal(body.batch.counters.insertedRows, parsedPayload.items.length);
  assert.equal(body.batch.counters.updatedRows, 0);
  assert.equal(body.batch.counters.ignoredRows, 0);
  assert.equal(body.batch.counters.errorRows, 0);
});
