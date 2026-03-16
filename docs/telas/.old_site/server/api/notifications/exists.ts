import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { requireAuth } from "../../_lib/auth.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = req.query ?? {};
    const type = q.type ? String(q.type) : null;
    const fromDate = q.from ? String(q.from) : null;

    if (!type || !fromDate) {
      return res.status(400).json({ ok: false, error: "type and from are required" });
    }

    const db = getPool();
    const sql = `
      select id
      from public.notifications
      where (user_id::text = $1 or user_id::text = $2)
        and type = $3
        and created_at >= $4
      limit 1
    `;
    const r = await db.query(sql, [auth.user.id, auth.clerkUserId, type, fromDate]);
    return res.status(200).json({ ok: true, exists: (r.rows?.length ?? 0) > 0 });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

