import { readCache, writeCache } from "@/lib/cache";

export type InspectorRouteNote = {
  id: string;
  assistant_id: string; // Clerk user id
  inspector_id: string;
  inspector_code: string | null;
  report_date: string; // YYYY-MM-DD
  stop_point: string | null;
  skipped_points: string | null;
  skipped_reason: string | null;
  skipped_entries?: { point: string; reason: string }[] | null;
  created_at: string; // ISO string
};

const ROUTE_NOTES_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function cacheKey(assistantId: string, reportDate: string) {
  return `inspector_route_notes:v1:${assistantId}:${reportDate}`;
}

export function loadInspectorRouteNotes(assistantId: string, reportDate: string): InspectorRouteNote[] {
  if (!assistantId || !reportDate) return [];
  const key = cacheKey(assistantId, reportDate);
  const notes = readCache<InspectorRouteNote[]>(key, ROUTE_NOTES_MAX_AGE_MS);
  return Array.isArray(notes) ? notes : [];
}

export function upsertInspectorRouteNote(input: {
  assistantId: string;
  reportDate: string;
  inspectorId: string;
  inspectorCode?: string | null;
  stopPoint?: string | null;
  skippedPoints?: string | null;
  skippedReason?: string | null;
  skippedEntries?: { point: string; reason: string }[] | null;
}): InspectorRouteNote | null {
  const assistantId = String(input.assistantId || "").trim();
  const reportDate = String(input.reportDate || "").trim();
  const inspectorId = String(input.inspectorId || "").trim();
  if (!assistantId || !reportDate || !inspectorId) return null;

  const existing = loadInspectorRouteNotes(assistantId, reportDate);
  const nowIso = new Date().toISOString();

  const normalizedSkippedEntries =
    input.skippedEntries && Array.isArray(input.skippedEntries)
      ? input.skippedEntries
          .map((e) => ({
            point: String(e?.point ?? "").trim(),
            reason: String(e?.reason ?? "").trim(),
          }))
          .filter((e) => e.point && e.reason)
      : null;

  const skippedPoints =
    normalizedSkippedEntries && normalizedSkippedEntries.length
      ? normalizedSkippedEntries.map((e) => e.point).join(", ")
      : input.skippedPoints ?? null;

  const skippedReason =
    normalizedSkippedEntries && normalizedSkippedEntries.length
      ? normalizedSkippedEntries.map((e) => `${e.point} | ${e.reason}`).join("\n")
      : input.skippedReason ?? null;

  const next: InspectorRouteNote = {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}_${Math.random()}`,
    assistant_id: assistantId,
    inspector_id: inspectorId,
    inspector_code: input.inspectorCode ?? null,
    report_date: reportDate,
    stop_point: input.stopPoint ?? null,
    skipped_points: skippedPoints,
    skipped_reason: skippedReason,
    skipped_entries: normalizedSkippedEntries,
    created_at: nowIso,
  };

  // Keep at most one note per inspector per date (best for report generation).
  const replaced = existing.some((n) => String(n?.inspector_id ?? "") === inspectorId);
  const merged = replaced
    ? existing.map((n) => (String(n?.inspector_id ?? "") === inspectorId ? next : n))
    : [...existing, next];

  // Avoid localStorage bloat (defensive): keep last 20 notes by created_at.
  const capped = merged
    .slice()
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, 20);

  writeCache(cacheKey(assistantId, reportDate), capped);
  return next;
}
