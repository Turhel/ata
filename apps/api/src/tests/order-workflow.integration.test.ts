import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { buildApp } from "../app.js";
import { clients, orderEvents, orders, userRoles, users, workTypes } from "../db/schema.js";
import type { ApiEnv } from "../env.js";
import { getDb } from "../lib/db.js";

const databaseUrl = process.env.DATABASE_URL;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const betterAuthUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
const appWebUrl = process.env.APP_WEB_URL ?? "http://localhost:5173";

const integration = databaseUrl && betterAuthSecret ? test : test.skip;

function buildTestEnv(): ApiEnv {
  if (!databaseUrl || !betterAuthSecret) {
    throw new Error("DATABASE_URL e BETTER_AUTH_SECRET são obrigatórios para os testes de workflow");
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
  db: ReturnType<typeof getDb>["db"];
  authUserId: string;
  email: string;
  fullName: string;
  roleCode: "master" | "admin" | "assistant" | "inspector";
  status?: "pending" | "active" | "blocked" | "inactive";
}) {
  const userId = randomUUID();

  await params.db.insert(users).values({
    id: userId,
    email: params.email,
    fullName: params.fullName,
    status: params.status ?? "active",
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

async function createCatalogBase(db: ReturnType<typeof getDb>["db"]) {
  const clientId = randomUUID();
  const workTypeId = randomUUID();

  await db.insert(clients).values({
    id: clientId,
    clientCode: `CLIENT-${randomUUID().slice(0, 8)}`,
    name: "Cliente Teste",
    isActive: true
  });

  await db.insert(workTypes).values({
    id: workTypeId,
    code: `WT-${randomUUID().slice(0, 8)}`,
    name: "Work Type Teste",
    isActive: true
  });

  return { clientId, workTypeId };
}

async function createOrder(params: {
  db: ReturnType<typeof getDb>["db"];
  assistantUserId?: string | null;
  status?: "available" | "in_progress" | "submitted" | "follow_up" | "rejected";
  sourceStatus?: "Assigned" | "Received" | "Canceled";
  workTypeId?: string | null;
  clientId?: string | null;
  externalOrderCode?: string;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
}) {
  const orderId = randomUUID();

  await params.db.insert(orders).values({
    id: orderId,
    externalOrderCode: params.externalOrderCode ?? `ORDER-${randomUUID().slice(0, 8)}`,
    sourceStatus: params.sourceStatus ?? "Assigned",
    status: params.status ?? "available",
    clientId: params.clientId ?? null,
    residentName: "Morador Teste",
    addressLine1: params.addressLine1 === undefined ? "Rua Teste, 123" : params.addressLine1,
    city: params.city === undefined ? "Fortaleza" : params.city,
    state: params.state === undefined ? "CE" : params.state,
    workTypeId: params.workTypeId === undefined ? null : params.workTypeId,
    assistantUserId: params.assistantUserId ?? null,
    isRush: false,
    isVacant: false
  });

  return orderId;
}

async function listEventsForOrder(db: ReturnType<typeof getDb>["db"], orderId: string) {
  return db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId));
}

integration("workflow: admin não faz claim; assistant faz claim e submit", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const assistantSession = await signUpAndGetSession(app, "assistant-claim-submit");
  const adminSession = await signUpAndGetSession(app, "admin-claim-submit");

  const assistantUserId = await createOperationalUser({
    db,
    authUserId: assistantSession.authUserId,
    email: assistantSession.email,
    fullName: "Assistant Claim Submit",
    roleCode: "assistant"
  });

  await createOperationalUser({
    db,
    authUserId: adminSession.authUserId,
    email: adminSession.email,
    fullName: "Admin Claim Submit",
    roleCode: "admin"
  });

  const { clientId, workTypeId } = await createCatalogBase(db);
  const orderId = await createOrder({
    db,
    status: "available",
    clientId,
    workTypeId
  });

  const forbiddenClaim = await app.inject({
    method: "POST",
    url: `/orders/${orderId}/claim`,
    headers: {
      cookie: adminSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(forbiddenClaim.statusCode, 403);
  assert.equal((forbiddenClaim.json() as { error: string }).error, "FORBIDDEN");

  const claimResponse = await app.inject({
    method: "POST",
    url: `/orders/${orderId}/claim`,
    headers: {
      cookie: assistantSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(claimResponse.statusCode, 200);
  const claimBody = claimResponse.json() as {
    ok: true;
    order: { status: string; assistantUserId: string | null; claimedAt: string | null };
  };
  assert.equal(claimBody.order.status, "in_progress");
  assert.equal(claimBody.order.assistantUserId, assistantUserId);
  assert.ok(claimBody.order.claimedAt);

  const submitResponse = await app.inject({
    method: "POST",
    url: `/orders/${orderId}/submit`,
    headers: {
      cookie: assistantSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(submitResponse.statusCode, 200);
  const submitBody = submitResponse.json() as {
    ok: true;
    order: { status: string; submittedAt: string | null };
  };
  assert.equal(submitBody.order.status, "submitted");
  assert.ok(submitBody.order.submittedAt);

  const events = await listEventsForOrder(db, orderId);
  assert.ok(events.some((event) => event.eventType === "claimed"));
  assert.ok(events.some((event) => event.eventType === "submitted"));
});

integration("workflow: submit incompleto retorna VALIDATION_ERROR com missingFields", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const assistantSession = await signUpAndGetSession(app, "assistant-submit-incomplete");
  const assistantUserId = await createOperationalUser({
    db,
    authUserId: assistantSession.authUserId,
    email: assistantSession.email,
    fullName: "Assistant Submit Incomplete",
    roleCode: "assistant"
  });

  const orderId = await createOrder({
    db,
    assistantUserId,
    status: "in_progress",
    workTypeId: null,
    addressLine1: "",
    city: "",
    state: ""
  });

  const response = await app.inject({
    method: "POST",
    url: `/orders/${orderId}/submit`,
    headers: {
      cookie: assistantSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(response.statusCode, 422);
  const body = response.json() as {
    ok: false;
    error: string;
    details?: { code?: string; missingFields?: string[] };
  };
  assert.equal(body.error, "VALIDATION_ERROR");
  assert.equal(body.details?.code, "ORDER_INCOMPLETE");
  assert.deepEqual(body.details?.missingFields, ["work_type_id", "address_line_1", "city", "state"]);
});

integration("workflow: admin pede follow-up, submit é bloqueado e assistant faz resubmit", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const assistantSession = await signUpAndGetSession(app, "assistant-follow-up");
  const adminSession = await signUpAndGetSession(app, "admin-follow-up");

  const assistantUserId = await createOperationalUser({
    db,
    authUserId: assistantSession.authUserId,
    email: assistantSession.email,
    fullName: "Assistant Follow Up",
    roleCode: "assistant"
  });

  await createOperationalUser({
    db,
    authUserId: adminSession.authUserId,
    email: adminSession.email,
    fullName: "Admin Follow Up",
    roleCode: "admin"
  });

  const { clientId, workTypeId } = await createCatalogBase(db);
  const orderId = await createOrder({
    db,
    assistantUserId,
    status: "submitted",
    clientId,
    workTypeId
  });

  const followUpResponse = await app.inject({
    method: "POST",
    url: `/orders/${orderId}/follow-up`,
    headers: {
      cookie: adminSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: { reason: "Corrigir dados do endereço" }
  });

  assert.equal(followUpResponse.statusCode, 200);
  assert.equal((followUpResponse.json() as { order: { status: string } }).order.status, "follow_up");

  const blockedSubmitResponse = await app.inject({
    method: "POST",
    url: `/orders/${orderId}/submit`,
    headers: {
      cookie: assistantSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(blockedSubmitResponse.statusCode, 409);
  const blockedSubmitBody = blockedSubmitResponse.json() as { error: string; message: string };
  assert.equal(blockedSubmitBody.error, "INVALID_STATUS");
  assert.match(blockedSubmitBody.message, /resubmit/i);

  const resubmitResponse = await app.inject({
    method: "POST",
    url: `/orders/${orderId}/resubmit`,
    headers: {
      cookie: assistantSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(resubmitResponse.statusCode, 200);
  assert.equal((resubmitResponse.json() as { order: { status: string } }).order.status, "submitted");

  const events = await listEventsForOrder(db, orderId);
  assert.ok(events.some((event) => event.eventType === "follow_up_requested" && event.reason === "Corrigir dados do endereço"));
  assert.ok(events.some((event) => event.eventType === "resubmitted"));
});

integration("workflow: admin rejeita, devolve ao pool e aprova order submetida válida", async (t) => {
  const { app, db } = await createTestApp();
  t.after(async () => {
    await app.close();
  });

  const assistantSession = await signUpAndGetSession(app, "assistant-review");
  const adminSession = await signUpAndGetSession(app, "admin-review");

  const assistantUserId = await createOperationalUser({
    db,
    authUserId: assistantSession.authUserId,
    email: assistantSession.email,
    fullName: "Assistant Review",
    roleCode: "assistant"
  });

  await createOperationalUser({
    db,
    authUserId: adminSession.authUserId,
    email: adminSession.email,
    fullName: "Admin Review",
    roleCode: "admin"
  });

  const { clientId, workTypeId } = await createCatalogBase(db);

  const rejectedOrderId = await createOrder({
    db,
    assistantUserId,
    status: "submitted",
    clientId,
    workTypeId
  });

  const rejectResponse = await app.inject({
    method: "POST",
    url: `/orders/${rejectedOrderId}/reject`,
    headers: {
      cookie: adminSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: { reason: "Documentação insuficiente" }
  });

  assert.equal(rejectResponse.statusCode, 200);
  assert.equal((rejectResponse.json() as { order: { status: string } }).order.status, "rejected");

  const returnResponse = await app.inject({
    method: "POST",
    url: `/orders/${rejectedOrderId}/return-to-pool`,
    headers: {
      cookie: adminSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001",
      "content-type": "application/json"
    },
    payload: { reason: "Liberada para nova execução" }
  });

  assert.equal(returnResponse.statusCode, 200);
  const returnBody = returnResponse.json() as {
    order: { status: string; assistantUserId: string | null; returnedToPoolAt: string | null };
  };
  assert.equal(returnBody.order.status, "available");
  assert.equal(returnBody.order.assistantUserId, null);
  assert.ok(returnBody.order.returnedToPoolAt);

  const approvedOrderId = await createOrder({
    db,
    assistantUserId,
    status: "submitted",
    clientId,
    workTypeId
  });

  const approveResponse = await app.inject({
    method: "POST",
    url: `/orders/${approvedOrderId}/approve`,
    headers: {
      cookie: adminSession.cookieHeader,
      origin: appWebUrl,
      host: "localhost:3001"
    }
  });

  assert.equal(approveResponse.statusCode, 200);
  assert.equal((approveResponse.json() as { order: { status: string } }).order.status, "approved");

  const rejectedEvents = await listEventsForOrder(db, rejectedOrderId);
  assert.ok(rejectedEvents.some((event) => event.eventType === "rejected" && event.reason === "Documentação insuficiente"));
  assert.ok(rejectedEvents.some((event) => event.eventType === "returned_to_pool" && event.reason === "Liberada para nova execução"));

  const approvedEvents = await listEventsForOrder(db, approvedOrderId);
  assert.ok(approvedEvents.some((event) => event.eventType === "approved"));
});
