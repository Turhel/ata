import { getTursoPool } from "../../../_lib/tursoDb.js";

export type LegacyBatchStatus = "processing" | "paid";

export type TursoBatchStatus = "partial" | "closed" | "paid";

export function toLegacyStatus(status: TursoBatchStatus): LegacyBatchStatus {
  return status === "paid" ? "paid" : "processing";
}

export function toTursoStatus(status: string): TursoBatchStatus {
  const s = String(status || "").trim().toLowerCase();
  if (s === "paid") return "paid";
  if (s === "closed") return "closed";
  if (s === "partial") return "partial";
  // compat: legacy
  if (s === "processing") return "partial";
  return "partial";
}

export function nowIso() {
  return new Date().toISOString();
}

export function getTurso() {
  return getTursoPool();
}

export function toStringArray(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
