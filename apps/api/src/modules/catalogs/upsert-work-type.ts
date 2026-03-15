import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "../../lib/db.js";
import { workTypes } from "../../db/schema.js";

export type WorkTypeMutationInput = {
  code: string;
  name?: string | null;
  description?: string | null;
  isActive?: boolean;
  defaultPaymentAmountAssistant?: string | number | null;
  defaultPaymentAmountInspector?: string | number | null;
};

export type WorkTypeMutationResult =
  | {
      ok: true;
      workType: {
        id: string;
        code: string;
        name: string | null;
        description: string | null;
        isActive: boolean;
        defaultPaymentAmountAssistant: string | null;
        defaultPaymentAmountInspector: string | null;
        createdAt: Date | string;
        updatedAt: Date | string;
      };
    }
  | { ok: false; error: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT"; message: string };

function normalizeRequiredCode(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return Symbol("invalid");
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeAmount(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toFixed(2) : Symbol("invalid");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) return Symbol("invalid");
    return Number(trimmed).toFixed(2);
  }
  return Symbol("invalid");
}

export async function createWorkType(params: {
  databaseUrl: string;
  input: WorkTypeMutationInput;
}): Promise<WorkTypeMutationResult> {
  const { db } = getDb(params.databaseUrl);

  const code = normalizeRequiredCode(params.input.code);
  if (!code) {
    return { ok: false, error: "BAD_REQUEST", message: "code é obrigatório" };
  }

  const name = normalizeOptionalText(params.input.name);
  const description = normalizeOptionalText(params.input.description);
  const defaultPaymentAmountAssistant = normalizeAmount(params.input.defaultPaymentAmountAssistant);
  const defaultPaymentAmountInspector = normalizeAmount(params.input.defaultPaymentAmountInspector);

  if (
    typeof name === "symbol" ||
    typeof description === "symbol" ||
    typeof defaultPaymentAmountAssistant === "symbol" ||
    typeof defaultPaymentAmountInspector === "symbol"
  ) {
    return { ok: false, error: "BAD_REQUEST", message: "Payload inválido para work type" };
  }

  const existing = await db
    .select({ id: workTypes.id })
    .from(workTypes)
    .where(eq(workTypes.code, code))
    .limit(1);

  if (existing[0]) {
    return { ok: false, error: "CONFLICT", message: `code já existe (${code})` };
  }

  const rows = await db
    .insert(workTypes)
    .values({
      id: randomUUID(),
      code,
      name: name ?? null,
      description: description ?? null,
      isActive: params.input.isActive ?? true,
      defaultPaymentAmountAssistant: defaultPaymentAmountAssistant ?? null,
      defaultPaymentAmountInspector: defaultPaymentAmountInspector ?? null
    })
    .returning({
      id: workTypes.id,
      code: workTypes.code,
      name: workTypes.name,
      description: workTypes.description,
      isActive: workTypes.isActive,
      defaultPaymentAmountAssistant: workTypes.defaultPaymentAmountAssistant,
      defaultPaymentAmountInspector: workTypes.defaultPaymentAmountInspector,
      createdAt: workTypes.createdAt,
      updatedAt: workTypes.updatedAt
    });

  if (!rows[0]) {
    return { ok: false, error: "BAD_REQUEST", message: "Falha ao criar work type" };
  }

  return { ok: true, workType: rows[0] };
}

export async function updateWorkType(params: {
  databaseUrl: string;
  workTypeId: string;
  input: Partial<WorkTypeMutationInput>;
}): Promise<WorkTypeMutationResult> {
  const { db } = getDb(params.databaseUrl);

  const existing = await db
    .select({ id: workTypes.id })
    .from(workTypes)
    .where(eq(workTypes.id, params.workTypeId))
    .limit(1);

  if (!existing[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Work type não encontrado" };
  }

  const patch: Record<string, unknown> = {};

  if ("code" in params.input) {
    const code = normalizeRequiredCode(params.input.code);
    if (!code) {
      return { ok: false, error: "BAD_REQUEST", message: "code inválido" };
    }

    const duplicate = await db
      .select({ id: workTypes.id })
      .from(workTypes)
      .where(eq(workTypes.code, code))
      .limit(1);

    if (duplicate[0] && duplicate[0].id !== params.workTypeId) {
      return { ok: false, error: "CONFLICT", message: `code já existe (${code})` };
    }

    patch.code = code;
  }

  if ("name" in params.input) {
    const name = normalizeOptionalText(params.input.name);
    if (typeof name === "symbol") return { ok: false, error: "BAD_REQUEST", message: "name inválido" };
    patch.name = name ?? null;
  }

  if ("description" in params.input) {
    const description = normalizeOptionalText(params.input.description);
    if (typeof description === "symbol") {
      return { ok: false, error: "BAD_REQUEST", message: "description inválido" };
    }
    patch.description = description ?? null;
  }

  if ("isActive" in params.input) {
    if (typeof params.input.isActive !== "boolean") {
      return { ok: false, error: "BAD_REQUEST", message: "isActive inválido" };
    }
    patch.isActive = params.input.isActive;
  }

  if ("defaultPaymentAmountAssistant" in params.input) {
    const amount = normalizeAmount(params.input.defaultPaymentAmountAssistant);
    if (typeof amount === "symbol") {
      return { ok: false, error: "BAD_REQUEST", message: "defaultPaymentAmountAssistant inválido" };
    }
    patch.defaultPaymentAmountAssistant = amount ?? null;
  }

  if ("defaultPaymentAmountInspector" in params.input) {
    const amount = normalizeAmount(params.input.defaultPaymentAmountInspector);
    if (typeof amount === "symbol") {
      return { ok: false, error: "BAD_REQUEST", message: "defaultPaymentAmountInspector inválido" };
    }
    patch.defaultPaymentAmountInspector = amount ?? null;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "BAD_REQUEST", message: "Nenhum campo para atualizar" };
  }

  const rows = await db
    .update(workTypes)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(workTypes.id, params.workTypeId))
    .returning({
      id: workTypes.id,
      code: workTypes.code,
      name: workTypes.name,
      description: workTypes.description,
      isActive: workTypes.isActive,
      defaultPaymentAmountAssistant: workTypes.defaultPaymentAmountAssistant,
      defaultPaymentAmountInspector: workTypes.defaultPaymentAmountInspector,
      createdAt: workTypes.createdAt,
      updatedAt: workTypes.updatedAt
    });

  if (!rows[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Work type não encontrado" };
  }

  return { ok: true, workType: rows[0] };
}

