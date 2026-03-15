import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { userRoles, users } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type RoleCode = "master" | "admin" | "assistant" | "inspector";

export type ChangeUserRoleResult =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        fullName: string;
        status: "pending" | "active" | "blocked" | "inactive";
        authUserId: string | null;
      };
      role: {
        userId: string;
        roleCode: RoleCode;
        assignedAt: string;
        assignedByUserId: string;
      };
    }
  | {
      ok: false;
      error: "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN";
      message: string;
    };

export async function changeUserRole(params: {
  databaseUrl: string;
  actorUserId: string;
  actorRole: RoleCode;
  targetUserId: string;
  roleCode: RoleCode;
}): Promise<ChangeUserRoleResult> {
  if (params.actorRole === "admin" && (params.roleCode === "admin" || params.roleCode === "master")) {
    return {
      ok: false,
      error: "FORBIDDEN",
      message: "Admin não pode atribuir roles admin/master"
    };
  }

  if (params.actorUserId === params.targetUserId && params.roleCode !== params.actorRole) {
    return {
      ok: false,
      error: "FORBIDDEN",
      message: "Não é permitido alterar a própria role para um valor diferente"
    };
  }

  const { db } = getDb(params.databaseUrl);

  return db.transaction(async (tx) => {
    const targetRows = await tx
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        status: users.status,
        authUserId: users.authUserId
      })
      .from(users)
      .where(eq(users.id, params.targetUserId))
      .limit(1);

    const target = targetRows[0];
    if (!target) {
      return { ok: false, error: "NOT_FOUND", message: "Usuário não encontrado" };
    }

    const activeRoleRows = await tx
      .select({
        id: userRoles.id,
        roleCode: userRoles.roleCode
      })
      .from(userRoles)
      .where(and(eq(userRoles.userId, params.targetUserId), eq(userRoles.isActive, true)))
      .limit(1);

    const activeRole = activeRoleRows[0];
    if (activeRole?.roleCode === params.roleCode) {
      return {
        ok: false,
        error: "BAD_REQUEST",
        message: "Usuário já possui esta role ativa"
      };
    }

    if (activeRole) {
      await tx
        .update(userRoles)
        .set({
          isActive: false,
          updatedAt: sql`now()`
        })
        .where(eq(userRoles.id, activeRole.id));
    }

    const insertedRows = await tx
      .insert(userRoles)
      .values({
        id: randomUUID(),
        userId: params.targetUserId,
        roleCode: params.roleCode,
        assignedByUserId: params.actorUserId,
        isActive: true
      })
      .returning({
        userId: userRoles.userId,
        roleCode: userRoles.roleCode,
        assignedAt: userRoles.assignedAt,
        assignedByUserId: userRoles.assignedByUserId
      });

    const inserted = insertedRows[0];
    if (!inserted) {
      return {
        ok: false,
        error: "BAD_REQUEST",
        message: "Falha ao atribuir nova role"
      };
    }

    return {
      ok: true,
      user: target as any,
      role: {
        userId: inserted.userId,
        roleCode: inserted.roleCode as RoleCode,
        assignedAt: inserted.assignedAt?.toISOString?.() ?? String(inserted.assignedAt),
        assignedByUserId: inserted.assignedByUserId
      }
    };
  });
}
