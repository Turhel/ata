import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { resolveUserId } from "../../_lib/users.js";
import { hasColumn, hasTable } from "../../_lib/schema.js";

export const config = { runtime: "nodejs" };

const APP_TIMEZONE = "America/Fortaleza";

function getTodayKeyInTz() {
  // en-CA => YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type DueDateItem = {
  id: string;
  external_id: string;
  app_status: string;
  otype: string | null;
  hold_until: string | null;
  due_date_confirmed: boolean | null;
  due_date_key: string | null;
};

type ReturnedItem = DueDateItem & {
  followup_reason: string | null;
  followup_status: string | null;
  followup_id: string | null;
  followup_created_at: string | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const db = getPool();
    const q = req.query ?? {};

    let assistantId = auth.user.id;
    let assistantParam: string | null = null;
    if (auth.user.role !== "user" && q.assistant_id != null) {
      assistantParam = String(q.assistant_id).trim() || null;
      if (!assistantParam) throw new HttpError(400, "assistant_id cannot be empty");
      assistantId = await resolveUserId(db as any, assistantParam);
    }

    const assistantIdCandidates = Array.from(
      new Set(
        [assistantId, assistantParam, auth.user.clerk_user_id]
          .filter(Boolean)
          .map((v) => String(v)),
      ),
    );

    const todayKey = getTodayKeyInTz();

    const includeDueDateConfirmed = await hasColumn(db as any, "orders", "due_date_confirmed");
    const includeFollowupReason = await hasColumn(db as any, "orders", "followup_suspected_reason");
    const includeLegacyAuditReason = await hasColumn(db as any, "orders", "audit_reason");
    const canLoadFollowups = await hasTable(db as any, "requests");

    const warnings: string[] = [];
    if (!includeDueDateConfirmed) warnings.push("missingColumn:orders.due_date_confirmed");
    if (!includeFollowupReason) warnings.push("missingColumn:orders.followup_suspected_reason");
    if (!includeLegacyAuditReason) warnings.push("missingColumn:orders.audit_reason");
    if (!canLoadFollowups) warnings.push("missingTable:requests");

    const dueDateOrders: DueDateItem[] = [];
    if (includeDueDateConfirmed) {
      const dueStatuses = ["scheduled", "available"];
      const dueSql = `
        select
          id,
          external_id,
          app_status,
          otype,
          hold_until,
          due_date_confirmed,
          case when hold_until is null then null
            else to_char((hold_until)::date, 'YYYY-MM-DD')
          end as due_date_key
        from public.orders
        where archived_at is null
          and assistant_id::text = any($1::text[])
          and app_status = any($2)
          and coalesce(due_date_confirmed, true) = true
          and hold_until is not null
          and (hold_until)::date <= ($3::date)
        order by hold_until asc, updated_at desc
        limit 200
      `;
      const dueRes = await db.query(dueSql, [assistantIdCandidates, dueStatuses, todayKey]);
      dueDateOrders.push(...((dueRes.rows ?? []) as DueDateItem[]));
    }

    const returnedOrders: ReturnedItem[] = [];

    const orderReasonParts: string[] = [];
    if (includeFollowupReason) orderReasonParts.push("nullif(o.followup_suspected_reason::text, '')");
    if (includeLegacyAuditReason) orderReasonParts.push("nullif(o.audit_reason::text, '')");
    const orderReasonExpr = orderReasonParts.length ? orderReasonParts.join(", ") : "null";

    const followupStatuses = ["open", "in_review"];
    const returnedSql = `
      select
        o.id,
        o.external_id,
        o.app_status,
        o.otype,
        o.hold_until,
        ${includeDueDateConfirmed ? "o.due_date_confirmed" : "false"} as due_date_confirmed,
        case when o.hold_until is null then null
          else to_char((o.hold_until)::date, 'YYYY-MM-DD')
        end as due_date_key,
        coalesce(nullif((r.payload->>'reason')::text, ''), ${orderReasonExpr}) as followup_reason,
        (r.payload->>'status') as followup_status,
        r.id as followup_id,
        r.requested_at as followup_created_at
      from public.orders o
      ${canLoadFollowups ? `
      left join lateral (
        select r.*
        from public.requests r
        where r.type = 'other'
          and (r.payload->>'req') = 'order_followup'
          and (r.payload->>'kind') = 'correction'
          and (r.payload->>'assistant_id') = any($1::text[])
          and o.id::text = (r.payload->>'order_id')::text
          and (r.payload->>'status') = any($2::text[])
        order by r.requested_at desc
        limit 1
      ) r on true
      ` : `
      left join lateral (select null::uuid as id, null::jsonb as payload, null::timestamptz as requested_at) r on true
      `}
      where o.archived_at is null
        and (
          o.assistant_id::text = any($1::text[])
          or r.id is not null
        )
        and (
          o.app_status = 'followup'
          or r.id is not null
        )
      order by coalesce(r.requested_at, o.updated_at) desc nulls last
      limit 200
    `;

    const returnedRes = await db.query(returnedSql, [assistantIdCandidates, followupStatuses]);
    returnedOrders.push(...((returnedRes.rows ?? []) as ReturnedItem[]));

    const dueTodayCount = dueDateOrders.reduce((acc, o) => acc + (o.due_date_key === todayKey ? 1 : 0), 0);

    return res.status(200).json({
      ok: true,
      todayKey,
      counts: {
        dueDate: dueDateOrders.length,
        returned: returnedOrders.length,
        dueToday: dueTodayCount,
        pending: dueDateOrders.length + returnedOrders.length,
      },
      dueDateOrders,
      returnedOrders,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
