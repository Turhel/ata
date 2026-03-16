import { eq, sql } from "drizzle-orm";
import { inspectors, users } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";
import { getOwnInspectorProfile } from "./get-own-inspector-profile.js";

export type OwnInspectorProfilePatchInput = {
  email?: string | null;
  phone?: string | null;
  departureCity?: string | null;
};

export type UpdateOwnInspectorProfileResult =
  | { ok: true; profile: Awaited<ReturnType<typeof getOwnInspectorProfile>> extends infer T ? Exclude<T, null> : never }
  | { ok: false; error: "NOT_FOUND" | "BAD_REQUEST"; message: string };

function normalizeOptionalText(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return Symbol("invalid");
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function updateOwnInspectorProfile(params: {
  databaseUrl: string;
  operationalUserId: string;
  input: OwnInspectorProfilePatchInput;
}): Promise<UpdateOwnInspectorProfileResult> {
  const { db } = getDb(params.databaseUrl);

  const operationalUserRows = await db
    .select({ inspectorId: users.inspectorId })
    .from(users)
    .where(eq(users.id, params.operationalUserId))
    .limit(1);

  const operationalUser = operationalUserRows[0] ?? null;
  if (!operationalUser?.inspectorId) {
    return { ok: false, error: "NOT_FOUND", message: "Inspector vinculado não encontrado" };
  }

  const patch: Record<string, unknown> = {};

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

  if ("departureCity" in params.input) {
    const departureCity = normalizeOptionalText(params.input.departureCity);
    if (typeof departureCity === "symbol") return { ok: false, error: "BAD_REQUEST", message: "departureCity inválido" };
    patch.departureCity = departureCity ?? null;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "BAD_REQUEST", message: "Nenhum campo permitido para atualizar" };
  }

  const updatedRows = await db
    .update(inspectors)
    .set({
      ...patch,
      updatedAt: sql`now()`
    })
    .where(eq(inspectors.id, operationalUser.inspectorId))
    .returning({ id: inspectors.id });

  if (!updatedRows[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Inspector vinculado não encontrado" };
  }

  const profile = await getOwnInspectorProfile({
    databaseUrl: params.databaseUrl,
    operationalUserId: params.operationalUserId
  });

  if (!profile) {
    return { ok: false, error: "NOT_FOUND", message: "Inspector vinculado não encontrado" };
  }

  return { ok: true, profile };
}
