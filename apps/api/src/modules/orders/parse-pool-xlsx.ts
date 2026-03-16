import * as XLSX from "xlsx";
import type { PoolImportNormalizedItem, PoolImportNormalizedPayload } from "./import-pool-json.js";
import { normalizeHeader, parseDate, readCell, parseSourceStatus, parseBooleanish, toNullableString } from "@ata-portal/shared";

export function parsePoolXlsxBuffer(params: {
  buffer: Buffer;
  fileName: string;
}): PoolImportNormalizedPayload {
  const workbook = XLSX.read(params.buffer, {
    type: "buffer",
    cellDates: true,
    raw: true
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Arquivo XLSX sem planilhas");
  }

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    throw new Error("Planilha principal não encontrada");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: null
  });

  const items: PoolImportNormalizedItem[] = rows.map((row, index) => ({
    lineNumber: index + 2,
    externalOrderCode: String(readCell(row, "WORDER") ?? "").trim(),
    sourceStatus: parseSourceStatus(readCell(row, "STATUS")),
    residentName: toNullableString(readCell(row, "NAME")),
    addressLine1: toNullableString(readCell(row, "ADDRESS1")),
    addressLine2: toNullableString(readCell(row, "ADDRESS2")),
    city: toNullableString(readCell(row, "CITY")),
    state: toNullableString(readCell(row, "STATE")),
    zipCode: toNullableString(readCell(row, "ZIP")),
    availableDate: parseDate(readCell(row, "START DATE")),
    deadlineDate: parseDate(readCell(row, "DUEDATE")),
    isRush: parseBooleanish(readCell(row, "RUSH")),
    isVacant: parseBooleanish(readCell(row, "VACANT")),
    sourceInspectorAccountCode: toNullableString(readCell(row, "INSPECTOR")),
    sourceClientCode: toNullableString(readCell(row, "CLIENT")),
    sourceWorkTypeCode: toNullableString(readCell(row, "OTYPE")),
    rawPayload: row
  }));

  return {
    fileName: params.fileName,
    items
  };
}
