import { eq, ne, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { clients } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type ClientMutationInput = {
  clientCode: string;
  name?: string | null;
  description?: string | null;
  isActive?: boolean;
};

export type ClientMutationResult =
  | {
      ok: true;
      client: {
        id: string;
        clientCode: string;
        name: string | null;
        description: string | null;
        isActive: boolean;
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

export async function createClient(params: {
  databaseUrl: string;
  input: ClientMutationInput;
}): Promise<ClientMutationResult> {
  const { db } = getDb(params.databaseUrl);

  const clientCode = normalizeRequiredCode(params.input.clientCode);
  if (!clientCode) {
    return { ok: false, error: "BAD_REQUEST", message: "clientCode é obrigatório" };
  }

  const name = normalizeOptionalText(params.input.name);
  const description = normalizeOptionalText(params.input.description);
  if (typeof name === "symbol" || typeof description === "symbol") {
    return { ok: false, error: "BAD_REQUEST", message: "name/description inválidos" };
  }

  const existing = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.clientCode, clientCode))
    .limit(1);

  if (existing[0]) {
    return { ok: false, error: "CONFLICT", message: `clientCode já existe (${clientCode})` };
  }

  const rows = await db
    .insert(clients)
    .values({
      id: randomUUID(),
      clientCode,
      name: name ?? null,
      description: description ?? null,
      isActive: params.input.isActive ?? true
    })
    .returning({
      id: clients.id,
      clientCode: clients.clientCode,
      name: clients.name,
      description: clients.description,
      isActive: clients.isActive,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt
    });

  if (!rows[0]) {
    return { ok: false, error: "BAD_REQUEST", message: "Falha ao criar client" };
  }

  return { ok: true, client: rows[0] };
}

export async function updateClient(params: {
  databaseUrl: string;
  clientId: string;
  input: Partial<ClientMutationInput>;
}): Promise<ClientMutationResult> {
  const { db } = getDb(params.databaseUrl);

  const existing = await db
    .select({ id: clients.id, clientCode: clients.clientCode })
    .from(clients)
    .where(eq(clients.id, params.clientId))
    .limit(1);

  if (!existing[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Client não encontrado" };
  }

  const patch: Record<string, unknown> = {};

  if ("clientCode" in params.input) {
    const clientCode = normalizeRequiredCode(params.input.clientCode);
    if (!clientCode) {
      return { ok: false, error: "BAD_REQUEST", message: "clientCode inválido" };
    }

    const duplicate = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.clientCode, clientCode))
      .limit(1);

    if (duplicate[0] && duplicate[0].id !== params.clientId) {
      return { ok: false, error: "CONFLICT", message: `clientCode já existe (${clientCode})` };
    }

    patch.clientCode = clientCode;
  }

  if ("name" in params.input) {
    const name = normalizeOptionalText(params.input.name);
    if (typeof name === "symbol") {
      return { ok: false, error: "BAD_REQUEST", message: "name inválido" };
    }
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

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "BAD_REQUEST", message: "Nenhum campo para atualizar" };
  }

  const rows = await db
    .update(clients)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(clients.id, params.clientId))
    .returning({
      id: clients.id,
      clientCode: clients.clientCode,
      name: clients.name,
      description: clients.description,
      isActive: clients.isActive,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt
    });

  if (!rows[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Client não encontrado" };
  }

  return { ok: true, client: rows[0] };
}

