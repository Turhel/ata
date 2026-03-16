import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";

function withTimeout<T>(p: Promise<T>, ms: number) {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`Timeout ${ms}ms`)), ms)),
  ]);
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const db = getPool();
    const r = await withTimeout(db.query("select 1 as ok"), 4000);
    return res.status(200).json({ ok: true, db: r.rows?.[0]?.ok === 1 });
  } catch (e: any) {
    const msg = e?.message ?? "unknown";
    const status = msg.includes("Missing SUPABASE_DATABASE_URL") ? 500 : 500;
    return res.status(status).json({ ok: false, error: msg });
  }
}
