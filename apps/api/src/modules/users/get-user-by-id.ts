import { eq } from "drizzle-orm";
import { users } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function getUserById(databaseUrl: string, userId: string) {
  const { db } = getDb(databaseUrl);
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      status: users.status,
      authUserId: users.authUserId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return rows[0] ?? null;
}

