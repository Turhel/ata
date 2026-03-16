type CacheEntry<T> = {
  ts: number;
  value: T;
};

export function readCache<T>(key: string, maxAgeMs: number): T | null {
  try {
    // NOTE: This helper is synchronous. IndexedDB is async, so it must not be used here.
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > maxAgeMs) return null;
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T) {
  try {
    const entry: CacheEntry<T> = { ts: Date.now(), value };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore cache write errors (quota, privacy, etc.)
  }
}

export function clearCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore cache clear errors
  }
}

export function clearAllCache(): void {
  try {
    localStorage.clear();
  } catch {
    // ignore cache clear errors
  }
}

export function clearCacheByPrefix(prefix: string): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore cache clear errors
  }
}
