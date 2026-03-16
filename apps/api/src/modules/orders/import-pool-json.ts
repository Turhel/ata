import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  clients,
  inspectorAccounts,
  orderEvents,
  orders,
  poolImportBatches,
  poolImportItems,
  sourceOrderStatusEnum,
  workTypes
} from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

type SourceStatus = (typeof sourceOrderStatusEnum.enumValues)[number];
type OrderStatus = (typeof orders.status.enumValues)[number];

const openOperationalStatuses: OrderStatus[] = [
  "available",
  "in_progress",
  "submitted",
  "follow_up",
  "rejected"
];

const preservedLateCancellationStatuses: OrderStatus[] = [
  "approved",
  "batched",
  "paid",
  "archived"
];

export type PoolImportNormalizedItem = {
  lineNumber: number;
  externalOrderCode: string;
  sourceStatus: SourceStatus;
  residentName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  availableDate?: string | null;
  deadlineDate?: string | null;
  isRush?: boolean | null;
  isVacant?: boolean | null;
  sourceInspectorAccountCode?: string | null;
  sourceClientCode?: string | null;
  sourceWorkTypeCode?: string | null;
  rawPayload: unknown;
};

export type PoolImportNormalizedPayload = {
  fileName: string;
  items: PoolImportNormalizedItem[];
};

function parseIsoDateOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function isSourceStatus(value: unknown): value is SourceStatus {
  return (
    typeof value === "string" &&
    (sourceOrderStatusEnum.enumValues as readonly string[]).includes(value)
  );
}

export type PoolImportResult = {
  ok: true;
  batchId: string;
  status: "completed" | "partially_completed" | "failed";
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  ignoredRows: number;
  errorRows: number;
};

type ProcessPoolImportItemResult =
  | { importAction: "created" | "updated" }
  | { importAction: "failed" };

function shouldCancelOperationalOrder(status: OrderStatus | null) {
  return status != null && openOperationalStatuses.includes(status);
}

function isLateSourceCancellation(status: OrderStatus | null) {
  return status != null && preservedLateCancellationStatuses.includes(status);
}

function buildCatalogResolutionError(params: {
  sourceClientCode: string | null;
  sourceWorkTypeCode: string | null;
  sourceInspectorAccountCode: string | null;
  clientResolved: boolean;
  workTypeResolved: boolean;
  inspectorAccountResolved: boolean;
}) {
  const missing: string[] = [];

  if (params.sourceClientCode && !params.clientResolved) {
    missing.push(`client:${params.sourceClientCode}`);
  }

  if (params.sourceWorkTypeCode && !params.workTypeResolved) {
    missing.push(`work_type:${params.sourceWorkTypeCode}`);
  }

  if (params.sourceInspectorAccountCode && !params.inspectorAccountResolved) {
    missing.push(`inspector_account:${params.sourceInspectorAccountCode}`);
  }

  if (missing.length === 0) return null;
  return `Catálogos não resolvidos: ${missing.join(", ")}`;
}

async function upsertPoolImportItemResult(params: {
  tx: any;
  importItemId?: string;
  batchId: string;
  item: PoolImportNormalizedItem;
  externalOrderCode: string;
  sourceStatus: SourceStatus;
  matchedOrderId: string | null;
  importAction: "created" | "updated" | "ignored" | "failed";
  errorMessage: string | null;
}) {
  const values = {
    batchId: params.batchId,
    lineNumber: params.item.lineNumber,
    externalOrderCode: params.externalOrderCode,
    sourceStatus: params.sourceStatus,
    sourceInspectorAccountCode: params.item.sourceInspectorAccountCode ?? null,
    sourceClientCode: params.item.sourceClientCode ?? null,
    sourceWorkTypeCode: params.item.sourceWorkTypeCode ?? null,
    rawPayload: params.item.rawPayload,
    matchedOrderId: params.matchedOrderId,
    importAction: params.importAction,
    errorMessage: params.errorMessage,
    updatedAt: sql`now()`
  };

  if (params.importItemId) {
    await params.tx
      .update(poolImportItems)
      .set(values)
      .where(eq(poolImportItems.id, params.importItemId));
    return params.importItemId;
  }

  const id = randomUUID();
  await params.tx.insert(poolImportItems).values({ id, ...values });
  return id;
}

export async function processPoolImportItem(params: {
  tx: any;
  batchId: string;
  importedByUserId: string;
  item: PoolImportNormalizedItem;
  importItemId?: string;
}): Promise<ProcessPoolImportItemResult> {
  const { tx, batchId, importedByUserId, item, importItemId } = params;

  const lineNumber = Number.isFinite(item.lineNumber) ? item.lineNumber : 0;
  const externalOrderCode =
    typeof item.externalOrderCode === "string" && item.externalOrderCode.trim()
      ? item.externalOrderCode.trim()
      : `__invalid__line_${lineNumber || "unknown"}`;

  const sourceStatus: SourceStatus = isSourceStatus(item.sourceStatus)
    ? item.sourceStatus
    : "Assigned";

  const availableDate = parseIsoDateOrNull(item.availableDate);
  const deadlineDate = parseIsoDateOrNull(item.deadlineDate);

  const hasFatalInputError =
    !Number.isFinite(item.lineNumber) ||
    typeof item.externalOrderCode !== "string" ||
    !item.externalOrderCode.trim() ||
    !isSourceStatus(item.sourceStatus) ||
    (item.availableDate != null && availableDate == null) ||
    (item.deadlineDate != null && deadlineDate == null) ||
    item.rawPayload === undefined;

  if (hasFatalInputError) {
    await upsertPoolImportItemResult({
      tx,
      importItemId,
      batchId,
      item,
      externalOrderCode,
      sourceStatus,
      matchedOrderId: null,
      importAction: "failed",
      errorMessage:
        "Item invalido (campos obrigatorios ausentes/invalidos: lineNumber, externalOrderCode, sourceStatus, rawPayload, datas ISO)"
    });
    return { importAction: "failed" };
  }

  const existing = await tx
    .select({
      id: orders.id,
      status: orders.status,
      sourceStatus: orders.sourceStatus
    })
    .from(orders)
    .where(eq(orders.externalOrderCode, externalOrderCode))
    .limit(1);

  const nowSql = sql`now()`;
  const sourceInspectorAccountCode = item.sourceInspectorAccountCode?.trim() || null;
  const sourceClientCode = item.sourceClientCode?.trim() || null;
  const sourceWorkTypeCode = item.sourceWorkTypeCode?.trim() || null;

  const inspectorAccountRow =
    sourceInspectorAccountCode == null
      ? null
      : (
          await tx
            .select({
              id: inspectorAccounts.id,
              currentInspectorId: inspectorAccounts.currentInspectorId
            })
            .from(inspectorAccounts)
            .where(eq(inspectorAccounts.accountCode, sourceInspectorAccountCode))
            .limit(1)
        )[0] ?? null;

  const clientRow =
    sourceClientCode == null
      ? null
      : (
          await tx
            .select({ id: clients.id })
            .from(clients)
            .where(eq(clients.clientCode, sourceClientCode))
            .limit(1)
        )[0] ?? null;

  const workTypeRow =
    sourceWorkTypeCode == null
      ? null
      : (
          await tx
            .select({ id: workTypes.id })
            .from(workTypes)
            .where(eq(workTypes.code, sourceWorkTypeCode))
            .limit(1)
        )[0] ?? null;

  const catalogResolutionError = buildCatalogResolutionError({
    sourceClientCode,
    sourceWorkTypeCode,
    sourceInspectorAccountCode,
    clientResolved: clientRow != null,
    workTypeResolved: workTypeRow != null,
    inspectorAccountResolved: inspectorAccountRow != null
  });

  if (catalogResolutionError) {
    await upsertPoolImportItemResult({
      tx,
      importItemId,
      batchId,
      item,
      externalOrderCode,
      sourceStatus,
      matchedOrderId: null,
      importAction: "failed",
      errorMessage: catalogResolutionError
    });

    return { importAction: "failed" };
  }

  let matchedOrderId: string;
  let importAction: "created" | "updated";
  let createdEventType: "created" | "updated";
  let previousSourceStatus: SourceStatus | null = null;
  let previousOperationalStatus: OrderStatus | null = null;
  let nextOrderStatus: OrderStatus | null = null;
  let cancelledAtAlreadySet = false;

  if (!existing[0]) {
    matchedOrderId = randomUUID();
    importAction = "created";
    createdEventType = "created";
    nextOrderStatus = sourceStatus === "Canceled" ? "cancelled" : "available";

    const inserted = await tx
      .insert(orders)
      .values({
        id: matchedOrderId,
        externalOrderCode,
        sourceStatus,
        status: nextOrderStatus,
        clientId: clientRow?.id ?? null,
        residentName: item.residentName ?? null,
        addressLine1: item.addressLine1 ?? null,
        addressLine2: item.addressLine2 ?? null,
        city: item.city ?? null,
        state: item.state ?? null,
        zipCode: item.zipCode ?? null,
        workTypeId: workTypeRow?.id ?? null,
        inspectorAccountId: inspectorAccountRow?.id ?? null,
        assignedInspectorId: inspectorAccountRow?.currentInspectorId ?? null,
        availableDate,
        deadlineDate,
        isRush: item.isRush ?? false,
        isVacant: item.isVacant ?? false,
        sourceImportBatchId: batchId,
        cancelledAt: sourceStatus === "Canceled" ? nowSql : null,
        updatedAt: nowSql
      })
      .returning({ id: orders.id, status: orders.status, sourceStatus: orders.sourceStatus });

    if (!inserted[0]) {
      throw new Error("Falha ao inserir order");
    }
    previousOperationalStatus = null;
  } else {
    matchedOrderId = existing[0].id;
    importAction = "updated";
    createdEventType = "updated";
    previousSourceStatus = existing[0].sourceStatus;
    previousOperationalStatus = existing[0].status;
    nextOrderStatus = previousOperationalStatus;
    cancelledAtAlreadySet = previousOperationalStatus === "cancelled";

    if (sourceStatus === "Canceled" && shouldCancelOperationalOrder(previousOperationalStatus)) {
      nextOrderStatus = "cancelled";
    }

    await tx
      .update(orders)
      .set({
        sourceStatus,
        ...(nextOrderStatus !== previousOperationalStatus ? { status: nextOrderStatus } : {}),
        clientId: clientRow?.id ?? null,
        residentName: item.residentName ?? null,
        addressLine1: item.addressLine1 ?? null,
        addressLine2: item.addressLine2 ?? null,
        city: item.city ?? null,
        state: item.state ?? null,
        zipCode: item.zipCode ?? null,
        workTypeId: workTypeRow?.id ?? null,
        inspectorAccountId: inspectorAccountRow?.id ?? null,
        assignedInspectorId: inspectorAccountRow?.currentInspectorId ?? null,
        availableDate,
        deadlineDate,
        isRush: item.isRush ?? false,
        isVacant: item.isVacant ?? false,
        sourceImportBatchId: batchId,
        ...(nextOrderStatus === "cancelled" && !cancelledAtAlreadySet ? { cancelledAt: nowSql } : {}),
        updatedAt: nowSql
      })
      .where(eq(orders.id, matchedOrderId));
  }

  await tx.insert(orderEvents).values({
    id: randomUUID(),
    orderId: matchedOrderId,
    eventType: createdEventType,
    fromStatus: null,
    toStatus: nextOrderStatus ?? previousOperationalStatus,
    performedByUserId: importedByUserId,
    metadata: {
      importBatchId: batchId,
      lineNumber,
      externalOrderCode,
      sourceStatus,
      resolvedInspectorAccountId: inspectorAccountRow?.id ?? null,
      resolvedAssignedInspectorId: inspectorAccountRow?.currentInspectorId ?? null,
      resolvedClientId: clientRow?.id ?? null,
      resolvedWorkTypeId: workTypeRow?.id ?? null,
      reprocessedImportItemId: importItemId ?? null
    }
  });

  const shouldEmitCancelledFromSourceEvent =
    sourceStatus === "Canceled" &&
    (previousSourceStatus !== "Canceled" || shouldCancelOperationalOrder(previousOperationalStatus));

  if (shouldEmitCancelledFromSourceEvent) {
    const cancellationToStatus =
      nextOrderStatus === "cancelled" || shouldCancelOperationalOrder(previousOperationalStatus)
        ? "cancelled"
        : previousOperationalStatus;

    await tx.insert(orderEvents).values({
      id: randomUUID(),
      orderId: matchedOrderId,
      eventType: "cancelled_from_source",
      fromStatus: previousOperationalStatus,
      toStatus: cancellationToStatus,
      performedByUserId: importedByUserId,
      metadata: {
        importBatchId: batchId,
        lineNumber,
        externalOrderCode,
        previousSourceStatus,
        sourceStatus,
        resolvedInspectorAccountId: inspectorAccountRow?.id ?? null,
        resolvedAssignedInspectorId: inspectorAccountRow?.currentInspectorId ?? null,
        lateSourceCancellation: isLateSourceCancellation(previousOperationalStatus),
        resolvedClientId: clientRow?.id ?? null,
        resolvedWorkTypeId: workTypeRow?.id ?? null,
        reprocessedImportItemId: importItemId ?? null
      }
    });
  }

  await upsertPoolImportItemResult({
    tx,
    importItemId,
    batchId,
    item,
    externalOrderCode,
    sourceStatus,
    matchedOrderId,
    importAction,
    errorMessage: null
  });

  return { importAction };
}

export async function recalculatePoolImportBatch(params: {
  databaseUrl: string;
  batchId: string;
}) {
  const { db } = getDb(params.databaseUrl);

  const batchRows = await db
    .select({ id: poolImportBatches.id, totalRows: poolImportBatches.totalRows })
    .from(poolImportBatches)
    .where(eq(poolImportBatches.id, params.batchId))
    .limit(1);

  const batch = batchRows[0] ?? null;
  if (!batch) return null;

  const itemRows = await db
    .select({ importAction: poolImportItems.importAction })
    .from(poolImportItems)
    .where(eq(poolImportItems.batchId, params.batchId));

  let insertedRows = 0;
  let updatedRows = 0;
  let ignoredRows = 0;
  let errorRows = 0;

  for (const itemRow of itemRows) {
    if (itemRow.importAction === "created") insertedRows += 1;
    else if (itemRow.importAction === "updated") updatedRows += 1;
    else if (itemRow.importAction === "ignored") ignoredRows += 1;
    else if (itemRow.importAction === "failed") errorRows += 1;
  }

  const totalRows = batch.totalRows;
  const status =
    errorRows === 0 ? "completed" : errorRows === totalRows ? "failed" : "partially_completed";

  await db
    .update(poolImportBatches)
    .set({
      status,
      insertedRows,
      updatedRows,
      ignoredRows,
      errorRows,
      finishedAt: sql`now()`,
      updatedAt: sql`now()`
    })
    .where(eq(poolImportBatches.id, params.batchId));

  return {
    status,
    totalRows,
    insertedRows,
    updatedRows,
    ignoredRows,
    errorRows
  };
}

export async function importPoolFromJsonNormalized(params: {
  databaseUrl: string;
  importedByUserId: string;
  payload: PoolImportNormalizedPayload;
}): Promise<PoolImportResult> {
  const { db } = getDb(params.databaseUrl);

  const batchId = randomUUID();
  const totalRows = params.payload.items.length;

  await db.insert(poolImportBatches).values({
    id: batchId,
    fileName: params.payload.fileName,
    status: "processing",
    totalRows,
    importedByUserId: params.importedByUserId
  });

  let insertedRows = 0;
  let updatedRows = 0;
  let ignoredRows = 0;
  let errorRows = 0;

  try {
    await db.transaction(async (tx) => {
      for (const item of params.payload.items) {
        const lineNumber = Number.isFinite(item.lineNumber) ? item.lineNumber : 0;
        const externalOrderCode =
          typeof item.externalOrderCode === "string" && item.externalOrderCode.trim()
            ? item.externalOrderCode.trim()
            : `__invalid__line_${lineNumber || "unknown"}`;
        const sourceStatus: SourceStatus = isSourceStatus(item.sourceStatus)
          ? item.sourceStatus
          : "Assigned";
    
        try {
          const result = await processPoolImportItem({
            tx,
            batchId,
            importedByUserId: params.importedByUserId,
            item: {
              ...item,
              rawPayload: item.rawPayload ?? {}
            }
          });
    
          if (result.importAction === "created") insertedRows += 1;
          else if (result.importAction === "updated") updatedRows += 1;
          else errorRows += 1;
        } catch (error) {
          errorRows += 1;
    
          const message = error instanceof Error ? error.message : "erro desconhecido";
          await tx.insert(poolImportItems).values({
            id: randomUUID(),
            batchId,
            lineNumber,
            externalOrderCode,
            sourceStatus,
            sourceInspectorAccountCode: item.sourceInspectorAccountCode ?? null,
            sourceClientCode: item.sourceClientCode ?? null,
            sourceWorkTypeCode: item.sourceWorkTypeCode ?? null,
            rawPayload: item.rawPayload,
            matchedOrderId: null,
            importAction: "failed",
            errorMessage: message
          });
        }
      }
    });
  } catch (error) {
    // Should never happen since we catch inside the transaction loop, but keeping it safe
    console.error("Fatal transaction error", error);
    errorRows = totalRows;
  }

  const status =
    errorRows === 0 ? "completed" : errorRows === totalRows ? "failed" : "partially_completed";

  await db
    .update(poolImportBatches)
    .set({
      status,
      insertedRows,
      updatedRows,
      ignoredRows,
      errorRows,
      finishedAt: sql`now()`,
      updatedAt: sql`now()`
    })
    .where(and(eq(poolImportBatches.id, batchId), eq(poolImportBatches.status, "processing")));

  return {
    ok: true,
    batchId,
    status,
    totalRows,
    insertedRows,
    updatedRows,
    ignoredRows,
    errorRows
  };
}
