import { eq } from "drizzle-orm";
import { poolImportBatches, poolImportItems } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";
import {
  processPoolImportItem,
  recalculatePoolImportBatch,
  type PoolImportNormalizedItem
} from "./import-pool-json.js";

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNullableBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function getNormalizedItemFromRow(row: {
  lineNumber: number;
  externalOrderCode: string;
  sourceStatus: "Assigned" | "Received" | "Canceled";
  sourceInspectorAccountCode: string | null;
  sourceClientCode: string | null;
  sourceWorkTypeCode: string | null;
  rawPayload: unknown;
}) {
  const rawPayload =
    row.rawPayload && typeof row.rawPayload === "object" ? (row.rawPayload as Record<string, unknown>) : {};

  const normalizedItem: PoolImportNormalizedItem = {
    lineNumber: row.lineNumber,
    externalOrderCode: row.externalOrderCode,
    sourceStatus: row.sourceStatus,
    residentName: asNullableString(rawPayload.residentName),
    addressLine1: asNullableString(rawPayload.addressLine1),
    addressLine2: asNullableString(rawPayload.addressLine2),
    city: asNullableString(rawPayload.city),
    state: asNullableString(rawPayload.state),
    zipCode: asNullableString(rawPayload.zipCode),
    availableDate: asNullableString(rawPayload.availableDate),
    deadlineDate: asNullableString(rawPayload.deadlineDate),
    isRush: asNullableBoolean(rawPayload.isRush),
    isVacant: asNullableBoolean(rawPayload.isVacant),
    sourceInspectorAccountCode: row.sourceInspectorAccountCode,
    sourceClientCode: row.sourceClientCode,
    sourceWorkTypeCode: row.sourceWorkTypeCode,
    rawPayload: row.rawPayload
  };

  return normalizedItem;
}

export async function reprocessPoolImportItem(params: {
  databaseUrl: string;
  importItemId: string;
  reprocessedByUserId: string;
}) {
  const { db } = getDb(params.databaseUrl);

  const itemRows = await db
    .select({
      id: poolImportItems.id,
      batchId: poolImportItems.batchId,
      lineNumber: poolImportItems.lineNumber,
      externalOrderCode: poolImportItems.externalOrderCode,
      sourceStatus: poolImportItems.sourceStatus,
      sourceInspectorAccountCode: poolImportItems.sourceInspectorAccountCode,
      sourceClientCode: poolImportItems.sourceClientCode,
      sourceWorkTypeCode: poolImportItems.sourceWorkTypeCode,
      rawPayload: poolImportItems.rawPayload,
      matchedOrderId: poolImportItems.matchedOrderId,
      importAction: poolImportItems.importAction,
      errorMessage: poolImportItems.errorMessage,
      createdAt: poolImportItems.createdAt,
      updatedAt: poolImportItems.updatedAt
    })
    .from(poolImportItems)
    .where(eq(poolImportItems.id, params.importItemId))
    .limit(1);

  const item = itemRows[0] ?? null;
  if (!item) return null;

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
    .where(eq(poolImportBatches.id, item.batchId))
    .limit(1);

  const batch = batchRows[0] ?? null;
  if (!batch) return null;

  if (item.importAction !== "failed") {
    return {
      ok: false as const,
      error: "BAD_REQUEST" as const,
      message: "Apenas itens com falha podem ser reprocessados"
    };
  }

  const normalizedItem = getNormalizedItemFromRow(item);

  await db.transaction(async (tx) => {
    await processPoolImportItem({
      tx,
      batchId: item.batchId,
      importedByUserId: params.reprocessedByUserId,
      item: normalizedItem,
      importItemId: item.id
    });
  });

  const counters = await recalculatePoolImportBatch({
    databaseUrl: params.databaseUrl,
    batchId: item.batchId
  });

  const refreshedRows = await db
    .select({
      id: poolImportItems.id,
      batchId: poolImportItems.batchId,
      lineNumber: poolImportItems.lineNumber,
      externalOrderCode: poolImportItems.externalOrderCode,
      sourceStatus: poolImportItems.sourceStatus,
      sourceInspectorAccountCode: poolImportItems.sourceInspectorAccountCode,
      sourceClientCode: poolImportItems.sourceClientCode,
      sourceWorkTypeCode: poolImportItems.sourceWorkTypeCode,
      rawPayload: poolImportItems.rawPayload,
      matchedOrderId: poolImportItems.matchedOrderId,
      importAction: poolImportItems.importAction,
      errorMessage: poolImportItems.errorMessage,
      createdAt: poolImportItems.createdAt,
      updatedAt: poolImportItems.updatedAt
    })
    .from(poolImportItems)
    .where(eq(poolImportItems.id, params.importItemId))
    .limit(1);

  return {
    ok: true as const,
    batch: counters
      ? {
          ...batch,
          status: counters.status,
          totalRows: counters.totalRows,
          insertedRows: counters.insertedRows,
          updatedRows: counters.updatedRows,
          ignoredRows: counters.ignoredRows,
          errorRows: counters.errorRows
        }
      : batch,
    item: refreshedRows[0] ?? item
  };
}
