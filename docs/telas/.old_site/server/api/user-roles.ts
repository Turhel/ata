import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { resolveUserId } from "../_lib/users.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const userId = req.query?.user_id ? String(req.query.user_id) : null;
    if (!userId) {
      return res.status(400).json({ ok: false, error: "user_id is required" });
    }

    const internalId = await resolveUserId(db as any, userId);

    if (auth.user.role === "user") {
      const allowed = new Set([String(auth.user.id), String(auth.clerkUserId ?? "")].filter(Boolean));
      if (!allowed.has(String(userId)) && String(internalId) !== String(auth.user.id)) {
        return res.status(403).json({ ok: false, error: "Forbidden" });
      }
    }

    const sql = `
      select id, user_id, role, created_at
      from public.user_roles
      where user_id::text = $1 or user_id::text = $2
      limit 1
    `;
    const r = await db.query(sql, [String(internalId), String(userId)]);
    return res.status(200).json({ ok: true, role: r.rows?.[0] ?? null });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

