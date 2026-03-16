import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../../_lib/db.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireAuth(req);
    const db = getPool();

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const externalId = req.query?.external_id ? String(req.query.external_id) : "";
    if (!externalId) throw new HttpError(400, "external_id is required");

    const r = await db.query(
      `
        select
          o.id,
          o.external_id,
          o.created_at,
          u.id as assistant_id,
          u.clerk_user_id as assistant_clerk_user_id,
          o.otype as work_type,
          o.app_status as status,
          u.full_name as assistant_name
        from public.orders o
        left join public.users u
          on (u.id::text = o.assistant_id::text or u.clerk_user_id = o.assistant_id::text)
        where o.external_id = $1
          and o.app_status not in ('canceled')
          and o.assistant_id is not null
        order by o.created_at desc
        limit 1
      `,
      [externalId]
    );

    const row = r.rows?.[0] ?? null;
    return res.status(200).json({ ok: true, order: row });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

