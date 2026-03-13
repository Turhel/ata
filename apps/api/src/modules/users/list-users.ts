import { asc } from "drizzle-orm";
import { users } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function listOperationalUsers(databaseUrl: string) {
  const { db } = getDb(databaseUrl);

  return db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      status: users.status,
      authUserId: users.authUserId
    })
    .from(users)
    .orderBy(asc(users.email));
}

