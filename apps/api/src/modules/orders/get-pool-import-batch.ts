import { asc, eq } from "drizzle-orm";
import { poolImportBatches, poolImportItems } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function getPoolImportBatchById(params: { databaseUrl: string; batchId: string }) {
  const { db } = getDb(params.databaseUrl);

  const batchRows = await db
    .select({
      id: poolImportBatches.id,
      fileName: poolImportBatches.fileName,
      status: poolImportBatches.status,
      totalRows: poolImportBatches.totalRows,
      insertedRows: poolImportBatches.insertedRows,
      updatedRows: poolImportBatches.updatedRows,
      ignoredRows: poolImportBatches.ignoredRows,
      errorRows: poolImportBatches.errorRows,
      startedAt: poolImportBatches.startedAt,
      finishedAt: poolImportBatches.finishedAt,
      importedByUserId: poolImportBatches.importedByUserId
    })
    .from(poolImportBatches)
    .where(eq(poolImportBatches.id, params.batchId))
    .limit(1);

  const batch = batchRows[0] ?? null;
  if (!batch) return null;

  const items = await db
    .select({
      id: poolImportItems.id,
      lineNumber: poolImportItems.lineNumber,
      externalOrderCode: poolImportItems.externalOrderCode,
      sourceStatus: poolImportItems.sourceStatus,
      importAction: poolImportItems.importAction,
      matchedOrderId: poolImportItems.matchedOrderId,
      errorMessage: poolImportItems.errorMessage,
      createdAt: poolImportItems.createdAt
    })
    .from(poolImportItems)
    .where(eq(poolImportItems.batchId, params.batchId))
        .orderBy(asc(poolImportItems.lineNumber));

  return { batch, items };
}
