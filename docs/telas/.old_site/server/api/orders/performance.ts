import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { hasColumn, hasTable } from "../../_lib/schema.js";
import { resolveUserId } from "../../_lib/users.js";

export const config = { runtime: "nodejs" };

const APP_TIMEZONE = "America/Fortaleza";

function parseBool(v: any): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function assertDateLike(name: string, v: any) {
  const s = String(v ?? "").trim();
  if (!s) throw new HttpError(400, `${name} is required`);
  // Best-effort validation (Postgres will be final validator)
  const ts = Date.parse(s);
  if (!Number.isFinite(ts)) throw new HttpError(400, `${name} must be a valid date`);
  return s;
}

function daysDiff(fromIso: string, toIso: string) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const ms = Math.max(0, to.getTime() - from.getTime());
  return Math.max(1, ms / (1000 * 3600 * 24));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const db = getPool();
    const q = req.query ?? {};

    const submittedFrom = assertDateLike("submitted_from", q.submitted_from ?? q.from);
    const submittedTo = assertDateLike("submitted_to", q.submitted_to ?? q.to);

    const includeOrders = parseBool(q.include_orders ?? q.includeOrders);
    const includeInspectorCode = await hasColumn(db as any, "orders", "inspector_code");
    const includeAddress2 = await hasColumn(db as any, "orders", "address2");
    const inspectorsTable = (await hasTable(db as any, "inspectors_directory")) ? "inspectors_directory" : "inspectors";

    let assistantId = auth.user.id;
    if (auth.user.role !== "user" && q.assistant_id != null) {
      assistantId = await resolveUserId(db as any, String(q.assistant_id));
    }

    const statuses = ["submitted", "followup", "closed", "canceled"];

    // Metrics (small payload)
    const metricsSql = `
      select
        count(*)::int as total_orders,
        sum(case when o.app_status = 'closed' then 1 else 0 end)::int as approved_orders,
        sum(case when o.app_status = 'closed' then coalesce(wt.assistant_value, 0) else 0 end)::float as estimated_value
      from public.orders o
      left join public.work_types wt
        on upper(coalesce(o.otype, '')) = upper(coalesce(wt.code, ''))
        and coalesce(wt.active, true) = true
      where o.archived_at is null
        and o.assistant_id = $1
        and o.app_status = any($2)
        and o.submitted_at >= $3
        and o.submitted_at <= $4
    `;
    const metricsRes = await db.query(metricsSql, [assistantId, statuses, submittedFrom, submittedTo]);
    const m = metricsRes.rows?.[0] ?? {};

    const totalOrders = Number(m.total_orders ?? 0) || 0;
    const approvedOrders = Number(m.approved_orders ?? 0) || 0;
    const estimatedValue = Number(m.estimated_value ?? 0) || 0;
    const approvalRate = totalOrders > 0 ? (approvedOrders / totalOrders) * 100 : 0;
    const dailyAverage = totalOrders / daysDiff(submittedFrom, submittedTo);

    // Daily counts (for chart)
    const dailySql = `
      select
        to_char((o.submitted_at at time zone $1)::date, 'YYYY-MM-DD') as day_key,
        count(*)::int as total,
        sum(case when o.app_status = 'closed' then 1 else 0 end)::int as approved
      from public.orders o
      where o.archived_at is null
        and o.assistant_id = $2
        and o.app_status = any($3)
        and o.submitted_at >= $4
        and o.submitted_at <= $5
      group by day_key
      order by day_key
    `;
    const dailyRes = await db.query(dailySql, [APP_TIMEZONE, assistantId, statuses, submittedFrom, submittedTo]);

    // Category counts (approved only)
    const categorySql = `
      select
        coalesce(nullif(initcap(lower(wt.category)), ''), 'Sem Categoria') as name,
        count(*)::int as value
      from public.orders o
      left join public.work_types wt
        on upper(coalesce(o.otype, '')) = upper(coalesce(wt.code, ''))
        and coalesce(wt.active, true) = true
      where o.archived_at is null
        and o.assistant_id = $1
        and o.app_status = 'closed'
        and o.submitted_at >= $2
        and o.submitted_at <= $3
      group by name
      order by value desc, name asc
    `;
    const categoryRes = await db.query(categorySql, [assistantId, submittedFrom, submittedTo]);

    // Inspector breakdown (includes non-approved; value from approved only)
    const inspectorCodeSelect = includeInspectorCode ? "o.inspector_code" : "null::text as inspector_code";
    const inspectorCodeCoalesce = includeInspectorCode
      ? "coalesce(i.code, o.inspector_code, 'N/A')"
      : "coalesce(i.code, 'N/A')";
    const inspectorGroupBy = includeInspectorCode
      ? "o.inspector_id, o.inspector_code, i.code, i.name"
      : "o.inspector_id, i.code, i.name";
      const inspectorSql = `
      select
        o.inspector_id,
        ${inspectorCodeSelect},
        ${inspectorCodeCoalesce} as code,
        coalesce(i.name, 'Desconhecido') as name,
        count(*)::int as orders,
        sum(case when o.app_status = 'closed' then 1 else 0 end)::int as approved,
        sum(case when o.app_status = 'closed' then coalesce(wt.assistant_value, 0) else 0 end)::float as value
      from public.orders o
      left join public.${inspectorsTable} i
        on i.id::text = o.inspector_id::text
      left join public.work_types wt
        on upper(coalesce(o.otype, '')) = upper(coalesce(wt.code, ''))
        and coalesce(wt.active, true) = true
      where o.archived_at is null
        and o.assistant_id = $1
        and o.app_status = any($2)
        and o.submitted_at >= $3
        and o.submitted_at <= $4
      group by ${inspectorGroupBy}
      order by orders desc, code asc
    `;
    const inspectorRes = await db.query(inspectorSql, [assistantId, statuses, submittedFrom, submittedTo]);

    let orders: any[] | undefined;
    if (includeOrders) {
      const maxLimit = 2000;
      const limitRaw = Number(q.limit ?? maxLimit);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), maxLimit) : maxLimit;

      const orderInspectorCodeSelect = includeInspectorCode ? "o.inspector_code" : "null as inspector_code";
      const orderInspectorCodeResolved = includeInspectorCode
        ? "coalesce(i.code, o.inspector_code, null)"
        : "coalesce(i.code, null)";
      const ordersSql = `
        select
          o.id,
          o.external_id,
          o.otype,
          coalesce(nullif(initcap(lower(wt.category)), ''), 'Sem Categoria') as category,
          o.app_status,
          o.inspector_id,
          ${orderInspectorCodeSelect},
          ${orderInspectorCodeResolved} as inspector_code_resolved,
          coalesce(i.name, null) as inspector_name,
          o.submitted_at,
          o.created_at,
          o.address1,
          ${includeAddress2 ? "o.address2" : "null"} as address2,
          o.followup_suspected,
          o.followup_suspected_reason
        from public.orders o
        left join public.work_types wt
          on upper(coalesce(o.otype, '')) = upper(coalesce(wt.code, ''))
          and coalesce(wt.active, true) = true
        left join public.${inspectorsTable} i
          on i.id::text = o.inspector_id::text
        where o.archived_at is null
          and o.assistant_id = $1
          and o.app_status = any($2)
          and o.submitted_at >= $3
          and o.submitted_at <= $4
        order by o.submitted_at desc nulls last, o.created_at desc nulls last
        limit ${limit}
      `;

      const r = await db.query(ordersSql, [assistantId, statuses, submittedFrom, submittedTo]);
      orders = r.rows ?? [];
    }

    return res.status(200).json({
      ok: true,
      assistant_id: assistantId,
      range: { submitted_from: submittedFrom, submitted_to: submittedTo },
      metrics: { totalOrders, approvedOrders, approvalRate, estimatedValue, dailyAverage },
      daily: dailyRes.rows ?? [],
      categoryData: categoryRes.rows ?? [],
      inspectorData: inspectorRes.rows ?? [],
      orders,
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
