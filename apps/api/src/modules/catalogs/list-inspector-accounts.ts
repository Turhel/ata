import { asc } from "drizzle-orm";
import { inspectorAccounts } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function listInspectorAccounts(databaseUrl: string) {
  const { db } = getDb(databaseUrl);

  return db
    .select({
      id: inspectorAccounts.id,
      accountCode: inspectorAccounts.accountCode,
      accountType: inspectorAccounts.accountType,
      description: inspectorAccounts.description,
      currentInspectorId: inspectorAccounts.currentInspectorId,
      isActive: inspectorAccounts.isActive,
      createdAt: inspectorAccounts.createdAt,
      updatedAt: inspectorAccounts.updatedAt
    })
    .from(inspectorAccounts)
    .orderBy(asc(inspectorAccounts.accountCode));
}

