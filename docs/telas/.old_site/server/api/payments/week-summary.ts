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

function assertDateLike(name: string, v: any) {
  const s = String(v ?? "").trim();
  if (!s) throw new HttpError(400, `${name} is required`);
  const ts = Date.parse(s);
  if (!Number.isFinite(ts)) throw new HttpError(400, `${name} must be a valid date`);
  return s;
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

function mapAppStatusToLegacyStatus(appStatus: string, auditFlag: boolean | null): string {
  if (auditFlag) return "enviada";
  switch (String(appStatus || "").toLowerCase()) {
    case "available":
      return "pendente";
    case "scheduled":
      return "agendada";
    case "submitted":
      return "enviada";
    case "followup":
      return "enviada";
    case "closed":
      return "aprovada";
    case "canceled":
      return "cancelada";
    default:
      return appStatus;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["admin", "master"] });

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const db = getPool();
    const q = req.query ?? {};

    const createdFrom = assertDateLike("created_from", q.created_from ?? q.from);
    const createdTo = assertDateLike("created_to", q.created_to ?? q.to);

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
      return res.status(200).json({ ok: true, approvedOrders: [], blockers: [] });
    }

    const statuses = ["closed", "submitted", "followup"];

    const maxLimit = 5000;
    const limitRaw = Number(q.limit ?? maxLimit);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), maxLimit) : maxLimit;

    const sql = `
      select
        o.id,
        o.assistant_id,
        o.external_id,
        o.app_status,
        o.otype,
        wt.category as category,
        coalesce(wt.assistant_value, 0) as assistant_value,
        o.created_at,
        o.followup_suspected,
        o.followup_suspected_reason
      from public.orders o
      left join public.work_types wt
        on upper(coalesce(o.otype, '')) = upper(coalesce(wt.code, ''))
        and coalesce(wt.active, true) = true
      where o.archived_at is null
        and o.assistant_id = any($1)
        and o.app_status = any($2)
        and o.created_at >= $3
        and o.created_at <= $4
      order by o.created_at desc nulls last, o.id desc
      limit ${limit}
    `;
    const r = await db.query(sql, [assistantIds, statuses, createdFrom, createdTo]);
    const rows = (r.rows ?? []) as any[];

    const approvedOrders: any[] = [];
    const blockers: any[] = [];
    rows.forEach((o: any) => {
      const auditFlag = (o.followup_suspected ?? null) as boolean | null;
      const base = {
        id: String(o.id),
        assistant_id: o.assistant_id ?? null,
        external_id: o.external_id ?? null,
        status: mapAppStatusToLegacyStatus(o.app_status, auditFlag),
      };
      if (String(o.app_status) === "closed") {
        approvedOrders.push({
          ...base,
          work_type: o.otype ?? null,
          category: o.category ?? null,
          created_at: o.created_at ?? null,
          amount: Number(o.assistant_value ?? 0) || 0,
          audit_flag: auditFlag,
          audit_reason: o.followup_suspected_reason ?? null,
        });
      } else {
        blockers.push(base);
      }
    });

    const warnings: string[] = [];
    if (rows.length >= limit && limit === maxLimit) warnings.push("truncated");

    return res.status(200).json({
      ok: true,
      assistantIds,
      range: { created_from: createdFrom, created_to: createdTo },
      approvedOrders,
      blockers,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
