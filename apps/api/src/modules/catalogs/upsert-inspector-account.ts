import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "../../lib/db.js";
import { inspectorAccountAssignments, inspectorAccounts, inspectors } from "../../db/schema.js";

export type InspectorAccountMutationInput = {
  accountCode: string;
  accountType?: string;
  description?: string | null;
  currentInspectorId?: string | null;
  isActive?: boolean;
};

export type InspectorAccountMutationResult =
  | {
      ok: true;
      inspectorAccount: {
        id: string;
        accountCode: string;
        accountType: string;
        description: string | null;
        currentInspectorId: string | null;
        isActive: boolean;
        createdAt: Date | string;
        updatedAt: Date | string;
      };
    }
  | { ok: false; error: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT"; message: string };

function normalizeRequiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return Symbol("invalid");
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function ensureInspectorExists(databaseUrl: string, inspectorId: string) {
  const { db } = getDb(databaseUrl);
  const rows = await db
    .select({ id: inspectors.id })
    .from(inspectors)
    .where(eq(inspectors.id, inspectorId))
    .limit(1);

  return !!rows[0];
}

async function syncAssignment(params: {
  databaseUrl: string;
  inspectorAccountId: string;
  previousInspectorId: string | null;
  currentInspectorId: string | null;
}) {
  const { db } = getDb(params.databaseUrl);
  const today = todayDate();

  if (params.previousInspectorId && params.previousInspectorId !== params.currentInspectorId) {
    await db
      .update(inspectorAccountAssignments)
      .set({
        isActive: false,
        endDate: today,
        updatedAt: sql`now()`
      })
      .where(
        and(
          eq(inspectorAccountAssignments.inspectorAccountId, params.inspectorAccountId),
          eq(inspectorAccountAssignments.isActive, true)
        )
      );
  }

  if (!params.currentInspectorId || params.currentInspectorId === params.previousInspectorId) {
    return;
  }

  await db.insert(inspectorAccountAssignments).values({
    id: randomUUID(),
    inspectorAccountId: params.inspectorAccountId,
    inspectorId: params.currentInspectorId,
    startDate: today,
    isActive: true
  });
}

export async function createInspectorAccount(params: {
  databaseUrl: string;
  input: InspectorAccountMutationInput;
}): Promise<InspectorAccountMutationResult> {
  const { db } = getDb(params.databaseUrl);

  const accountCode = normalizeRequiredText(params.input.accountCode);
  if (!accountCode) {
    return { ok: false, error: "BAD_REQUEST", message: "accountCode é obrigatório" };
  }

  const accountType = normalizeRequiredText(params.input.accountType ?? "field");
  if (!accountType) {
    return { ok: false, error: "BAD_REQUEST", message: "accountType inválido" };
  }

  const description = normalizeOptionalText(params.input.description);
  if (typeof description === "symbol") {
    return { ok: false, error: "BAD_REQUEST", message: "description inválido" };
  }

  if (params.input.currentInspectorId) {
    const exists = await ensureInspectorExists(params.databaseUrl, params.input.currentInspectorId);
    if (!exists) {
      return { ok: false, error: "BAD_REQUEST", message: "currentInspectorId inválido" };
    }
  }

  const existing = await db
    .select({ id: inspectorAccounts.id })
    .from(inspectorAccounts)
    .where(eq(inspectorAccounts.accountCode, accountCode))
    .limit(1);

  if (existing[0]) {
    return { ok: false, error: "CONFLICT", message: `accountCode já existe (${accountCode})` };
  }

  const rows = await db
    .insert(inspectorAccounts)
    .values({
      id: randomUUID(),
      accountCode,
      accountType,
      description: description ?? null,
      currentInspectorId: params.input.currentInspectorId ?? null,
      isActive: params.input.isActive ?? true
    })
    .returning({
      id: inspectorAccounts.id,
      accountCode: inspectorAccounts.accountCode,
      accountType: inspectorAccounts.accountType,
      description: inspectorAccounts.description,
      currentInspectorId: inspectorAccounts.currentInspectorId,
      isActive: inspectorAccounts.isActive,
      createdAt: inspectorAccounts.createdAt,
      updatedAt: inspectorAccounts.updatedAt
    });

  if (!rows[0]) {
    return { ok: false, error: "BAD_REQUEST", message: "Falha ao criar inspector account" };
  }

  await syncAssignment({
    databaseUrl: params.databaseUrl,
    inspectorAccountId: rows[0].id,
    previousInspectorId: null,
    currentInspectorId: rows[0].currentInspectorId
  });

  return { ok: true, inspectorAccount: rows[0] };
}

export async function updateInspectorAccount(params: {
  databaseUrl: string;
  inspectorAccountId: string;
  input: Partial<InspectorAccountMutationInput>;
}): Promise<InspectorAccountMutationResult> {
  const { db } = getDb(params.databaseUrl);

  const existing = await db
    .select({
      id: inspectorAccounts.id,
      currentInspectorId: inspectorAccounts.currentInspectorId
    })
    .from(inspectorAccounts)
    .where(eq(inspectorAccounts.id, params.inspectorAccountId))
    .limit(1);

  if (!existing[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Inspector account não encontrada" };
  }

  const patch: Record<string, unknown> = {};

  if ("accountCode" in params.input) {
    const accountCode = normalizeRequiredText(params.input.accountCode);
    if (!accountCode) {
      return { ok: false, error: "BAD_REQUEST", message: "accountCode inválido" };
    }

    const duplicate = await db
      .select({ id: inspectorAccounts.id })
      .from(inspectorAccounts)
      .where(eq(inspectorAccounts.accountCode, accountCode))
      .limit(1);

    if (duplicate[0] && duplicate[0].id !== params.inspectorAccountId) {
      return { ok: false, error: "CONFLICT", message: `accountCode já existe (${accountCode})` };
    }

    patch.accountCode = accountCode;
  }

  if ("accountType" in params.input) {
    const accountType = normalizeRequiredText(params.input.accountType);
    if (!accountType) {
      return { ok: false, error: "BAD_REQUEST", message: "accountType inválido" };
    }
    patch.accountType = accountType;
  }

  if ("description" in params.input) {
    const description = normalizeOptionalText(params.input.description);
    if (typeof description === "symbol") {
      return { ok: false, error: "BAD_REQUEST", message: "description inválido" };
    }
    patch.description = description ?? null;
  }

  let nextInspectorId = existing[0].currentInspectorId;
  if ("currentInspectorId" in params.input) {
    nextInspectorId = params.input.currentInspectorId ?? null;
    if (nextInspectorId) {
      const exists = await ensureInspectorExists(params.databaseUrl, nextInspectorId);
      if (!exists) {
        return { ok: false, error: "BAD_REQUEST", message: "currentInspectorId inválido" };
      }
    }
    patch.currentInspectorId = nextInspectorId;
  }

  if ("isActive" in params.input) {
    if (typeof params.input.isActive !== "boolean") {
      return { ok: false, error: "BAD_REQUEST", message: "isActive inválido" };
    }
    patch.isActive = params.input.isActive;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "BAD_REQUEST", message: "Nenhum campo para atualizar" };
  }

  const rows = await db
    .update(inspectorAccounts)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(inspectorAccounts.id, params.inspectorAccountId))
    .returning({
      id: inspectorAccounts.id,
      accountCode: inspectorAccounts.accountCode,
      accountType: inspectorAccounts.accountType,
      description: inspectorAccounts.description,
      currentInspectorId: inspectorAccounts.currentInspectorId,
      isActive: inspectorAccounts.isActive,
      createdAt: inspectorAccounts.createdAt,
      updatedAt: inspectorAccounts.updatedAt
    });

  if (!rows[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Inspector account não encontrada" };
  }

  await syncAssignment({
    databaseUrl: params.databaseUrl,
    inspectorAccountId: params.inspectorAccountId,
    previousInspectorId: existing[0].currentInspectorId,
    currentInspectorId: rows[0].currentInspectorId
  });

  return { ok: true, inspectorAccount: rows[0] };
}

