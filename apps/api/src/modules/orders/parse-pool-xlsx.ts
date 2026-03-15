import * as XLSX from "xlsx";
import type { PoolImportNormalizedItem, PoolImportNormalizedPayload } from "./import-pool-json.js";

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function readCell(row: Record<string, unknown>, ...headers: string[]) {
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    for (const [key, value] of Object.entries(row)) {
      if (normalizeHeader(key) === normalized) return value;
    }
  }
  return null;
}

function parseSourceStatus(value: unknown): "Assigned" | "Received" | "Canceled" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "received") return "Received";
  if (normalized === "canceled" || normalized === "cancelled") return "Canceled";
  return "Assigned";
}

function parseBooleanish(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "yes", "y", "sim", "s", "x"].includes(normalized);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseExcelDate(value: unknown) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatDate(value);

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return formatDate(new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)));
  }

  const stringValue = String(value).trim();
  if (!stringValue) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) return stringValue;

  const slashMatch = stringValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const [, monthRaw, dayRaw, yearRaw] = slashMatch;
    const year = yearRaw.length === 2 ? Number(`20${yearRaw}`) : Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    if (year > 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return formatDate(new Date(Date.UTC(year, month - 1, day)));
    }
  }

  const parsed = new Date(stringValue);
  return Number.isNaN(parsed.getTime()) ? null : formatDate(parsed);
}

function toNullableString(value: unknown) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

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
    availableDate: parseExcelDate(readCell(row, "START DATE")),
    deadlineDate: parseExcelDate(readCell(row, "DUEDATE")),
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
