import { asc } from "drizzle-orm";
import { clients } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function listClients(databaseUrl: string) {
  const { db } = getDb(databaseUrl);

  return db
    .select({
      id: clients.id,
      clientCode: clients.clientCode,
      name: clients.name,
      description: clients.description,
      isActive: clients.isActive,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt
    })
    .from(clients)
    .orderBy(asc(clients.clientCode));
}

