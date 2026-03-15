import { and, eq, sql } from "drizzle-orm";
import { teamAssignments } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type DeactivateTeamAssignmentResult =
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
      error: "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATE";
      message: string;
    };

export async function deactivateTeamAssignment(params: {
  databaseUrl: string;
  actorUserId: string;
  actorRole: "master" | "admin";
  assignmentId: string;
}): Promise<DeactivateTeamAssignmentResult> {
  const { db } = getDb(params.databaseUrl);
  const rows = await db
    .select({
      id: teamAssignments.id,
      adminUserId: teamAssignments.adminUserId,
      assistantUserId: teamAssignments.assistantUserId,
      isActive: teamAssignments.isActive,
      startDate: teamAssignments.startDate,
      endDate: teamAssignments.endDate
    })
    .from(teamAssignments)
    .where(eq(teamAssignments.id, params.assignmentId))
    .limit(1);

  const assignment = rows[0];
  if (!assignment) {
    return { ok: false, error: "NOT_FOUND", message: "team_assignment não encontrado" };
  }

  if (params.actorRole === "admin" && assignment.adminUserId !== params.actorUserId) {
    return { ok: false, error: "FORBIDDEN", message: "Admin só pode encerrar vínculos do próprio time" };
  }

  if (!assignment.isActive) {
    return { ok: false, error: "INVALID_STATE", message: "team_assignment já está inativo" };
  }

  const today = new Date().toISOString().slice(0, 10);
  const updated = await db
    .update(teamAssignments)
    .set({
      isActive: false,
      endDate: today,
      updatedAt: sql`now()`
    })
    .where(and(eq(teamAssignments.id, params.assignmentId), eq(teamAssignments.isActive, true)))
    .returning({
      id: teamAssignments.id,
      adminUserId: teamAssignments.adminUserId,
      assistantUserId: teamAssignments.assistantUserId,
      isActive: teamAssignments.isActive,
      startDate: teamAssignments.startDate,
      endDate: teamAssignments.endDate
    });

  const result = updated[0];
  if (!result) {
    return { ok: false, error: "INVALID_STATE", message: "Não foi possível encerrar o vínculo" };
  }

  return {
    ok: true,
    assignment: {
      ...result,
      startDate: String(result.startDate),
      endDate: result.endDate ? String(result.endDate) : null
    }
  };
}
