import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { requireAuth } from "../../_lib/auth.js";
import { hasColumn, hasTable } from "../../_lib/schema.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const db = getPool();
    const hasLastPaymentBatchId = await hasColumn(db as any, "orders", "last_payment_batch_id");
    const hasLastBatchedAt = await hasColumn(db as any, "orders", "last_batched_at");
    const hasHotBatchItems =
      !hasLastPaymentBatchId && !hasLastBatchedAt ? await hasTable(db as any, "payment_batch_items") : false;
    const assistantTextIds = auth.clerkUserId ? [auth.user.id, auth.clerkUserId] : [auth.user.id];

    const unbatchedFilter = hasLastPaymentBatchId
      ? "and o.last_payment_batch_id is null"
      : hasLastBatchedAt
        ? "and o.last_batched_at is null"
        : "";

    const sql = `
      with closed_orders as (
        select id, otype
        from public.orders o
        where o.assistant_id::text = any($1)
          and o.app_status = 'closed'
          and o.archived_at is null
          ${unbatchedFilter}
      ),
      unbatched as (
        select o.*
        from closed_orders o
        ${hasHotBatchItems ? "left join public.payment_batch_items i on i.order_id = o.id" : ""}
        ${hasHotBatchItems ? "where i.order_id is null" : ""}
      ),
      wt as (
        select upper(trim(code)) as code, assistant_value
        from public.work_types
        where active = true
      )
      select
        count(*)::int as count,
        coalesce(sum(coalesce(wt.assistant_value, 0)), 0)::numeric as total
      from unbatched u
      left join wt on wt.code = upper(trim(u.otype))
    `;

    const r = await db.query(sql, [assistantTextIds]);
    const row = r.rows?.[0] ?? { count: 0, total: 0 };

    return res.status(200).json({
      ok: true,
      count: row.count ?? 0,
      total: Number(row.total ?? 0),
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

