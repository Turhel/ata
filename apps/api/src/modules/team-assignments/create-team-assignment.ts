import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { teamAssignments, userRoles, users } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type CreateTeamAssignmentResult =
  | {
      ok: true;
      assignment: {
        id: string;
        adminUserId: string;
        assistantUserId: string;
        isActive: boolean;
        startDate: string;
        endDate: string | null;
      };
    }
  | {
      ok: false;
      error: "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT" | "FORBIDDEN";
      message: string;
    };

async function hasActiveRole(
  databaseUrl: string,
  userId: string,
  allowed: readonly ("master" | "admin" | "assistant" | "inspector")[]
) {
  const { db } = getDb(databaseUrl);
  const rows = await db
    .select({ roleCode: userRoles.roleCode })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.isActive, true)))
    .limit(1);

  const roleCode = rows[0]?.roleCode;
  return roleCode != null && allowed.includes(roleCode as any);
}

export async function createTeamAssignment(params: {
  databaseUrl: string;
  actorUserId: string;
  actorRole: "master" | "admin";
  body: unknown;
}): Promise<CreateTeamAssignmentResult> {
  const body = (params.body && typeof params.body === "object" ? params.body : {}) as Record<string, unknown>;
  const requestedAdminUserId =
    typeof body.adminUserId === "string" && body.adminUserId.trim().length > 0 ? body.adminUserId.trim() : null;
  const assistantUserId =
    typeof body.assistantUserId === "string" && body.assistantUserId.trim().length > 0 ? body.assistantUserId.trim() : null;
  const startDate =
    typeof body.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate)
      ? body.startDate
      : new Date().toISOString().slice(0, 10);

  if (!assistantUserId) {
    return { ok: false, error: "BAD_REQUEST", message: "assistantUserId é obrigatório" };
  }

  const adminUserId = params.actorRole === "admin" ? params.actorUserId : requestedAdminUserId;
  if (!adminUserId) {
    return { ok: false, error: "BAD_REQUEST", message: "adminUserId é obrigatório" };
  }

  if (params.actorRole === "admin" && adminUserId !== params.actorUserId) {
    return { ok: false, error: "FORBIDDEN", message: "Admin só pode criar vínculo para si mesmo" };
  }

  if (adminUserId === assistantUserId) {
    return { ok: false, error: "BAD_REQUEST", message: "adminUserId e assistantUserId não podem ser iguais" };
  }

  const { db } = getDb(params.databaseUrl);
  const existingUsers = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(inArray(users.id, [adminUserId, assistantUserId]));

  const usersById = new Map(existingUsers.map((row) => [row.id, row]));
  const adminExists = usersById.get(adminUserId);
  const assistantExists = usersById.get(assistantUserId);
  if (!adminExists || !assistantExists) {
    return { ok: false, error: "NOT_FOUND", message: "Admin ou assistant não encontrado" };
  }

  if (adminExists.status !== "active" || assistantExists.status !== "active") {
    return { ok: false, error: "BAD_REQUEST", message: "Admin e assistant precisam estar ativos" };
  }

  const [adminHasRole, assistantHasRole] = await Promise.all([
    hasActiveRole(params.databaseUrl, adminUserId, ["admin", "master"]),
    hasActiveRole(params.databaseUrl, assistantUserId, ["assistant"])
  ]);

  if (!adminHasRole) {
    return { ok: false, error: "BAD_REQUEST", message: "adminUserId não possui role admin/master ativa" };
  }

  if (!assistantHasRole) {
    return { ok: false, error: "BAD_REQUEST", message: "assistantUserId não possui role assistant ativa" };
  }

  const existingAssignment = await db
    .select({ id: teamAssignments.id })
    .from(teamAssignments)
    .where(and(eq(teamAssignments.assistantUserId, assistantUserId), eq(teamAssignments.isActive, true)))
    .limit(1);

  if (existingAssignment[0]) {
    return {
      ok: false,
      error: "CONFLICT",
      message: "Assistant já possui team_assignment ativo"
    };
  }

  const inserted = await db
    .insert(teamAssignments)
    .values({
      id: randomUUID(),
      adminUserId,
      assistantUserId,
      isActive: true,
      startDate
    })
    .returning({
      id: teamAssignments.id,
      adminUserId: teamAssignments.adminUserId,
      assistantUserId: teamAssignments.assistantUserId,
      isActive: teamAssignments.isActive,
      startDate: teamAssignments.startDate,
      endDate: teamAssignments.endDate
    });

  const assignment = inserted[0];
  if (!assignment) {
    return { ok: false, error: "BAD_REQUEST", message: "Falha ao criar team_assignment" };
  }

  return {
    ok: true,
    assignment: {
      ...assignment,
      startDate: String(assignment.startDate),
      endDate: assignment.endDate ? String(assignment.endDate) : null
    }
  };
}
