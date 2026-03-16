import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { resolveUserId } from "../../_lib/users.js";
import { hasTable } from "../../_lib/schema.js";

export const config = { runtime: "nodejs" };

function toStringArray(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

async function listAdminAssistantIds(db: any, admin: { id: string; clerk_user_id: string | null }) {
  const adminCandidates = Array.from(new Set([admin.id, admin.clerk_user_id].filter(Boolean).map(String)));
  if (adminCandidates.length === 0) return [];
  const r = await db.query(
    `select assistant_id from public.team_assignments where admin_id::text = any($1)`,
    [adminCandidates],
  );
  const raw = Array.from(new Set((r.rows ?? []).map((row: any) => row?.assistant_id).filter(Boolean).map(String)));
  const resolved: string[] = [];
  for (const v of raw) {
    try {
      resolved.push(await resolveUserId(db as any, String(v)));
    } catch {
      // ignore invalid/legacy ids
    }
  }
  return Array.from(new Set(resolved));
}

async function listAllAssistantIds(db: any) {
  const hasUserPersonas = await hasTable(db as any, "user_personas");
  const sql = `
    select u.id
    from public.users u
    ${hasUserPersonas ? "left join public.user_personas up on up.user_id = u.id" : ""}
    where u.active = true
      and u.role = 'user'
      ${hasUserPersonas ? "and coalesce(up.persona, '') <> 'inspector'" : ""}
    order by u.full_name
  `;
  const r = await db.query(sql);
  return (r.rows ?? []).map((row: any) => String(row.id)).filter(Boolean);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["admin", "master"] });

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const db = getPool();
    const q = req.query ?? {};

    const assistantIdsRaw = toStringArray(q.assistant_ids ?? q.assistantIds);
    if (assistantIdsRaw.length > 200) throw new HttpError(400, "assistant_ids max length is 200");

    const adminAllowedAssistantIds =
      auth.user.role === "admin" ? await listAdminAssistantIds(db as any, auth.user) : [];

    let assistantIds: string[] = [];
    if (assistantIdsRaw.length > 0) {
      assistantIds = await Promise.all(assistantIdsRaw.map((v) => resolveUserId(db as any, String(v))));
      assistantIds = Array.from(new Set(assistantIds));
      if (auth.user.role === "admin") {
        const notAllowed = assistantIds.filter((id) => !adminAllowedAssistantIds.includes(id));
        if (notAllowed.length) throw new HttpError(403, "Forbidden (assistant_ids)");
      }
    } else {
      assistantIds = auth.user.role === "admin" ? adminAllowedAssistantIds : await listAllAssistantIds(db as any);
    }

    if (assistantIds.length === 0) {
      return res.status(200).json({ ok: true, assistants: [] });
    }

    const sinceDays = clampInt(q.since_days ?? q.sinceDays ?? 90, 1, 365, 90);
    const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000).toISOString();
    const weekSince = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const sql = `
      select
        u.id as assistant_id,
        u.weekly_goal,
        max(o.created_at) as last_activity_at,
        sum(case when o.created_at >= $2 then 1 else 0 end)::int as orders_last_7_days
      from public.users u
      left join public.orders o
        on o.assistant_id::text = u.id::text
        and o.archived_at is null
        and o.created_at >= $1
      where u.id = any($3)
      group by u.id, u.weekly_goal
      order by u.id
    `;

    const r = await db.query(sql, [since, weekSince, assistantIds]);

    return res.status(200).json({
      ok: true,
      since: { since_days: sinceDays, since, week_since: weekSince },
      assistants: r.rows ?? [],
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
