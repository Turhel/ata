import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../../_lib/db.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

function toStringArray(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    if (req.method === "GET") {
      const q = req.query ?? {};
      const ids = toStringArray(q.ids ?? q.id);
      const periodStart = q.period_start ? String(q.period_start) : null;
      const periodEnd = q.period_end ? String(q.period_end) : null;
      const updatedSince = q.updated_since ?? q.updatedSince;

      const where: string[] = [];
      const params: any[] = [];
      const add = (cond: string, value: any) => {
        params.push(value);
        where.push(cond.replace("$$", `$${params.length}`));
      };

      // user: só pode ver batches que contenham itens dele
      if (auth.user.role === "user") {
        const assistantTextIds = auth.clerkUserId ? [auth.user.id, auth.clerkUserId] : [auth.user.id];
        params.push(assistantTextIds);
        where.push(
          `b.id::text in (
            select distinct batch_id::text
            from public.payment_batch_items
            where assistant_id::text = any($${params.length}::text[])
          )`
        );
      }

      if (ids.length) {
        params.push(ids);
        where.push(`b.id::text = any($${params.length}::text[])`);
      }
      if (periodStart) add("b.period_start = $$::date", periodStart);
      if (periodEnd) add("b.period_end = $$::date", periodEnd);
      if (updatedSince) add("b.created_at > $$::timestamptz", String(updatedSince));

      const whereSql = where.length ? `where ${where.join(" and ")}` : "";
      const sql = `
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
        ${whereSql}
        order by b.created_at desc
      `;
      try {
        const r = await db.query(sql, params);
        return res.status(200).json({ ok: true, batches: r.rows ?? [] });
      } catch (e: any) {
        // Compat: algumas instâncias podem não ter as tabelas de pagamentos ainda.
        // Mantemos a tela funcional retornando lista vazia.
        if (e?.code === "42P01") {
          return res.status(200).json({ ok: true, batches: [] });
        }
        throw e;
      }
    }

    if (req.method === "POST") {
      if (auth.user.role !== "admin" && auth.user.role !== "master") {
        throw new HttpError(403, "Forbidden");
      }

      const body = parseBody(req);
      if (!body.period_start || !body.period_end) {
        throw new HttpError(400, "period_start and period_end are required");
      }
      const sql = `
        insert into public.payment_batches
          (period_start, period_end, status, total_value, created_by, created_at)
        values
          ($1, $2, $3, $4, $5, now())
        returning id
      `;
      let ins: any;
      try {
        ins = await db.query(sql, [
          String(body.period_start),
          String(body.period_end),
          String(body.status ?? "processing"),
          Number(body.total_value ?? 0),
          auth.user.id,
        ]);
      } catch (e: any) {
        if (e?.code === "42P01") {
          throw new HttpError(503, "Payments unavailable (missing table)");
        }
        throw e;
      }
      const id = ins.rows?.[0]?.id ?? null;
      if (!id) throw new HttpError(500, "Failed to create batch");
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
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
