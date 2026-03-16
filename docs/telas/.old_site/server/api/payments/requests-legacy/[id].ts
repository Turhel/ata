import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../../_lib/db.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";

export const config = { runtime: "nodejs" };

// LEGACY (FROZEN): kept for existing screens that still call `/api/legacy/payment-requests/:id`.

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["admin", "master"] });
    const db = getPool();

    const id = req.query?.id ? String(req.query.id) : null;
    if (!id) throw new HttpError(400, "Missing id");

    if (req.method !== "PATCH") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = parseBody(req);
    const status = body.status ?? null;
    if (!status) throw new HttpError(400, "status is required");

    const sql = `
      update public.payment_requests
      set
        status = $1,
        reviewed_at = now(),
        reviewed_by = $2,
        review_notes = $3,
        updated_at = now()
      where id = $4
    `;
    await db.query(sql, [status, auth.user.id, body.review_notes ?? null, id]);
    const r = await db.query(
      `
        select
          pr.id,
          pr.assistant_id as assistant_id_raw,
          ua.id as assistant_id,
          ua.clerk_user_id as assistant_clerk_user_id,
          pr.period_start,
          pr.period_end,
          pr.period_type,
          pr.total_orders,
          pr.total_value,
          pr.category_breakdown,
          pr.status,
          pr.requested_at,
          pr.reviewed_at,
          pr.reviewed_by as reviewed_by_raw,
          ur.id as reviewed_by,
          ur.clerk_user_id as reviewed_by_clerk_user_id,
          pr.review_notes,
          pr.created_at,
          pr.updated_at
        from public.payment_requests pr
        left join public.users ua
          on (ua.id::text = pr.assistant_id::text or ua.clerk_user_id = pr.assistant_id::text)
        left join public.users ur
          on (ur.id::text = pr.reviewed_by::text or ur.clerk_user_id = pr.reviewed_by::text)
        where pr.id = $1
        limit 1
      `,
      [id]
    );
    return res.status(200).json({ ok: true, request: r.rows?.[0] ?? null });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
