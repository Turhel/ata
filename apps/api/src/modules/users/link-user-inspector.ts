import { and, eq, sql } from "drizzle-orm";
import { inspectors, userRoles, users } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

type LinkedUser = {
  id: string;
  email: string;
  fullName: string;
  status: "pending" | "active" | "blocked" | "inactive";
  authUserId: string | null;
  inspectorId: string | null;
  roleCode: "master" | "admin" | "assistant" | "inspector" | null;
};

export type LinkUserInspectorResult =
  | { ok: true; user: LinkedUser }
  | { ok: false; error: "NOT_FOUND" | "BAD_REQUEST"; message: string };

async function getUserWithActiveRole(db: ReturnType<typeof getDb>["db"], userId: string) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      status: users.status,
      authUserId: users.authUserId,
      inspectorId: users.inspectorId,
      roleCode: userRoles.roleCode
    })
    .from(users)
    .leftJoin(userRoles, and(eq(userRoles.userId, users.id), eq(userRoles.isActive, true)))
    .where(eq(users.id, userId))
    .limit(1);

  return (rows[0] as LinkedUser | undefined) ?? null;
}

export async function linkUserToInspector(params: {
  databaseUrl: string;
  targetUserId: string;
  inspectorId: string | null;
}): Promise<LinkUserInspectorResult> {
  const { db } = getDb(params.databaseUrl);

  const target = await getUserWithActiveRole(db, params.targetUserId);
  if (!target) {
    return { ok: false, error: "NOT_FOUND", message: "Usuário não encontrado" };
  }

  if (target.roleCode !== "inspector") {
    return { ok: false, error: "BAD_REQUEST", message: "Apenas usuários com role inspector podem ser vinculados" };
  }

  if (params.inspectorId) {
    const inspectorRows = await db
      .select({ id: inspectors.id })
      .from(inspectors)
      .where(eq(inspectors.id, params.inspectorId))
      .limit(1);

    if (!inspectorRows[0]) {
      return { ok: false, error: "NOT_FOUND", message: "Inspector não encontrado" };
    }

    const occupiedRows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.inspectorId, params.inspectorId), eq(users.id, params.targetUserId)))
      .limit(1);

    const occupiedByOtherRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.inspectorId, params.inspectorId))
      .limit(1);

    if (!occupiedRows[0] && occupiedByOtherRows[0]) {
      return { ok: false, error: "BAD_REQUEST", message: "Inspector já está vinculado a outro usuário" };
    }
  }

  const updatedRows = await db
    .update(users)
    .set({
      inspectorId: params.inspectorId,
      updatedAt: sql`now()`
    })
    .where(eq(users.id, params.targetUserId))
    .returning({ id: users.id });

  if (!updatedRows[0]) {
    return { ok: false, error: "NOT_FOUND", message: "Usuário não encontrado" };
  }

  const updated = await getUserWithActiveRole(db, params.targetUserId);
  if (!updated) {
    return { ok: false, error: "NOT_FOUND", message: "Usuário não encontrado" };
  }

  return { ok: true, user: updated };
}
