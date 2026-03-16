import { eq } from "drizzle-orm";
import { users } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type OperationalUser = {
  id: string;
  email: string;
  fullName: string;
  status: "pending" | "active" | "blocked" | "inactive";
  authUserId: string | null;
  inspectorId: string | null;
};

export async function getUserByAuthUserId(databaseUrl: string, authUserId: string) {
  const { db } = getDb(databaseUrl);

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      status: users.status,
      authUserId: users.authUserId,
      inspectorId: users.inspectorId
    })
    .from(users)
    .where(eq(users.authUserId, authUserId))
    .limit(1);

  return rows[0] ? (rows[0] as OperationalUser) : null;
}
