import { asc } from "drizzle-orm";
import { inspectors } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function listInspectors(databaseUrl: string) {
  const { db } = getDb(databaseUrl);

  return db
    .select({
      id: inspectors.id,
      fullName: inspectors.fullName,
      email: inspectors.email,
      phone: inspectors.phone,
      status: inspectors.status,
      notes: inspectors.notes,
      createdAt: inspectors.createdAt,
      updatedAt: inspectors.updatedAt
    })
    .from(inspectors)
    .orderBy(asc(inspectors.fullName));
}

