import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { teamAssignments, users } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type TeamAssignmentsScope = "all" | "mine";

export async function listTeamAssignments(params: {
  databaseUrl: string;
  actorUserId: string;
  actorRole: "master" | "admin" | "assistant";
  includeInactive: boolean;
  scope: TeamAssignmentsScope;
}) {
  const { db } = getDb(params.databaseUrl);

  const conditions = [];

  if (!params.includeInactive) {
    conditions.push(eq(teamAssignments.isActive, true));
  }

  if (params.actorRole === "admin") {
    conditions.push(eq(teamAssignments.adminUserId, params.actorUserId));
  } else if (params.actorRole === "assistant") {
    conditions.push(eq(teamAssignments.assistantUserId, params.actorUserId));
  } else if (params.scope === "mine") {
    conditions.push(eq(teamAssignments.adminUserId, params.actorUserId));
  }

  const rows = await db
    .select({
      id: teamAssignments.id,
      adminUserId: teamAssignments.adminUserId,
      assistantUserId: teamAssignments.assistantUserId,
      isActive: teamAssignments.isActive,
      startDate: teamAssignments.startDate,
      endDate: teamAssignments.endDate,
      createdAt: teamAssignments.createdAt,
      updatedAt: teamAssignments.updatedAt,
      adminEmail: users.email
    })
    .from(teamAssignments)
    .innerJoin(users, eq(teamAssignments.adminUserId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(teamAssignments.isActive), asc(teamAssignments.startDate));

  const assistantIds = [...new Set(rows.map((row) => row.assistantUserId))];
  const assistantRows =
    assistantIds.length > 0
      ? await db
          .select({
            id: users.id,
            email: users.email,
            fullName: users.fullName
          })
          .from(users)
          .where(inArray(users.id, assistantIds))
      : [];

  const assistantMap = new Map(assistantRows.map((row) => [row.id, row]));

  return rows.map((row) => ({
    id: row.id,
    adminUserId: row.adminUserId,
    assistantUserId: row.assistantUserId,
    isActive: row.isActive,
    startDate: row.startDate,
    endDate: row.endDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    admin: {
      id: row.adminUserId,
      email: row.adminEmail
    },
    assistant: assistantMap.get(row.assistantUserId)
      ? {
          id: assistantMap.get(row.assistantUserId)!.id,
          email: assistantMap.get(row.assistantUserId)!.email,
          fullName: assistantMap.get(row.assistantUserId)!.fullName
        }
      : null
  }));
}
