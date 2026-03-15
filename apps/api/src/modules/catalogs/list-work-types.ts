import { asc } from "drizzle-orm";
import { workTypes } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function listWorkTypes(databaseUrl: string) {
  const { db } = getDb(databaseUrl);

  return db
    .select({
      id: workTypes.id,
      code: workTypes.code,
      name: workTypes.name,
      description: workTypes.description,
      isActive: workTypes.isActive,
      defaultPaymentAmountAssistant: workTypes.defaultPaymentAmountAssistant,
      defaultPaymentAmountInspector: workTypes.defaultPaymentAmountInspector,
      createdAt: workTypes.createdAt,
      updatedAt: workTypes.updatedAt
    })
    .from(workTypes)
    .orderBy(asc(workTypes.code));
}

