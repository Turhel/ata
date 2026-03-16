import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../../_lib/db.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";
import { resolveUserId } from "../../../_lib/users.js";

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

const SELECT_FIELDS = `
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
`;

const SELECT_JOIN = `
  from public.payment_requests pr
  left join public.users ua
    on (ua.id::text = pr.assistant_id::text or ua.clerk_user_id = pr.assistant_id::text)
  left join public.users ur
    on (ur.id::text = pr.reviewed_by::text or ur.clerk_user_id = pr.reviewed_by::text)
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    if (req.method === "GET") {
      const q = req.query ?? {};
      const assistantIdsRaw = toStringArray(q.assistant_ids ?? q.assistant_id);
      const status = q.status ? String(q.status) : null;
      const updatedSince = q.updated_since ?? q.updatedSince;

      const where: string[] = [];
      const params: any[] = [];
      const add = (cond: string, value: any) => {
        params.push(value);
        where.push(cond.replace("$$", `$${params.length}`));
      };

      if (auth.user.role === "user") {
        params.push([auth.user.id, auth.clerkUserId]);
        where.push(`pr.assistant_id::text = any($${params.length})`);
      } else if (assistantIdsRaw.length) {
        const resolved = await Promise.all(assistantIdsRaw.map((v) => resolveUserId(db as any, v)));
        const assistantTextIds = Array.from(
          new Set([...resolved, ...assistantIdsRaw.filter((v) => v.startsWith("user_"))]),
        );
        params.push(assistantTextIds);
        where.push(`pr.assistant_id::text = any($${params.length})`);
      }

      if (status) add("pr.status = $$", status);
      if (updatedSince) add("pr.updated_at > $$", String(updatedSince));

      const whereSql = where.length ? `where ${where.join(" and ")}` : "";
      const sql = `
        select ${SELECT_FIELDS}
        ${SELECT_JOIN}
        ${whereSql}
        order by pr.requested_at desc
      `;
      const r = await db.query(sql, params);
      return res.status(200).json({ ok: true, requests: r.rows ?? [] });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const periodStart = body.period_start;
      const periodEnd = body.period_end;
      if (!periodStart || !periodEnd) throw new HttpError(400, "period_start and period_end are required");

      const ins = await db.query(
        `
          insert into public.payment_requests
            (assistant_id, period_start, period_end, period_type, total_orders, total_value, category_breakdown, status, requested_at, created_at, updated_at)
          values
            ($1, $2, $3, $4, $5, $6, $7, 'pending', now(), now(), now())
          returning id
        `,
        [
          auth.user.id,
          periodStart,
          periodEnd,
          body.period_type ?? "week",
          Number(body.total_orders ?? 0),
          Number(body.total_value ?? 0),
          body.category_breakdown ?? null,
        ],
      );
      const id = ins.rows?.[0]?.id ?? null;
      if (!id) throw new HttpError(500, "Failed to create payment request");

      const r = await db.query(
        `
          select ${SELECT_FIELDS}
          ${SELECT_JOIN}
          where pr.id = $1
          limit 1
        `,
        [id],
      );
      return res.status(200).json({ ok: true, request: r.rows?.[0] ?? null });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

