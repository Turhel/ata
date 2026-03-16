import { eq } from "drizzle-orm";
import { inspectors, users } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type OwnInspectorProfile = {
  userId: string;
  inspectorId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  departureCity: string | null;
  status: string;
  notes: string | null;
};

export async function getOwnInspectorProfile(params: {
  databaseUrl: string;
  operationalUserId: string;
}) {
  const { db } = getDb(params.databaseUrl);

  const rows = await db
    .select({
      userId: users.id,
      inspectorId: inspectors.id,
      fullName: inspectors.fullName,
      email: inspectors.email,
      phone: inspectors.phone,
      departureCity: inspectors.departureCity,
      status: inspectors.status,
      notes: inspectors.notes
    })
    .from(users)
    .innerJoin(inspectors, eq(inspectors.id, users.inspectorId))
    .where(eq(users.id, params.operationalUserId))
    .limit(1);

  return (rows[0] as OwnInspectorProfile | undefined) ?? null;
}
