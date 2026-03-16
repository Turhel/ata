import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { isUuid } from "../../_lib/users.js";

export const config = { runtime: "nodejs" };

const APP_TIMEZONE = "America/Fortaleza";

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

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const db = getPool();
    const q = req.query ?? {};

    // Default: keep parity with `/api/orders` (archived=false => archived_at is null)
    const archived = q.archived === "true" ? true : q.archived === "false" ? false : false;

    const createdFrom = q.created_from ? String(q.created_from).trim() : null;
    const createdTo = q.created_to ? String(q.created_to).trim() : null;
    const submittedFrom = q.submitted_from ? String(q.submitted_from).trim() : null;
    const submittedTo = q.submitted_to ? String(q.submitted_to).trim() : null;
    const closedFrom = q.closed_from ? String(q.closed_from).trim() : null;
    const closedTo = q.closed_to ? String(q.closed_to).trim() : null;

    const where: string[] = [];
    const params: any[] = [];
    const add = (cond: string, value: any) => {
      params.push(value);
      where.push(cond.replace("$$", `$${params.length}`));
    };

    where.push(archived ? "archived_at is not null" : "archived_at is null");

    if (auth.user.role === "user") {
      add("assistant_id = $$", auth.user.id);
    } else {
      let assistant_ids = toStringArray(q.assistant_ids);
      if (assistant_ids.length > 200) throw new HttpError(400, "assistant_ids max length is 200");
      for (const id of assistant_ids) {
        if (!isUuid(id)) throw new HttpError(400, "assistant_ids must be UUIDs (users.id)");
      }

      let assistant_id: string | null = null;
      if (q.assistant_id) {
        const raw = String(q.assistant_id).trim();
        if (!raw) throw new HttpError(400, "assistant_id cannot be empty");

        if (isUuid(raw)) {
          assistant_id = raw;
        } else {
          // compat: accept clerk_user_id
          const r = await db.query(`select id from public.users where clerk_user_id = $1`, [raw]);
          assistant_id = r.rows?.[0]?.id ?? null;
          if (!assistant_id) throw new HttpError(404, "Assistant not found");
        }
      }

      // Compat: tolerate assistant_id + assistant_ids (union)
      if (assistant_ids.length && assistant_id) {
        assistant_ids = Array.from(new Set([...assistant_ids, assistant_id]));
        assistant_id = null;
      }

      if (assistant_id) add("assistant_id = $$", assistant_id);
      if (assistant_ids.length) {
        params.push(assistant_ids);
        where.push(`assistant_id = any($${params.length})`);
      }

      const inspector_id = q.inspector_id ? String(q.inspector_id).trim() : null;
      if (inspector_id) {
        if (!isUuid(inspector_id)) throw new HttpError(400, "inspector_id must be a UUID (inspectors.id)");
        add("inspector_id = $$", inspector_id);
      }

      const otype = q.otype ? String(q.otype).trim() : q.work_type ? String(q.work_type).trim() : null;
      if (otype) add("otype = $$", otype);
    }

    if (createdFrom) add("created_at >= $$", createdFrom);
    if (createdTo) add("created_at <= $$", createdTo);
    if (submittedFrom) add("submitted_at >= $$", submittedFrom);
    if (submittedTo) add("submitted_at <= $$", submittedTo);
    if (closedFrom) add("closed_at >= $$", closedFrom);
    if (closedTo) add("closed_at <= $$", closedTo);

    const whereSql = where.length ? `where ${where.join(" and ")}` : "";
    const sql = `
      select
        count(*)::int as total,
        sum(case when app_status = 'closed' then 1 else 0 end)::int as approved,
        sum(case when app_status = 'available' then 1 else 0 end)::int as pending,
        sum(case when app_status = 'followup' then 1 else 0 end)::int as in_review,
        sum(case when app_status = 'canceled' then 1 else 0 end)::int as rejected,
        sum(case when (created_at at time zone '${APP_TIMEZONE}')::date = (now() at time zone '${APP_TIMEZONE}')::date then 1 else 0 end)::int as today
      from public.orders
      ${whereSql}
    `;

    const r = await db.query(sql, params);
    const row = r.rows?.[0] ?? {};

    return res.status(200).json({
      ok: true,
      stats: {
        today: row.today ?? 0,
        approved: row.approved ?? 0,
        pending: row.pending ?? 0,
        inReview: row.in_review ?? 0,
        rejected: row.rejected ?? 0,
        total: row.total ?? 0,
      },
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

