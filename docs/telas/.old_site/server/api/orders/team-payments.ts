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

interface InspectorPayment {
  inspectorId: string;
  inspectorName: string;
  inspectorCode: string;
  orderCount: number;
  categoryBreakdown: {
    regular: { count: number; value: number };
    exterior: { count: number; value: number };
    interior: { count: number; value: number };
    fint: { count: number; value: number };
  };
  totalValue: number;
}

interface AssistantPayment {
  assistantId: string;
  assistantName: string;
  orderCount: number;
  categoryBreakdown: {
    regular: { count: number; value: number };
    exterior: { count: number; value: number };
    interior: { count: number; value: number };
    fint: { count: number; value: number };
  };
  totalValue: number;
  inspectors: InspectorPayment[];
}

interface TeamPayments {
  assistants: AssistantPayment[];
  totalAssistantValue: number;
  totalInspectorValue: number;
  totalOrders: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["admin", "master"] });

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const db = getPool();
    const q = req.query ?? {};

    const closedFrom = assertDateLike("closed_from", q.closed_from ?? q.from);
    const closedTo = assertDateLike("closed_to", q.closed_to ?? q.to);

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
      const empty: TeamPayments = { assistants: [], totalAssistantValue: 0, totalInspectorValue: 0, totalOrders: 0 };
      return res.status(200).json({ ok: true, payments: empty });
    }

    const includeInspectorCode = await hasColumn(db as any, "orders", "inspector_code");
    const inspectorsTable = (await hasTable(db as any, "inspectors_directory")) ? "inspectors_directory" : "inspectors";

    const inspectorCodeSelect = includeInspectorCode ? "o.inspector_code" : "null::text as inspector_code";

    const maxLimit = 5000;
    const limitRaw = Number(q.limit ?? maxLimit);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), maxLimit) : maxLimit;

    const ordersSql = `
      select
        o.id,
        o.external_id,
        o.assistant_id,
        u.full_name as assistant_name,
        o.otype,
        wt.category as category,
        coalesce(wt.assistant_value, 0) as assistant_value,
        coalesce(wt.inspector_value, 0) as inspector_value,
        o.inspector_id,
        ${inspectorCodeSelect},
        o.closed_at
      from public.orders o
      left join public.users u
        on u.id::text = o.assistant_id::text
      left join public.work_types wt
        on upper(coalesce(o.otype, '')) = upper(coalesce(wt.code, ''))
        and coalesce(wt.active, true) = true
      where o.archived_at is null
        and o.assistant_id = any($1)
        and o.app_status = 'closed'
        and o.closed_at >= $2
        and o.closed_at <= $3
      order by o.closed_at desc nulls last, o.id desc
      limit ${limit}
    `;

    const ordersRes = await db.query(ordersSql, [assistantIds, closedFrom, closedTo]);
    const orders = (ordersRes.rows ?? []) as any[];

    const inspectorIds = Array.from(new Set(orders.map((o) => o.inspector_id).filter(Boolean).map(String)));
    const inspectorCodes = Array.from(
      new Set(orders.map((o) => o.inspector_code).filter(Boolean).map((v: any) => String(v))),
    );

    const inspectorsById = new Map<string, { id: string; name: string; code: string }>();
    const inspectorsByCode = new Map<string, { id: string; name: string; code: string }>();

    if (inspectorIds.length > 0 || inspectorCodes.length > 0) {
      const parts: string[] = [];
      const params: any[] = [];
      if (inspectorIds.length) {
        params.push(inspectorIds);
        parts.push(`id::text = any($${params.length})`);
      }
      if (inspectorCodes.length) {
        params.push(inspectorCodes);
        parts.push(`code = any($${params.length})`);
      }

      const inspectorsSql = `
        select id, name, code
        from public.${inspectorsTable}
        where ${parts.length ? parts.join(" or ") : "false"}
      `;

      const r = await db.query(inspectorsSql, params);
      (r.rows ?? []).forEach((inspector: any) => {
        inspectorsById.set(String(inspector.id), inspector);
        inspectorsByCode.set(String(inspector.code), inspector);
      });
    }

    const assistantPaymentsMap: Record<string, AssistantPayment> = {};
    assistantIds.forEach((id) => {
      assistantPaymentsMap[id] = {
        assistantId: id,
        assistantName: "Desconhecido",
        orderCount: 0,
        categoryBreakdown: {
          regular: { count: 0, value: 0 },
          exterior: { count: 0, value: 0 },
          interior: { count: 0, value: 0 },
          fint: { count: 0, value: 0 },
        },
        totalValue: 0,
        inspectors: [],
      };
    });

    // Fill assistant names from the orders payload (best-effort)
    orders.forEach((o: any) => {
      const id = o.assistant_id ? String(o.assistant_id) : "";
      if (!id || !assistantPaymentsMap[id]) return;
      if (!assistantPaymentsMap[id].assistantName || assistantPaymentsMap[id].assistantName === "Desconhecido") {
        assistantPaymentsMap[id].assistantName = o.assistant_name || "Desconhecido";
      }
    });

    const inspectorPaymentsMap: Record<string, Record<string, InspectorPayment>> = {};
    assistantIds.forEach((id) => {
      inspectorPaymentsMap[id] = {};
    });

    let totalOrders = 0;
    let totalAssistantValue = 0;
    let totalInspectorValue = 0;

    orders.forEach((order: any) => {
      const assistantId = order.assistant_id ? String(order.assistant_id) : "";
      if (!assistantId || !assistantPaymentsMap[assistantId]) return;

      const categoryKey = String(order.category || "regular").toLowerCase();
      const category = (categoryKey || "regular") as keyof AssistantPayment["categoryBreakdown"];
      const assistantValue = Number(order.assistant_value ?? 0) || 0;
      const inspectorValue = Number(order.inspector_value ?? 0) || 0;

      const assistantPayment = assistantPaymentsMap[assistantId];
      assistantPayment.orderCount += 1;
      totalOrders += 1;

      if (assistantPayment.categoryBreakdown[category]) {
        assistantPayment.categoryBreakdown[category].count += 1;
        assistantPayment.categoryBreakdown[category].value += assistantValue;
      }

      assistantPayment.totalValue += assistantValue;
      totalAssistantValue += assistantValue;

      const inspector =
        (order.inspector_id && inspectorsById.get(String(order.inspector_id))) ||
        (order.inspector_code && inspectorsByCode.get(String(order.inspector_code))) ||
        null;

      if (inspector) {
        if (!inspectorPaymentsMap[assistantId][inspector.id]) {
          inspectorPaymentsMap[assistantId][inspector.id] = {
            inspectorId: inspector.id,
            inspectorName: inspector.name,
            inspectorCode: inspector.code,
            orderCount: 0,
            categoryBreakdown: {
              regular: { count: 0, value: 0 },
              exterior: { count: 0, value: 0 },
              interior: { count: 0, value: 0 },
              fint: { count: 0, value: 0 },
            },
            totalValue: 0,
          };
        }

        const inspectorPayment = inspectorPaymentsMap[assistantId][inspector.id];
        inspectorPayment.orderCount += 1;

        if (inspectorPayment.categoryBreakdown[category]) {
          inspectorPayment.categoryBreakdown[category].count += 1;
          inspectorPayment.categoryBreakdown[category].value += inspectorValue;
        }

        inspectorPayment.totalValue += inspectorValue;
        totalInspectorValue += inspectorValue;
      }
    });

    Object.keys(assistantPaymentsMap).forEach((assistantId) => {
      assistantPaymentsMap[assistantId].inspectors = Object.values(inspectorPaymentsMap[assistantId]).sort(
        (a, b) => b.totalValue - a.totalValue,
      );
    });

    const payments: TeamPayments = {
      assistants: Object.values(assistantPaymentsMap)
        .filter((a) => a.orderCount > 0)
        .sort((a, b) => b.totalValue - a.totalValue),
      totalAssistantValue,
      totalInspectorValue,
      totalOrders,
    };

    const warnings: string[] = [];
    if (!includeInspectorCode) warnings.push("missingColumn:orders.inspector_code");
    if (orders.length >= limit && limit === maxLimit) warnings.push("truncated");

    return res.status(200).json({
      ok: true,
      assistantIds,
      range: { closed_from: closedFrom, closed_to: closedTo },
      payments,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
