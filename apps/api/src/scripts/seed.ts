import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  clients,
  inspectorAccountAssignments,
  inspectorAccounts,
  inspectors,
  teamAssignments,
  userRoles,
  users,
  workTypes
} from "../db/schema.js";
import { getEnv } from "../env.js";
import { getDb } from "../lib/db.js";

function requireDatabaseUrl() {
  const env = getEnv();
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL n\u00e3o definido");
  }
  return env.databaseUrl;
}

async function upsertUser(params: {
  databaseUrl: string;
  email: string;
  fullName: string;
  status: "pending" | "active" | "blocked" | "inactive";
}) {
  const { db } = getDb(params.databaseUrl);

  const id = randomUUID();
  const rows = await db
    .insert(users)
    .values({
      id,
      email: params.email,
      fullName: params.fullName,
      status: params.status,
      authUserId: null
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        fullName: params.fullName,
        status: params.status,
        updatedAt: sql`now()`
      }
    })
    .returning({ id: users.id, email: users.email });

  if (!rows[0]) {
    throw new Error(`Falha ao criar/atualizar user: ${params.email}`);
  }

  return rows[0];
}

async function ensureRole(params: {
  databaseUrl: string;
  userId: string;
  roleCode: "master" | "admin" | "assistant" | "inspector";
  assignedByUserId: string;
}) {
  const { db } = getDb(params.databaseUrl);

  const existing = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, params.userId),
        eq(userRoles.roleCode, params.roleCode),
        eq(userRoles.isActive, true)
      )
    )
    .limit(1);

  if (existing[0]) return existing[0];

  const rows = await db
    .insert(userRoles)
    .values({
      id: randomUUID(),
      userId: params.userId,
      roleCode: params.roleCode,
      assignedByUserId: params.assignedByUserId,
      isActive: true
    })
    .returning({ id: userRoles.id });

  if (!rows[0]) {
    throw new Error(`Falha ao criar role ${params.roleCode} para user ${params.userId}`);
  }

  return rows[0];
}

async function ensureTeamAssignment(params: {
  databaseUrl: string;
  adminUserId: string;
  assistantUserId: string;
}) {
  const { db } = getDb(params.databaseUrl);

  const existing = await db
    .select({ id: teamAssignments.id })
    .from(teamAssignments)
    .where(and(eq(teamAssignments.assistantUserId, params.assistantUserId), eq(teamAssignments.isActive, true)))
    .limit(1);

  if (existing[0]) return existing[0];

  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .insert(teamAssignments)
    .values({
      id: randomUUID(),
      adminUserId: params.adminUserId,
      assistantUserId: params.assistantUserId,
      isActive: true,
      startDate: today
    })
    .returning({ id: teamAssignments.id });

  if (!rows[0]) {
    throw new Error("Falha ao criar team_assignment");
  }

  return rows[0];
}

async function ensureClient(params: {
  databaseUrl: string;
  clientCode: string;
  name: string;
}) {
  const { db } = getDb(params.databaseUrl);

  const rows = await db
    .insert(clients)
    .values({
      id: randomUUID(),
      clientCode: params.clientCode,
      name: params.name,
      isActive: true
    })
    .onConflictDoUpdate({
      target: clients.clientCode,
      set: {
        name: params.name,
        isActive: true,
        updatedAt: sql`now()`
      }
    })
    .returning({ id: clients.id, clientCode: clients.clientCode });

  if (!rows[0]) {
    throw new Error(`Falha ao criar/atualizar client: ${params.clientCode}`);
  }

  return rows[0];
}

async function ensureWorkType(params: {
  databaseUrl: string;
  code: string;
  name: string;
}) {
  const { db } = getDb(params.databaseUrl);

  const rows = await db
    .insert(workTypes)
    .values({
      id: randomUUID(),
      code: params.code,
      name: params.name,
      isActive: true
    })
    .onConflictDoUpdate({
      target: workTypes.code,
      set: {
        name: params.name,
        isActive: true,
        updatedAt: sql`now()`
      }
    })
    .returning({ id: workTypes.id, code: workTypes.code });

  if (!rows[0]) {
    throw new Error(`Falha ao criar/atualizar work type: ${params.code}`);
  }

  return rows[0];
}

async function ensureInspector(params: {
  databaseUrl: string;
  fullName: string;
  email?: string;
}) {
  const { db } = getDb(params.databaseUrl);

  const existing = await db
    .select({ id: inspectors.id, fullName: inspectors.fullName })
    .from(inspectors)
    .where(eq(inspectors.fullName, params.fullName))
    .limit(1);

  if (existing[0]) return existing[0];

  const rows = await db
    .insert(inspectors)
    .values({
      id: randomUUID(),
      fullName: params.fullName,
      email: params.email ?? null,
      status: "active"
    })
    .returning({ id: inspectors.id, fullName: inspectors.fullName });

  if (!rows[0]) {
    throw new Error(`Falha ao criar/recuperar inspector: ${params.fullName}`);
  }

  return rows[0];
}

async function ensureInspectorAccount(params: {
  databaseUrl: string;
  accountCode: string;
  inspectorId: string;
}) {
  const { db } = getDb(params.databaseUrl);

  const rows = await db
    .insert(inspectorAccounts)
    .values({
      id: randomUUID(),
      accountCode: params.accountCode,
      accountType: "field",
      currentInspectorId: params.inspectorId,
      isActive: true
    })
    .onConflictDoUpdate({
      target: inspectorAccounts.accountCode,
      set: {
        currentInspectorId: params.inspectorId,
        isActive: true,
        updatedAt: sql`now()`
      }
    })
    .returning({ id: inspectorAccounts.id, accountCode: inspectorAccounts.accountCode });

  if (!rows[0]) {
    throw new Error(`Falha ao criar/atualizar inspector account: ${params.accountCode}`);
  }

  return rows[0];
}

async function ensureInspectorAssignment(params: {
  databaseUrl: string;
  inspectorAccountId: string;
  inspectorId: string;
}) {
  const { db } = getDb(params.databaseUrl);

  const existing = await db
    .select({ id: inspectorAccountAssignments.id })
    .from(inspectorAccountAssignments)
    .where(
      and(
        eq(inspectorAccountAssignments.inspectorAccountId, params.inspectorAccountId),
        eq(inspectorAccountAssignments.inspectorId, params.inspectorId),
        eq(inspectorAccountAssignments.isActive, true)
      )
    )
    .limit(1);

  if (existing[0]) return existing[0];

  const rows = await db
    .insert(inspectorAccountAssignments)
    .values({
      id: randomUUID(),
      inspectorAccountId: params.inspectorAccountId,
      inspectorId: params.inspectorId,
      startDate: new Date().toISOString().slice(0, 10),
      isActive: true
    })
    .returning({ id: inspectorAccountAssignments.id });

  if (!rows[0]) {
    throw new Error("Falha ao criar inspector_account_assignment");
  }

  return rows[0];
}

const databaseUrl = requireDatabaseUrl();
const { pool } = getDb(databaseUrl);

try {
  const master = await upsertUser({
    databaseUrl,
    email: "master@dev.local",
    fullName: "Dev Master",
    status: "active"
  });

  const admin = await upsertUser({
    databaseUrl,
    email: "admin@dev.local",
    fullName: "Dev Admin",
    status: "active"
  });

  const assistant = await upsertUser({
    databaseUrl,
    email: "assistant@dev.local",
    fullName: "Dev Assistant",
    status: "active"
  });

  await ensureRole({
    databaseUrl,
    userId: master.id,
    roleCode: "master",
    assignedByUserId: master.id
  });

  await ensureRole({
    databaseUrl,
    userId: admin.id,
    roleCode: "admin",
    assignedByUserId: master.id
  });

  await ensureRole({
    databaseUrl,
    userId: assistant.id,
    roleCode: "assistant",
    assignedByUserId: admin.id
  });

  await ensureTeamAssignment({
    databaseUrl,
    adminUserId: admin.id,
    assistantUserId: assistant.id
  });

  const clientA = await ensureClient({
    databaseUrl,
    clientCode: "CLIENTE_X",
    name: "Cliente X"
  });

  const clientB = await ensureClient({
    databaseUrl,
    clientCode: "BANK_A",
    name: "Bank A"
  });

  const workTypeA = await ensureWorkType({
    databaseUrl,
    code: "TIPO_Y",
    name: "Tipo Y"
  });

  const workTypeB = await ensureWorkType({
    databaseUrl,
    code: "BPO",
    name: "BPO"
  });

  const inspectorA = await ensureInspector({
    databaseUrl,
    fullName: "Inspector One",
    email: "inspector.one@dev.local"
  });

  const inspectorB = await ensureInspector({
    databaseUrl,
    fullName: "Inspector Two",
    email: "inspector.two@dev.local"
  });

  const accountA = await ensureInspectorAccount({
    databaseUrl,
    accountCode: "ATAVEND07",
    inspectorId: inspectorA.id
  });

  const accountB = await ensureInspectorAccount({
    databaseUrl,
    accountCode: "ATAVEND04",
    inspectorId: inspectorB.id
  });

  await ensureInspectorAssignment({
    databaseUrl,
    inspectorAccountId: accountA.id,
    inspectorId: inspectorA.id
  });

  await ensureInspectorAssignment({
    databaseUrl,
    inspectorAccountId: accountB.id,
    inspectorId: inspectorB.id
  });

  console.log("Seed operacional conclu\u00eddo:");
  console.log(`- master: ${master.email} (${master.id})`);
  console.log(`- admin: ${admin.email} (${admin.id})`);
  console.log(`- assistant: ${assistant.email} (${assistant.id})`);
  console.log("- roles: master/admin/assistant (ativas)");
  console.log("- team_assignment: admin -> assistant (ativo)");
  console.log(`- clients: ${clientA.clientCode}, ${clientB.clientCode}`);
  console.log(`- work_types: ${workTypeA.code}, ${workTypeB.code}`);
  console.log(`- inspectors: ${inspectorA.fullName}, ${inspectorB.fullName}`);
  console.log(`- inspector_accounts: ${accountA.accountCode}, ${accountB.accountCode}`);
  console.log("\nObserva\u00e7\u00e3o: users.auth_user_id permanece NULL (n\u00e3o tocamos em auth.*).");
} finally {
  await pool.end();
}
