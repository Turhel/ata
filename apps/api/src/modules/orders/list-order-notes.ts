import { asc, eq } from "drizzle-orm";
import { orderNotes } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function listOrderNotes(params: {
  databaseUrl: string;
  orderId: string;
  includeInternal: boolean;
}) {
  const { db } = getDb(params.databaseUrl);

  const rows = await db
    .select({
      id: orderNotes.id,
      orderId: orderNotes.orderId,
      authorUserId: orderNotes.authorUserId,
      noteType: orderNotes.noteType,
      content: orderNotes.content,
      isInternal: orderNotes.isInternal,
      createdAt: orderNotes.createdAt,
      updatedAt: orderNotes.updatedAt
    })
    .from(orderNotes)
    .where(eq(orderNotes.orderId, params.orderId))
    .orderBy(asc(orderNotes.createdAt));

  return params.includeInternal ? rows : rows.filter((row) => !row.isInternal);
}
