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

function assertOptionalDateLike(name: string, v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const ts = Date.parse(s);
  if (!Number.isFinite(ts)) throw new HttpError(400, `${name} must be a valid date`);
  return s;
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
      return "rejeitada";
    default:
      return appStatus;
  }
}

type LegacyOrder = {
  id: string;
  external_id: string | null;
  assistant_id: string | null;
  inspector_id: string | null;
  inspector_code: string | null;
  status: string;
  otype: string | null;
  work_type: string | null;
  category: string | null;
  audit_flag: boolean | null;
  audit_reason: string | null;
  created_at: string | null;
  execution_date: string | null;
  due_date: string | null;
};

interface ReasonCount {
  reason: string;
  count: number;
}

interface AssistantMetrics {
  assistantId: string;
  assistantName: string;
  totalOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  pendingOrders: number;
  followUpOrders: number;
  approvalRate: number;
  categoryBreakdown: {
    regular: number;
    exterior: number;
    interior: number;
    fint: number;
  };
  followUpReasons: ReasonCount[];
  rejectionReasons: ReasonCount[];
  needsAlert: boolean;
}

interface TeamMetrics {
  totalOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  pendingOrders: number;
  followUpOrders: number;
  approvalRate: number;
  categoryBreakdown: {
    regular: number;
    exterior: number;
    interior: number;
    fint: number;
  };
  assistants: AssistantMetrics[];
  topFollowUpReasons: ReasonCount[];
  topRejectionReasons: ReasonCount[];
  alertCount: number;
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

    const submittedFrom = assertOptionalDateLike("submitted_from", q.submitted_from ?? q.from);
    const submittedTo = assertOptionalDateLike("submitted_to", q.submitted_to ?? q.to);

    const requestedAssistantId = q.assistant_id ?? q.assistant;
    const assistantIdsRaw = toStringArray(q.assistant_ids ?? q.assistantIds);
    if (assistantIdsRaw.length > 200) throw new HttpError(400, "assistant_ids max length is 200");

    const includeInspectorCode = await hasColumn(db as any, "orders", "inspector_code");

    // Determine assistant scope (RBAC)
    const adminAllowedAssistantIds =
      auth.user.role === "admin" ? await listAdminAssistantIds(db as any, auth.user) : [];

    let assistantIds: string[] = [];

    if (requestedAssistantId != null) {
      const resolved = await resolveUserId(db as any, String(requestedAssistantId));
      if (auth.user.role === "admin" && !adminAllowedAssistantIds.includes(resolved)) {
        throw new HttpError(403, "Forbidden (assistant_id)");
      }
      assistantIds = [resolved];
    } else if (assistantIdsRaw.length > 0) {
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
      const empty: TeamMetrics = {
        totalOrders: 0,
        approvedOrders: 0,
        rejectedOrders: 0,
        pendingOrders: 0,
        followUpOrders: 0,
        approvalRate: 0,
        categoryBreakdown: { regular: 0, exterior: 0, interior: 0, fint: 0 },
        assistants: [],
        topFollowUpReasons: [],
        topRejectionReasons: [],
        alertCount: 0,
      };
      return res.status(200).json({ ok: true, metrics: empty, orders: [] });
    }

    // Load assistant names (for stable UI even when an assistant has zero orders in the range)
    const usersRes = await db.query(
      `select id, full_name from public.users where id = any($1)`,
      [assistantIds],
    );
    const assistantNameById: Record<string, string> = {};
    (usersRes.rows ?? []).forEach((u: any) => {
      assistantNameById[String(u.id)] = u.full_name || "Desconhecido";
    });

    const statuses = ["submitted", "followup", "closed", "canceled"];
    const params: any[] = [assistantIds, statuses];
    const where: string[] = [
      "o.archived_at is null",
      "o.assistant_id = any($1)",
      "o.app_status = any($2)",
    ];
    if (submittedFrom) {
      params.push(submittedFrom);
      where.push(`o.submitted_at >= $${params.length}`);
    }
    if (submittedTo) {
      params.push(submittedTo);
      where.push(`o.submitted_at <= $${params.length}`);
    }
    const whereSql = where.length ? `where ${where.join(" and ")}` : "";

    const maxLimit = 5000;
    const limitRaw = Number(q.limit ?? maxLimit);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), maxLimit) : maxLimit;

    const inspectorCodeSelect = includeInspectorCode ? "o.inspector_code" : "null::text as inspector_code";

    const sql = `
      select
        o.id,
        o.external_id,
        o.assistant_id,
        o.app_status,
        o.otype,
        o.inspector_id,
        ${inspectorCodeSelect},
        wt.category as category,
        o.followup_suspected,
        o.followup_suspected_reason,
        o.created_at,
        o.updated_at,
        o.submitted_at,
        o.closed_at,
        o.hold_until
      from public.orders o
      left join public.work_types wt
        on upper(coalesce(o.otype, '')) = upper(coalesce(wt.code, ''))
        and coalesce(wt.active, true) = true
      ${whereSql}
      order by o.updated_at desc, o.id desc
      limit ${limit}
    `;
    const ordersRes = await db.query(sql, params);
    const rows = (ordersRes.rows ?? []) as any[];

    const orders: LegacyOrder[] = rows.map((o: any) => {
      const auditFlag = (o.followup_suspected ?? null) as boolean | null;
      return {
        id: String(o.id),
        external_id: o.external_id ?? null,
        assistant_id: o.assistant_id ?? null,
        inspector_id: o.inspector_id ?? null,
        inspector_code: o.inspector_code ?? null,
        status: mapAppStatusToLegacyStatus(o.app_status, auditFlag),
        otype: o.otype ?? null,
        work_type: o.otype ?? null,
        category: o.category ?? null,
        audit_flag: auditFlag,
        audit_reason: o.followup_suspected_reason ?? null,
        created_at: o.created_at ?? null,
        execution_date: o.submitted_at ?? o.closed_at ?? null,
        due_date: o.hold_until ?? null,
      };
    });

    const assistantMetricsMap: Record<string, AssistantMetrics> = {};
    assistantIds.forEach((id) => {
      assistantMetricsMap[id] = {
        assistantId: id,
        assistantName: assistantNameById[id] || "Desconhecido",
        totalOrders: 0,
        approvedOrders: 0,
        rejectedOrders: 0,
        pendingOrders: 0,
        followUpOrders: 0,
        approvalRate: 0,
        categoryBreakdown: { regular: 0, exterior: 0, interior: 0, fint: 0 },
        followUpReasons: [],
        rejectionReasons: [],
        needsAlert: false,
      };
    });

    const followUpReasonsMap: Record<string, Record<string, number>> = {};
    const rejectionReasonsMap: Record<string, Record<string, number>> = {};
    const globalFollowUpReasons: Record<string, number> = {};
    const globalRejectionReasons: Record<string, number> = {};

    assistantIds.forEach((id) => {
      followUpReasonsMap[id] = {};
      rejectionReasonsMap[id] = {};
    });

    let totalOrders = 0;
    let approvedOrders = 0;
    let rejectedOrders = 0;
    let pendingOrders = 0;
    let followUpOrders = 0;
    const categoryBreakdown = { regular: 0, exterior: 0, interior: 0, fint: 0 };

    orders.forEach((order) => {
      const assistantId = order.assistant_id;
      if (!assistantId || !assistantMetricsMap[assistantId]) return;

      const metrics = assistantMetricsMap[assistantId];
      metrics.totalOrders += 1;
      totalOrders += 1;

      if (order.audit_flag && order.status === "enviada") {
        const reason = order.audit_reason || "Sem motivo informado";
        metrics.followUpOrders += 1;
        followUpOrders += 1;
        followUpReasonsMap[assistantId][reason] = (followUpReasonsMap[assistantId][reason] || 0) + 1;
        globalFollowUpReasons[reason] = (globalFollowUpReasons[reason] || 0) + 1;
      } else if (order.status === "aprovada" || order.status === "paga") {
        metrics.approvedOrders += 1;
        approvedOrders += 1;
      } else if (order.status === "rejeitada" && !order.audit_flag) {
        const reason = order.audit_reason || "Sem motivo informado";
        metrics.rejectedOrders += 1;
        rejectedOrders += 1;
        rejectionReasonsMap[assistantId][reason] = (rejectionReasonsMap[assistantId][reason] || 0) + 1;
        globalRejectionReasons[reason] = (globalRejectionReasons[reason] || 0) + 1;
      } else if (
        !order.audit_flag &&
        ["pendente", "enviada", "em_analise", "agendada"].includes(order.status || "")
      ) {
        metrics.pendingOrders += 1;
        pendingOrders += 1;
      }

      const category = order.category as keyof typeof categoryBreakdown;
      if (category && Object.prototype.hasOwnProperty.call(categoryBreakdown, category)) {
        metrics.categoryBreakdown[category] += 1;
        categoryBreakdown[category] += 1;
      }
    });

    let alertCount = 0;
    Object.values(assistantMetricsMap).forEach((m) => {
      const completed = m.approvedOrders + m.rejectedOrders;
      m.approvalRate = completed > 0 ? (m.approvedOrders / completed) * 100 : 0;

      m.needsAlert = completed >= 5 && m.approvalRate < 70;
      if (m.needsAlert) alertCount += 1;

      m.followUpReasons = Object.entries(followUpReasonsMap[m.assistantId] || {})
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      m.rejectionReasons = Object.entries(rejectionReasonsMap[m.assistantId] || {})
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    });

    const totalCompleted = approvedOrders + rejectedOrders;
    const overallApprovalRate = totalCompleted > 0 ? (approvedOrders / totalCompleted) * 100 : 0;

    const topFollowUpReasons = Object.entries(globalFollowUpReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topRejectionReasons = Object.entries(globalRejectionReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const metrics: TeamMetrics = {
      totalOrders,
      approvedOrders,
      rejectedOrders,
      pendingOrders,
      followUpOrders,
      approvalRate: overallApprovalRate,
      categoryBreakdown,
      assistants: Object.values(assistantMetricsMap).sort((a, b) => b.totalOrders - a.totalOrders),
      topFollowUpReasons,
      topRejectionReasons,
      alertCount,
    };

    const warnings: string[] = [];
    if (!includeInspectorCode) warnings.push("missingColumn:orders.inspector_code");
    if (rows.length >= limit && limit === maxLimit) warnings.push("truncated");

    return res.status(200).json({
      ok: true,
      assistantIds,
      range: { submitted_from: submittedFrom, submitted_to: submittedTo },
      metrics,
      orders,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
