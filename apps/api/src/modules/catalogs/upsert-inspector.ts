import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { inspectors } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type InspectorMutationInput = {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  status?: string;
  notes?: string | null;
};

export type InspectorMutationResult =
  | {
      ok: true;
      inspector: {
        id: string;
        fullName: string;
        email: string | null;
        phone: string | null;
        status: string;
        notes: string | null;
        createdAt: Date | string;
        updatedAt: Date | string;
      };
    }
  | { ok: false; error: "BAD_REQUEST" | "NOT_FOUND"; message: string };

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

function normalizeStatus(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return Symbol("invalid");
  const trimmed = value.trim();
  return trimmed === "" ? Symbol("invalid") : trimmed;
}

export async function createInspector(params: {
  databaseUrl: string;
  input: InspectorMutationInput;
}): Promise<InspectorMutationResult> {
  const { db } = getDb(params.databaseUrl);

  const fullName = normalizeRequiredText(params.input.fullName);
  if (!fullName) {
    return { ok: false, error: "BAD_REQUEST", message: "fullName é obrigatório" };
  }

  const email = normalizeOptionalText(params.input.email);
  const phone = normalizeOptionalText(params.input.phone);
  const notes = normalizeOptionalText(params.input.notes);
  const status = normalizeStatus(params.input.status);

  if (
    typeof email === "symbol" ||
    typeof phone === "symbol" ||
    typeof notes === "symbol" ||
    typeof status === "symbol"
  ) {
    return { ok: false, error: "BAD_REQUEST", message: "Payload inválido para inspector" };
  }

  const rows = await db
    .insert(inspectors)
    .values({
      id: randomUUID(),
      fullName,
      email: email ?? null,
      phone: phone ?? null,
      status: status ?? "active",
      notes: notes ?? null
    })
    .returning({
      id: inspectors.id,
      fullName: inspectors.fullName,
      email: inspectors.email,
      phone: inspectors.phone,
      status: inspectors.status,
      notes: inspectors.notes,
      createdAt: inspectors.createdAt,
      updatedAt: inspectors.updatedAt
    });

  if (!rows[0]) {
    return { ok: false, error: "BAD_REQUEST", message: "Falha ao criar inspector" };
  }

  return { ok: true, inspector: rows[0] };
}

export async function updateInspector(params: {
  databaseUrl: string;
  inspectorId: string;
  input: Partial<InspectorMutationInput>;
}): Promise<InspectorMutationResult> {
  const { db } = getDb(params.databaseUrl);

  const existing = await db
    .select({ id: inspectors.id })
    .from(inspectors)
    .where(eq(inspectors.id, params.inspectorId))
    .limit(1);

  if (!existing[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Inspector não encontrado" };
  }

  const patch: Record<string, unknown> = {};

  if ("fullName" in params.input) {
    const fullName = normalizeRequiredText(params.input.fullName);
    if (!fullName) return { ok: false, error: "BAD_REQUEST", message: "fullName inválido" };
    patch.fullName = fullName;
  }

  if ("email" in params.input) {
    const email = normalizeOptionalText(params.input.email);
    if (typeof email === "symbol") return { ok: false, error: "BAD_REQUEST", message: "email inválido" };
    patch.email = email ?? null;
  }

  if ("phone" in params.input) {
    const phone = normalizeOptionalText(params.input.phone);
    if (typeof phone === "symbol") return { ok: false, error: "BAD_REQUEST", message: "phone inválido" };
    patch.phone = phone ?? null;
  }

  if ("notes" in params.input) {
    const notes = normalizeOptionalText(params.input.notes);
    if (typeof notes === "symbol") return { ok: false, error: "BAD_REQUEST", message: "notes inválido" };
    patch.notes = notes ?? null;
  }

  if ("status" in params.input) {
    const status = normalizeStatus(params.input.status);
    if (typeof status === "symbol") return { ok: false, error: "BAD_REQUEST", message: "status inválido" };
    patch.status = status;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "BAD_REQUEST", message: "Nenhum campo para atualizar" };
  }

  const rows = await db
    .update(inspectors)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(inspectors.id, params.inspectorId))
    .returning({
      id: inspectors.id,
      fullName: inspectors.fullName,
      email: inspectors.email,
      phone: inspectors.phone,
      status: inspectors.status,
      notes: inspectors.notes,
      createdAt: inspectors.createdAt,
      updatedAt: inspectors.updatedAt
    });

  if (!rows[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Inspector não encontrado" };
  }

  return { ok: true, inspector: rows[0] };
}

