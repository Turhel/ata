import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  orderEvents,
  orders,
  poolImportBatches,
  poolImportItems,
  sourceOrderStatusEnum
} from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

type SourceStatus = (typeof sourceOrderStatusEnum.enumValues)[number];

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

  for (const item of params.payload.items) {
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
      errorRows += 1;
      await db.insert(poolImportItems).values({
        id: randomUUID(),
        batchId,
        lineNumber: lineNumber || 0,
        externalOrderCode,
        sourceStatus,
        sourceInspectorAccountCode: item.sourceInspectorAccountCode ?? null,
        sourceClientCode: item.sourceClientCode ?? null,
        sourceWorkTypeCode: item.sourceWorkTypeCode ?? null,
        rawPayload: item.rawPayload ?? {},
        matchedOrderId: null,
        importAction: "failed",
        errorMessage:
          "Item invalido (campos obrigatorios ausentes/invalidos: lineNumber, externalOrderCode, sourceStatus, rawPayload, datas ISO)"
      });
      continue;
    }

    try {
      const result = await db.transaction(async (tx) => {
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

        let matchedOrderId: string;
        let importAction: "created" | "updated";
        let createdEventType: "created" | "updated";
        let previousSourceStatus: SourceStatus | null = null;
        let currentOrderStatus: (typeof orders.status.enumValues)[number] | null = null;

        if (!existing[0]) {
          matchedOrderId = randomUUID();
          importAction = "created";
          createdEventType = "created";

          const inserted = await tx
            .insert(orders)
            .values({
              id: matchedOrderId,
              externalOrderCode,
              sourceStatus,
              residentName: item.residentName ?? null,
              addressLine1: item.addressLine1 ?? null,
              addressLine2: item.addressLine2 ?? null,
              city: item.city ?? null,
              state: item.state ?? null,
              zipCode: item.zipCode ?? null,
              availableDate,
              deadlineDate,
              isRush: item.isRush ?? false,
              isVacant: item.isVacant ?? false,
              sourceImportBatchId: batchId,
              updatedAt: nowSql
            })
            .returning({ id: orders.id, status: orders.status, sourceStatus: orders.sourceStatus });

          if (!inserted[0]) {
            throw new Error("Falha ao inserir order");
          }

          currentOrderStatus = inserted[0].status;
        } else {
          matchedOrderId = existing[0].id;
          importAction = "updated";
          createdEventType = "updated";
          previousSourceStatus = existing[0].sourceStatus;
          currentOrderStatus = existing[0].status;

          await tx
            .update(orders)
            .set({
              sourceStatus,
              residentName: item.residentName ?? null,
              addressLine1: item.addressLine1 ?? null,
              addressLine2: item.addressLine2 ?? null,
              city: item.city ?? null,
              state: item.state ?? null,
              zipCode: item.zipCode ?? null,
              availableDate,
              deadlineDate,
              isRush: item.isRush ?? false,
              isVacant: item.isVacant ?? false,
              sourceImportBatchId: batchId,
              updatedAt: nowSql
            })
            .where(eq(orders.id, matchedOrderId));
        }

        await tx.insert(orderEvents).values({
          id: randomUUID(),
          orderId: matchedOrderId,
          eventType: createdEventType,
          fromStatus: null,
          toStatus: currentOrderStatus,
          performedByUserId: params.importedByUserId,
          metadata: {
            importBatchId: batchId,
            lineNumber,
            externalOrderCode,
            sourceStatus
          }
        });

        if (sourceStatus === "Canceled" && previousSourceStatus !== "Canceled") {
          await tx.insert(orderEvents).values({
            id: randomUUID(),
            orderId: matchedOrderId,
            eventType: "cancelled_from_source",
            fromStatus: currentOrderStatus,
            toStatus: currentOrderStatus,
            performedByUserId: params.importedByUserId,
            metadata: {
              importBatchId: batchId,
              lineNumber,
              externalOrderCode,
              previousSourceStatus,
              sourceStatus
            }
          });
        }

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
          matchedOrderId,
          importAction,
          errorMessage: null
        });

        return { importAction };
      });

      if (result.importAction === "created") insertedRows += 1;
      else updatedRows += 1;
    } catch (error) {
      errorRows += 1;

      const message = error instanceof Error ? error.message : "erro desconhecido";
      await db.insert(poolImportItems).values({
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
