import { and, desc, eq } from "drizzle-orm";
import { userRoles } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type RoleCode = "master" | "admin" | "assistant" | "inspector";

export async function getActiveRoleCodeByUserId(databaseUrl: string, userId: string) {
  const { db } = getDb(databaseUrl);

  const rows = await db
    .select({ roleCode: userRoles.roleCode })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.isActive, true)))
    .orderBy(desc(userRoles.assignedAt))
    .limit(1);

  const role = rows[0]?.roleCode as RoleCode | undefined;
  return role ?? null;
}
