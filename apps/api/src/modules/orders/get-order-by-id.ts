import { eq } from "drizzle-orm";
import { orders, poolImportBatches } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

export async function getOrderById(params: { databaseUrl: string; orderId: string }) {
  const { db } = getDb(params.databaseUrl);

  const rows = await db
    .select({
      order: {
        id: orders.id,
        externalOrderCode: orders.externalOrderCode,
        sourceStatus: orders.sourceStatus,
        status: orders.status,
        clientId: orders.clientId,
        residentName: orders.residentName,
        addressLine1: orders.addressLine1,
        addressLine2: orders.addressLine2,
        city: orders.city,
        state: orders.state,
        zipCode: orders.zipCode,
        workTypeId: orders.workTypeId,
        inspectorAccountId: orders.inspectorAccountId,
        assignedInspectorId: orders.assignedInspectorId,
        assistantUserId: orders.assistantUserId,
        sourceImportBatchId: orders.sourceImportBatchId,
        availableDate: orders.availableDate,
        deadlineDate: orders.deadlineDate,
        isRush: orders.isRush,
        isVacant: orders.isVacant,
        claimedAt: orders.claimedAt,
        submittedAt: orders.submittedAt,
        approvedAt: orders.approvedAt,
        rejectedAt: orders.rejectedAt,
        followUpAt: orders.followUpAt,
        returnedToPoolAt: orders.returnedToPoolAt,
        batchedAt: orders.batchedAt,
        paidAt: orders.paidAt,
        cancelledAt: orders.cancelledAt,
        completedAt: orders.completedAt,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt
      },
      importBatch: {
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
      }
    })
    .from(orders)
    .leftJoin(poolImportBatches, eq(orders.sourceImportBatchId, poolImportBatches.id))
    .where(eq(orders.id, params.orderId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    order: row.order,
    importBatch: row.importBatch && row.importBatch.id ? row.importBatch : null
  };
}
