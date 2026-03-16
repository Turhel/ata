import { inArray, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { orders, routeCandidates, routeSourceBatches } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";
import { buildNormalizedAddress } from "./address-normalization.js";
import { parseRouteSourceXlsxBuffer } from "./parse-route-source-xlsx.js";

export type CreateRouteSourceBatchResult = {
  ok: true;
  batchId: string;
  routeDate: string;
  fileName: string;
  totalRows: number;
  inspectorAccountCodes: string[];
};

function hashBufferSha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function createRouteSourceBatchFromXlsx(params: {
  databaseUrl: string;
  uploadedByUserId: string;
  routeDate: string; // YYYY-MM-DD
  fileName: string;
  buffer: Buffer;
}): Promise<CreateRouteSourceBatchResult> {
  const { db } = getDb(params.databaseUrl);

  const parsedCandidates = parseRouteSourceXlsxBuffer({ buffer: params.buffer });
  const candidates = parsedCandidates.filter((candidate) => {
    return typeof candidate.externalOrderCode === "string" && candidate.externalOrderCode.trim().length > 0;
  });

  const externalCodes = Array.from(
    new Set(
      candidates
        .map((c) => c.externalOrderCode)
        .filter((value) => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim())
    )
  );

  const existingOrders =
    externalCodes.length > 0
      ? await db
          .select({ id: orders.id, externalOrderCode: orders.externalOrderCode })
          .from(orders)
          .where(inArray(orders.externalOrderCode, externalCodes))
      : [];

  const orderIdByExternalCode = new Map<string, string>();
  for (const row of existingOrders) {
    orderIdByExternalCode.set(row.externalOrderCode, row.id);
  }

  const inspectorAccountCodes = Array.from(
    new Set(
      candidates
        .map((c) => c.sourceInspectorAccountCode?.trim() || null)
        .filter((value): value is string => !!value)
    )
  ).sort();

  const batchId = randomUUID();
  const fileHash = hashBufferSha256(params.buffer);

  await db.transaction(async (tx) => {
    await tx.insert(routeSourceBatches).values({
      id: batchId,
      routeDate: params.routeDate,
      fileName: params.fileName,
      fileHash,
      uploadedByUserId: params.uploadedByUserId,
      updatedAt: sql`now()`
    });

    if (candidates.length === 0) return;

    await tx.insert(routeCandidates).values(
      candidates.map((c) => ({
        ...buildNormalizedAddress({
          addressLine1: c.addressLine1,
          city: c.city,
          state: c.state,
          zipCode: c.zipCode
        }),
        id: randomUUID(),
        sourceBatchId: batchId,
        lineNumber: c.lineNumber,
        externalOrderCode: c.externalOrderCode,
        sourceStatus: c.sourceStatus,
        sourceInspectorAccountCode: c.sourceInspectorAccountCode,
        sourceClientCode: c.sourceClientCode,
        sourceWorkTypeCode: c.sourceWorkTypeCode,
        residentName: c.residentName,
        addressLine1: c.addressLine1,
        addressLine2: c.addressLine2,
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        geocodeStatus: "pending",
        geocodeReviewRequired: false,
        dueDate: c.dueDate,
        startDate: c.startDate,
        hasWindow: c.hasWindow,
        isRush: c.isRush,
        isFollowUp: c.isFollowUp,
        isVacant: c.isVacant,
        rawPayload: c.rawPayload,
        orderId: orderIdByExternalCode.get(c.externalOrderCode) ?? null,
        updatedAt: sql`now()`
      }))
    );
  });

  return {
    ok: true,
    batchId,
    routeDate: params.routeDate,
    fileName: params.fileName,
    totalRows: candidates.length,
    inspectorAccountCodes
  };
}
