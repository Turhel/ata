import { and, eq, sql } from "drizzle-orm";
import { userRoles, users } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

type UserStatus = "pending" | "active" | "blocked" | "inactive";

export type MutateStatusResult =
  | { ok: true; user: { id: string; email: string; fullName: string; status: UserStatus; authUserId: string | null } }
  | { ok: false; error: "NOT_FOUND" | "INVALID_STATE"; message: string };

export async function approvePendingUser(params: {
  databaseUrl: string;
  targetUserId: string;
  approvedByUserId: string;
}): Promise<MutateStatusResult> {
  const { db } = getDb(params.databaseUrl);

  const target = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(eq(users.id, params.targetUserId))
    .limit(1);

  if (!target[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Usu\u00e1rio n\u00e3o encontrado" };
  }

  if (target[0].status !== "pending") {
    return { ok: false, error: "INVALID_STATE", message: "Somente usu\u00e1rios pending podem ser aprovados" };
  }

  const role = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, params.targetUserId), eq(userRoles.isActive, true)))
    .limit(1);

  if (!role[0]) {
    return {
      ok: false,
      error: "INVALID_STATE",
      message: "N\u00e3o existe usu\u00e1rio ativo sem role operacional definida"
    };
  }

  const updated = await db
    .update(users)
    .set({
      status: "active",
      approvedAt: sql`now()`,
      approvedByUserId: params.approvedByUserId,
      updatedAt: sql`now()`
    })
    .where(eq(users.id, params.targetUserId))
    .returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      status: users.status,
      authUserId: users.authUserId
    });

  if (!updated[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Usu\u00e1rio n\u00e3o encontrado" };
  }

  return { ok: true, user: updated[0] as any };
}

export async function blockUser(params: {
  databaseUrl: string;
  targetUserId: string;
  blockedByUserId: string;
}): Promise<MutateStatusResult> {
  const { db } = getDb(params.databaseUrl);

  const updated = await db
    .update(users)
    .set({
      status: "blocked",
      blockedAt: sql`now()`,
      blockedByUserId: params.blockedByUserId,
      updatedAt: sql`now()`
    })
    .where(eq(users.id, params.targetUserId))
    .returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      status: users.status,
      authUserId: users.authUserId
    });

  if (!updated[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Usu\u00e1rio n\u00e3o encontrado" };
  }

  return { ok: true, user: updated[0] as any };
}

export async function reactivateUser(params: {
  databaseUrl: string;
  targetUserId: string;
  reactivatedByUserId: string;
}): Promise<MutateStatusResult> {
  const { db } = getDb(params.databaseUrl);

  const target = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(eq(users.id, params.targetUserId))
    .limit(1);

  if (!target[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Usu\u00e1rio n\u00e3o encontrado" };
  }

  if (target[0].status !== "blocked" && target[0].status !== "inactive") {
    return {
      ok: false,
      error: "INVALID_STATE",
      message: "Somente usu\u00e1rios blocked/inactive podem ser reativados"
    };
  }

  const updated = await db
    .update(users)
    .set({
      status: "active",
      blockedAt: null,
      blockedByUserId: null,
      updatedAt: sql`now()`
    })
    .where(eq(users.id, params.targetUserId))
    .returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      status: users.status,
      authUserId: users.authUserId
    });

  if (!updated[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Usu\u00e1rio n\u00e3o encontrado" };
  }

  return { ok: true, user: updated[0] as any };
}

