import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { resolveUserId } from "../../_lib/users.js";
import { hasColumn, hasTable } from "../../_lib/schema.js";

export const config = { runtime: "nodejs" };

function toStringArray(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

type TeamApprovalOrder = {
  id: string;
  external_id: string | null;
  status: string;
  pool_status: string | null;
  work_type: string | null;
  category: string | null;
  client_code: string | null;
  owner_name: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  assistant_id: string | null;
  inspector_id: string | null;
  inspector_code: string | null;
  due_date: string | null;
  execution_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  audit_flag: boolean | null;
  audit_reason: string | null;
  inspectors?: { id: string; name: string; code: string } | null;
  profiles?: { full_name: string } | null;
};

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

    const adminAllowedAssistantIds = auth.user.role === "admin" ? await listAdminAssistantIds(db as any, auth.user) : [];

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
      return res.status(200).json({ ok: true, orders: [], followupCounts: { correction: 0 } });
    }

    const assistantIdFilterRaw = q.assistant_id ? String(q.assistant_id).trim() : "";
    let assistantIdFilter: string | null = null;
    if (assistantIdFilterRaw) {
      assistantIdFilter = await resolveUserId(db as any, assistantIdFilterRaw);
      if (auth.user.role === "admin" && !assistantIds.includes(assistantIdFilter)) {
        throw new HttpError(403, "Forbidden (assistant_id)");
      }
    }

    const includeAddress2 = await hasColumn(db as any, "orders", "address2");
    const includeInspectorCode = await hasColumn(db as any, "orders", "inspector_code");
    const inspectorsTable = (await hasTable(db as any, "inspectors_directory")) ? "inspectors_directory" : "inspectors";

    const maxLimit = 2000;
    const defaultLimit = 500;
    const limitRaw = Number(q.limit ?? defaultLimit);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), maxLimit)
      : defaultLimit;

    const address2Select = includeAddress2 ? "o.address2" : "null::text as address2";
    const inspectorCodeSelect = includeInspectorCode ? "o.inspector_code" : "null::text as inspector_code";

    const where: string[] = [
      "o.archived_at is null",
      "o.assistant_id is not null",
      "o.assistant_id = any($1)",
      "o.app_status = 'submitted'",
      "coalesce(o.followup_suspected, false) = false",
    ];
    const params: any[] = [assistantIds];
    if (assistantIdFilter) {
      params.push(assistantIdFilter);
      where.push(`o.assistant_id = $${params.length}`);
    }
    const whereSql = `where ${where.join(" and ")}`;

    const inspectorJoinByCode = includeInspectorCode
      ? `left join public.${inspectorsTable} i_code on i_code.code = o.inspector_code`
      : `left join public.${inspectorsTable} i_code on false`;

    const sql = `
      select
        o.id,
        o.external_id,
        o.app_status,
        o.pool_status,
        o.otype,
        wt.category as category,
        o.client_code,
        o.owner_name,
        o.address1,
        ${address2Select},
        o.city,
        o.state,
        o.zip,
        o.assistant_id,
        u.full_name as assistant_name,
        o.inspector_id,
        ${inspectorCodeSelect},
        i_id.id as inspector_id_by_id,
        i_id.name as inspector_name_by_id,
        i_id.code as inspector_code_by_id,
        i_code.id as inspector_id_by_code,
        i_code.name as inspector_name_by_code,
        i_code.code as inspector_code_by_code,
        o.hold_until,
        o.submitted_at,
        o.closed_at,
        o.created_at,
        o.updated_at,
        o.followup_suspected,
        o.followup_suspected_reason
      from public.orders o
      left join public.work_types wt
        on upper(coalesce(o.otype, '')) = upper(coalesce(wt.code, ''))
        and coalesce(wt.active, true) = true
      left join public.users u
        on u.id = o.assistant_id
      left join public.${inspectorsTable} i_id
        on i_id.id = o.inspector_id
      ${inspectorJoinByCode}
      ${whereSql}
      order by o.updated_at desc nulls last, o.id desc
      limit ${limit}
    `;

    const r = await db.query(sql, params);
    const rows = (r.rows ?? []) as any[];

    const ordersRaw: TeamApprovalOrder[] = rows.map((o: any) => {
      const auditFlag = (o.followup_suspected ?? null) as boolean | null;
      const status = mapAppStatusToLegacyStatus(o.app_status, auditFlag);

      const inspector =
        o.inspector_id_by_id
          ? { id: String(o.inspector_id_by_id), name: String(o.inspector_name_by_id ?? ""), code: String(o.inspector_code_by_id ?? "") }
          : o.inspector_id_by_code
            ? { id: String(o.inspector_id_by_code), name: String(o.inspector_name_by_code ?? ""), code: String(o.inspector_code_by_code ?? "") }
            : null;

      const inspectorCode = (o.inspector_code ?? null) as string | null;
      const inspectorCodeFinal = inspectorCode ?? (inspector?.code ? String(inspector.code) : null);

      return {
        id: String(o.id),
        external_id: o.external_id ?? null,
        status,
        pool_status: o.pool_status ?? null,
        work_type: o.otype ?? null,
        category: o.category ?? null,
        client_code: o.client_code ?? null,
        owner_name: o.owner_name ?? null,
        address1: o.address1 ?? null,
        address2: o.address2 ?? null,
        city: o.city ?? null,
        state: o.state ?? null,
        zip: o.zip ?? null,
        assistant_id: o.assistant_id ?? null,
        inspector_id: o.inspector_id ?? null,
        inspector_code: inspectorCodeFinal,
        due_date: o.hold_until ?? null,
        execution_date: o.submitted_at ?? o.closed_at ?? null,
        created_at: o.created_at ?? null,
        updated_at: o.updated_at ?? null,
        audit_flag: auditFlag,
        audit_reason: o.followup_suspected_reason ?? null,
        inspectors: inspector,
        profiles: o.assistant_id ? { full_name: o.assistant_name || "Desconhecido" } : null,
      };
    });

    const orderIds = ordersRaw.map((o) => o.id);
    let correctionIds = new Set<string>();
    if (orderIds.length > 0) {
      const followupsSql = `
        select distinct (r.payload->>'order_id') as order_id
        from public.requests r
        where r.type = 'other'
          and (r.payload->>'req') = 'order_followup'
          and (r.payload->>'kind') = 'correction'
          and (r.payload->>'status') = any($1)
          and (r.payload->>'order_id') = any($2)
      `;
      const followupsRes = await db.query(followupsSql, [["open", "in_review"], orderIds]);
      correctionIds = new Set((followupsRes.rows ?? []).map((row: any) => String(row.order_id)).filter(Boolean));
    }

    const orders = ordersRaw.filter((o) => !correctionIds.has(o.id));

    const warnings: string[] = [];
    if (rows.length >= limit && limit === maxLimit) warnings.push("truncated");
    if (!includeInspectorCode) warnings.push("missingColumn:orders.inspector_code");
    if (!includeAddress2) warnings.push("missingColumn:orders.address2");

    return res.status(200).json({
      ok: true,
      assistantIds,
      orders,
      followupCounts: { correction: correctionIds.size },
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
