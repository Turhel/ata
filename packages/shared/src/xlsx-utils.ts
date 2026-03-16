import * as XLSX from "xlsx";

export function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function readCell(row: Record<string, unknown>, ...headers: string[]) {
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    for (const [key, value] of Object.entries(row)) {
      if (normalizeHeader(key) === normalized) return value;
    }
  }
  return null;
}

export function parseNumber(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const normalized = String(value).trim();
  if (!normalized) return null;

  const normalizedDecimal = normalized.replace(",", ".");
  const parsed = Number(normalizedDecimal);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function parseDate(value: unknown) {
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

export function parseSourceStatus(value: unknown): "Assigned" | "Received" | "Canceled" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "received") return "Received";
  if (normalized === "canceled" || normalized === "cancelled") return "Canceled";
  return "Assigned";
}

export function parseBooleanish(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "yes", "y", "sim", "s", "x"].includes(normalized);
}

export function toNullableString(value: unknown) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}
