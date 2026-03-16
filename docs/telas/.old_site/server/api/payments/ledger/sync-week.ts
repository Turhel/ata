import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { getPool } from "../../../_lib/db.js";
import { hasColumn } from "../../../_lib/schema.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";
import { getTurso, nowIso } from "./_lib.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["admin", "master"] });

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = parseBody(req);
    const weekStart = body.week_start
      ? String(body.week_start)
      : body.period_start
        ? String(body.period_start)
        : null;
    const weekEnd = body.week_end
      ? String(body.week_end)
      : body.period_end
        ? String(body.period_end)
        : null;
    if (!weekStart || !weekEnd) throw new HttpError(400, "week_start/week_end (or period_start/period_end) are required");

    const archive = body.archive === undefined ? true : !!body.archive;

    const turso = getTurso();
    const supa = getPool();

    // Ensure batch exists (by week)
    const existing = await turso.execute({
      sql: `select id, status from payment_batches where week_start = ? and week_end = ? limit 1`,
      args: [weekStart, weekEnd],
    });
    const existingRow: any = existing.rows?.[0] ?? null;
    const batchId = existingRow?.id ? String(existingRow.id) : randomUUID();
    const status = existingRow?.status ? String(existingRow.status) : "partial";
    if (status === "closed" || status === "paid") {
      throw new HttpError(409, `Batch is ${status} and cannot be modified`);
    }

    if (!existingRow) {
      await turso.execute({
        sql: `
          insert into payment_batches (id, week_start, week_end, status, created_at, notes)
          values (?, ?, ?, 'partial', ?, ?)
        `,
        args: [batchId, weekStart, weekEnd, nowIso(), `synced_by=${auth.user.id}`],
      });
    }

    // Fetch closed orders in the week (date-based, by rule: closed_at decides the week)
    // Keep it minimal: only fields needed for snapshot.
    const r = await supa.query(
      `
        select
          o.id::text as order_id,
          o.external_id::text as external_id,
          o.otype::text as otype,
          o.client_code::text as client_code,
          o.city::text as city,
          o.state::text as state,
          o.zip::text as zip,
          o.assistant_id::text as assistant_user_id,
          o.inspector_id::text as inspector_id,
          o.closed_at::text as closed_at,
          coalesce(wt.assistant_value, 0)::float8 as assistant_value,
          coalesce(wt.inspector_value, 0)::float8 as inspector_value
        from public.orders o
        left join public.work_types wt
          on upper(wt.code) = upper(o.otype)
        where o.app_status = 'closed'
          and o.closed_at is not null
          and o.closed_at::date >= $1::date
          and o.closed_at::date <= $2::date
      `,
      [weekStart, weekEnd]
    );

    const orders = (r.rows ?? []).map((row: any) => ({
      order_id: String(row.order_id),
      external_id: String(row.external_id ?? ""),
      otype: row.otype == null ? null : String(row.otype),
      client_code: row.client_code == null ? null : String(row.client_code),
      city: row.city == null ? null : String(row.city),
      state: row.state == null ? null : String(row.state),
      zip: row.zip == null ? null : String(row.zip),
      assistant_user_id: String(row.assistant_user_id ?? ""),
      inspector_id: row.inspector_id == null ? null : String(row.inspector_id),
      closed_at: String(row.closed_at ?? ""),
      assistant_value: Number(row.assistant_value ?? 0) || 0,
      inspector_value: Number(row.inspector_value ?? 0) || 0,
    }));

    // Insert snapshots (idempotent per batch+order)
    const createdAt = nowIso();
    for (const o of orders) {
      if (!o.order_id || !o.external_id || !o.assistant_user_id || !o.closed_at) continue;
      await turso.execute({
        sql: `
          insert into payment_batch_items
            (id, batch_id, order_id, external_id, assistant_user_id, inspector_id,
             assistant_value, inspector_value, closed_at,
             otype, client_code, city, state, zip, created_at)
          values
            (?, ?, ?, ?, ?, ?,
             ?, ?, ?,
             ?, ?, ?, ?, ?, ?)
          on conflict(batch_id, order_id) do update set
            external_id = excluded.external_id,
            assistant_user_id = excluded.assistant_user_id,
            inspector_id = excluded.inspector_id,
            assistant_value = excluded.assistant_value,
            inspector_value = excluded.inspector_value,
            closed_at = excluded.closed_at,
            otype = excluded.otype,
            client_code = excluded.client_code,
            city = excluded.city,
            state = excluded.state,
            zip = excluded.zip
        `,
        args: [
          randomUUID(),
          batchId,
          o.order_id,
          o.external_id,
          o.assistant_user_id,
          o.inspector_id,
          o.assistant_value,
          o.inspector_value,
          o.closed_at,
          o.otype,
          o.client_code,
          o.city,
          o.state,
          o.zip,
          createdAt,
        ],
      });
    }

    // Option B: write pointers back to HOT orders (if columns exist)
    const hasLastBatchId = await hasColumn(supa as any, "orders", "last_payment_batch_id");
    const hasLastBatchedAt = await hasColumn(supa as any, "orders", "last_batched_at");
    const hasArchivedAt = await hasColumn(supa as any, "orders", "archived_at");

    if (hasLastBatchId || hasLastBatchedAt || (archive && hasArchivedAt)) {
      const ids = orders.map((o) => o.order_id).filter(Boolean);
      if (ids.length) {
        const set: string[] = [];
        const params: any[] = [];
        const addSet = (sql: string, value: any) => {
          params.push(value);
          set.push(sql.replace("$$", `$${params.length}`));
        };
        if (hasLastBatchId) addSet(`last_payment_batch_id = $$::text`, batchId);
        if (hasLastBatchedAt) addSet(`last_batched_at = $$::timestamptz`, nowIso());
        if (archive && hasArchivedAt) set.push(`archived_at = coalesce(archived_at, now())`);

        params.push(ids);
        await supa.query(
          `
            update public.orders
            set ${set.join(", ")}
            where id::text = any($${params.length}::text[])
          `,
          params
        );
      }
    }

    const countRes = await turso.execute({
      sql: `select count(*) as c from payment_batch_items where batch_id = ?`,
      args: [batchId],
    });
    const count = Number((countRes.rows?.[0] as any)?.c ?? 0) || 0;

    return res.status(200).json({
      ok: true,
      batch_id: batchId,
      week_start: weekStart,
      week_end: weekEnd,
      synced_orders: orders.length,
      items_in_batch: count,
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
