import * as XLSX from "xlsx";
import { normalizeHeader, parseDate, readCell, parseSourceStatus, parseBooleanish, toNullableString } from "@ata-portal/shared";
type SourceOrderStatus = "Assigned" | "Received" | "Canceled";

export type RouteSourceCandidateNormalized = {
  lineNumber: number;
  externalOrderCode: string;
  sourceStatus: SourceOrderStatus;
  sourceInspectorAccountCode: string | null;
  sourceClientCode: string | null;
  sourceWorkTypeCode: string | null;
  residentName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  dueDate: string | null;
  startDate: string | null;
  hasWindow: boolean;
  isRush: boolean;
  isFollowUp: boolean;
  isVacant: boolean;
  rawPayload: unknown;
};

export function parseRouteSourceXlsxBuffer(params: {
  buffer: Buffer;
}): RouteSourceCandidateNormalized[] {
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

  return rows.map((row, index) => ({
    lineNumber: index + 2,
    externalOrderCode: String(readCell(row, "WORDER") ?? "").trim(),
    sourceStatus: parseSourceStatus(readCell(row, "STATUS")),
    residentName: toNullableString(readCell(row, "NAME")),
    addressLine1: toNullableString(readCell(row, "ADDRESS1")),
    addressLine2: toNullableString(readCell(row, "ADDRESS2")),
    city: toNullableString(readCell(row, "CITY")),
    state: toNullableString(readCell(row, "STATE")),
    zipCode: toNullableString(readCell(row, "ZIP")),
    dueDate: parseDate(readCell(row, "DUEDATE")),
    startDate: parseDate(readCell(row, "START DATE")),
    hasWindow: parseBooleanish(readCell(row, "WINDOW")),
    isRush: parseBooleanish(readCell(row, "RUSH")),
    isFollowUp: parseBooleanish(readCell(row, "FOLLOWUP")),
    isVacant: parseBooleanish(readCell(row, "VACANT")),
    sourceInspectorAccountCode: toNullableString(readCell(row, "INSPECTOR")),
    sourceClientCode: toNullableString(readCell(row, "CLIENT")),
    sourceWorkTypeCode: toNullableString(readCell(row, "OTYPE")),
    rawPayload: row
  }));
}
