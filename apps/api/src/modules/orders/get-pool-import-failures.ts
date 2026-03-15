import { asc, eq } from "drizzle-orm";
import { poolImportBatches, poolImportItems } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export type PoolImportFailureCategory =
  | "catalog_resolution"
  | "invalid_input"
  | "internal_error";

function getFailureCategory(errorMessage: string | null): PoolImportFailureCategory {
  const message = (errorMessage ?? "").trim();

  if (message.startsWith("Catálogos não resolvidos:")) {
    return "catalog_resolution";
  }

  if (message.startsWith("Item invalido")) {
    return "invalid_input";
  }

  return "internal_error";
}

function getUnresolvedReferences(errorMessage: string | null) {
  const message = (errorMessage ?? "").trim();
  if (!message.startsWith("Catálogos não resolvidos:")) {
    return [];
  }

  return message
    .replace("Catálogos não resolvidos:", "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function getPoolImportFailures(params: {
  databaseUrl: string;
  batchId: string;
}) {
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

  const rows = await db
    .select({
      id: poolImportItems.id,
      lineNumber: poolImportItems.lineNumber,
      externalOrderCode: poolImportItems.externalOrderCode,
      sourceStatus: poolImportItems.sourceStatus,
      sourceInspectorAccountCode: poolImportItems.sourceInspectorAccountCode,
      sourceClientCode: poolImportItems.sourceClientCode,
      sourceWorkTypeCode: poolImportItems.sourceWorkTypeCode,
      importAction: poolImportItems.importAction,
      matchedOrderId: poolImportItems.matchedOrderId,
      errorMessage: poolImportItems.errorMessage,
      rawPayload: poolImportItems.rawPayload,
      createdAt: poolImportItems.createdAt
    })
    .from(poolImportItems)
    .where(eq(poolImportItems.batchId, params.batchId))
    .orderBy(asc(poolImportItems.lineNumber));

  const failures = rows
    .filter((row) => row.importAction === "failed")
    .map((row) => ({
      ...row,
      failureCategory: getFailureCategory(row.errorMessage),
      unresolvedReferences: getUnresolvedReferences(row.errorMessage)
    }));

  return { batch, failures };
}

