import { and, eq } from "drizzle-orm";
import { teamAssignments } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function getActiveAssistantIdsByAdmin(params: {
  databaseUrl: string;
  adminUserId: string;
}) {
  const { db } = getDb(params.databaseUrl);
  const rows = await db
    .select({ assistantUserId: teamAssignments.assistantUserId })
    .from(teamAssignments)
    .where(and(eq(teamAssignments.adminUserId, params.adminUserId), eq(teamAssignments.isActive, true)));

  return [...new Set(rows.map((row) => row.assistantUserId))];
}
