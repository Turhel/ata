// src/lib/apiClient.ts
import { isFrozen, waitUntilActive } from "./freeze";

const inflight = new Map<string, Promise<unknown>>();
const tokenCache = new WeakMap<Function, { token: string; softExpiresAt: number; hardExpiresAt: number }>();
const tokenInflight = new WeakMap<Function, Promise<string | null>>();
const tokenBackoff = new WeakMap<Function, { until: number; stepMs: number }>();

function decodeBase64Url(base64Url: string): Uint8Array | null {
  try {
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (base64.length % 4)) % 4);
    const normalized = `${base64}${pad}`;

    if (typeof globalThis.atob !== "function") return null;
    const binary = globalThis.atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function readJwtExpMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadBytes = decodeBase64Url(parts[1]);
    if (!payloadBytes) return null;
    const payloadText = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadText) as { exp?: unknown } | null;
    const exp = payload && typeof payload.exp === "number" ? payload.exp : null;
    return exp ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function tokenExpiryMs(token: string): { soft: number; hard: number } {
  const now = Date.now();
  const expMs = readJwtExpMs(token);
  if (!expMs) return { soft: now + 30_000, hard: now + 30_000 };

  // Refresh a little before exp, but keep a tiny floor to avoid thundering herds.
  const soft = Math.max(now + 5_000, expMs - 30_000);
  const hard = Math.max(now + 1_000, expMs - 2_000);
  return { soft, hard };
}

function invalidateToken(getToken: Function) {
  tokenCache.delete(getToken);
  tokenInflight.delete(getToken);
  tokenBackoff.delete(getToken);
}

async function getTokenCached(getToken: () => Promise<string | null>) {
  const cached = tokenCache.get(getToken);
  const now = Date.now();
  if (cached && cached.softExpiresAt > now) return cached.token;

  const backoff = tokenBackoff.get(getToken);
  const inBackoff = !!(backoff && backoff.until > now);
  if (cached && cached.hardExpiresAt > now && inBackoff) return cached.token;

  if (inBackoff) {
    throw new Error(
      `Autenticação temporariamente indisponível (Clerk). Tente novamente em ${Math.ceil(
        ((backoff!.until as number) - now) / 1000,
      )}s.`,
    );
  }

  const inflightPromise = tokenInflight.get(getToken);
  if (inflightPromise) return inflightPromise;

  const p = (async () => {
    try {
      const token = await getToken().catch((err) => {
        const prev = tokenBackoff.get(getToken);
        const nextStepMs = Math.min(120_000, prev ? Math.max(10_000, prev.stepMs * 2) : 10_000);
        tokenBackoff.set(getToken, { until: Date.now() + nextStepMs, stepMs: nextStepMs });
        throw err;
      });
      if (!token) return null;
      const exp = tokenExpiryMs(token);
      tokenCache.set(getToken, { token, softExpiresAt: exp.soft, hardExpiresAt: exp.hard });
      tokenBackoff.delete(getToken);
      return token;
    } finally {
      tokenInflight.delete(getToken);
    }
  })();

  tokenInflight.set(getToken, p);
  return p;
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(
  auth: { getToken: () => Promise<string | null> },
  path: string,
  init: RequestInit & { bypassFreeze?: boolean; allowWhenHidden?: boolean } = {}
): Promise<T> {
  const method = String(init.method ?? "GET").toUpperCase();
  const { bypassFreeze: bypassFreezeRaw, allowWhenHidden: allowWhenHiddenRaw, ...fetchInit } = init as any;
  const bypassFreeze = !!bypassFreezeRaw;
  const allowWhenHidden = !!allowWhenHiddenRaw;

  if (!allowWhenHidden && typeof document !== "undefined" && (document.hidden || !document.hasFocus?.())) {
    await waitUntilActive({ signal: init.signal });
  }
  if (!bypassFreeze && (method === "GET" || method === "HEAD") && isFrozen()) {
    await waitUntilActive({ signal: init.signal });
  }

  const token = await getTokenCached(auth.getToken);

  const canDedupe =
    (method === "GET" || method === "HEAD") &&
    !fetchInit.signal;
  const key = canDedupe ? `${method} ${path} :: ${token ?? ""}` : null;

  if (key && inflight.has(key)) {
    return (await inflight.get(key)) as T;
  }

  const p = (async () => {
    const hasBody = fetchInit.body !== undefined && fetchInit.body !== null;
    const extraHeaders: Record<string, string> = {};
    if (hasBody) {
      const existingContentType =
        (fetchInit.headers instanceof Headers && fetchInit.headers.get("content-type")) ||
        (!(fetchInit.headers instanceof Headers) && (fetchInit.headers as any)?.["Content-Type"]) ||
        (!(fetchInit.headers instanceof Headers) && (fetchInit.headers as any)?.["content-type"]) ||
        null;
      if (!existingContentType) extraHeaders["Content-Type"] = "application/json";
    }

    const runFetch = async (t: string | null) =>
      fetch(path, {
        cache: fetchInit.cache ?? "no-store",
        ...fetchInit,
        headers: {
          ...(fetchInit.headers ?? {}),
          ...extraHeaders,
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
        },
      });

    let res = await runFetch(token);

    // If we used a cached token and got a 401, drop cache and retry once.
    if (res.status === 401 && token) {
      invalidateToken(auth.getToken);
      const retryToken = await getTokenCached(auth.getToken);
      if (retryToken && retryToken !== token) {
        res = await runFetch(retryToken);
      }
    }

    const data = await readJsonSafe(res);

    if (!res.ok) {
      const msg =
        (data && typeof data === "object" && "error" in (data as any) && (data as any).error) ||
        `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    return data as T;
  })();

  if (key) inflight.set(key, p as Promise<unknown>);
  try {
    return await p;
  } finally {
    if (key) inflight.delete(key);
  }
}
