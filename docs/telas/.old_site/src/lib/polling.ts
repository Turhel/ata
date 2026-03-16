export const DEFAULT_POLLING_VISIBLE_MS = 5 * 60_000; // 5 minutes
export const DEFAULT_POLLING_HIDDEN_MS = 30 * 60_000; // 30 minutes

export function getPollingIntervalMs(opts?: { visibleMs?: number; hiddenMs?: number }) {
  const visibleMs = opts?.visibleMs ?? DEFAULT_POLLING_VISIBLE_MS;
  const hiddenMs = opts?.hiddenMs ?? DEFAULT_POLLING_HIDDEN_MS;

  if (typeof document === 'undefined') return visibleMs;
  return document.hidden ? hiddenMs : visibleMs;
}
