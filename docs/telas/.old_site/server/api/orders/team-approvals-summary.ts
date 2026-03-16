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

async function listAdminAssistantIds(db: any, admin: { id: string; clerk_user_id: string | null }) {
  const adminCandidates = Array.from(new Set([admin.id, admin.clerk_user_id].filter(Boolean).map(String)));
  if (adminCandidates.length === 0) return [];
  const r = await db.query(`select assistant_id from public.team_assignments where admin_id::text = any($1)`, [
    adminCandidates,
  ]);
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
      return res.status(200).json({
        ok: true,
        counts: { totalOrders: 0, pendingApprovals: 0, stuckApprovals24h: 0, redoOrders: 0 },
        updated_at: new Date().toISOString(),
      });
    }

    const assistantIdFilterRaw = q.assistant_id ? String(q.assistant_id).trim() : "";
    let assistantIdFilter: string | null = null;
    if (assistantIdFilterRaw) {
      assistantIdFilter = await resolveUserId(db as any, assistantIdFilterRaw);
      if (auth.user.role === "admin" && !assistantIds.includes(assistantIdFilter)) {
        throw new HttpError(403, "Forbidden (assistant_id)");
      }
    }

    const orderWhere: string[] = ["o.archived_at is null", "o.assistant_id is not null", "o.assistant_id = any($1)"];
    const orderParams: any[] = [assistantIds];
    if (assistantIdFilter) {
      orderParams.push(assistantIdFilter);
      orderWhere.push(`o.assistant_id = $${orderParams.length}`);
    }
    const orderWhereSql = `where ${orderWhere.join(" and ")}`;

    const totalRes = await db.query(
      `select count(*)::int as total from public.orders o ${orderWhereSql}`,
      orderParams,
    );
    const totalOrders = Number(totalRes.rows?.[0]?.total ?? 0) || 0;

    const approvalsWhere = [
      ...orderWhere,
      "o.app_status = 'submitted'",
      "coalesce(o.followup_suspected, false) = false",
    ];
    const approvalsWhereSql = `where ${approvalsWhere.join(" and ")}`;

    const approvalsRes = await db.query(
      `
        select
          count(*)::int as pending,
          sum(
            case
              when coalesce(o.submitted_at, o.updated_at, o.created_at) < (now() - interval '24 hours')
              then 1 else 0
            end
          )::int as stuck_24h
        from public.orders o
        ${approvalsWhereSql}
      `,
      orderParams,
    );
    const pendingApprovals = Number(approvalsRes.rows?.[0]?.pending ?? 0) || 0;
    const stuckApprovals24h = Number(approvalsRes.rows?.[0]?.stuck_24h ?? 0) || 0;

    const warnings: string[] = [];
    const canLoadRequests = await hasTable(db as any, "requests");
    if (!canLoadRequests) warnings.push("missingTable:requests");

    let redoOrders = 0;
    if (canLoadRequests) {
      const redoParams: any[] = [assistantIds, ["open", "in_review"]];
      const redoWhere: string[] = [
        `r.type = 'other'`,
        `(r.payload->>'req') = 'order_followup'`,
        `(r.payload->>'kind') = 'correction'`,
        `(r.payload->>'status') = any($2)`,
        "o.archived_at is null",
        "o.assistant_id is not null",
        "o.assistant_id = any($1)",
      ];
      if (assistantIdFilter) {
        redoParams.push(assistantIdFilter);
        redoWhere.push(`o.assistant_id = $${redoParams.length}`);
      }

      const redoRes = await db.query(
        `
          select count(distinct (r.payload->>'order_id'))::int as correction
          from public.requests r
          join public.orders o
            on o.id::text = (r.payload->>'order_id')::text
          where ${redoWhere.join(" and ")}
        `,
        redoParams,
      );
      redoOrders = Number(redoRes.rows?.[0]?.correction ?? 0) || 0;
    }

    return res.status(200).json({
      ok: true,
      counts: {
        totalOrders,
        pendingApprovals,
        stuckApprovals24h,
        redoOrders,
      },
      updated_at: new Date().toISOString(),
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
