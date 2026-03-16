import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../../_lib/db.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";
import { resolveOptionalUserId } from "../../../_lib/users.js";

export const config = { runtime: "nodejs" };

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
    const setParts: string[] = [];
    const params: any[] = [];

    const add = (col: string, value: any) => {
      params.push(value);
      setParts.push(`${col} = $${params.length}`);
    };

    if (body.status !== undefined) add("status", body.status);
    if (body.paid_at !== undefined) add("paid_at", body.paid_at ?? null);
    if (body.paid_by !== undefined) add("paid_by", await resolveOptionalUserId(db as any, body.paid_by ?? null));
    if (body.notes !== undefined) add("notes", body.notes ?? null);

    if (setParts.length === 0) throw new HttpError(400, "No fields to update");

    params.push(id);

    const sql = `
      update public.payment_batches
      set ${setParts.join(", ")}
      where id = $${params.length}
    `;
    try {
      await db.query(sql, params);
      const r = await db.query(
        `
          select
            b.id,
            b.period_start,
            b.period_end,
            b.status,
            b.total_value,
            b.notes,
            b.created_by as created_by_raw,
            uc.id as created_by,
            uc.clerk_user_id as created_by_clerk_user_id,
            b.created_at,
            b.paid_at,
            b.paid_by as paid_by_raw,
            up.id as paid_by,
            up.clerk_user_id as paid_by_clerk_user_id
          from public.payment_batches b
          left join public.users uc
            on (uc.id::text = b.created_by::text or uc.clerk_user_id = b.created_by::text)
          left join public.users up
            on (up.id::text = b.paid_by::text or up.clerk_user_id = b.paid_by::text)
          where b.id = $1
          limit 1
        `,
        [id]
      );
      return res.status(200).json({ ok: true, batch: r.rows?.[0] ?? null });
    } catch (e: any) {
      if (e?.code === "42P01") {
        throw new HttpError(503, "Payments unavailable (missing table)");
      }
      throw e;
    }
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
