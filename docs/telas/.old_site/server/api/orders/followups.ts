import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { resolveUserId } from "../../_lib/users.js";

export const config = { runtime: "nodejs" };

const REQUEST_TYPE = "other";
const REQUEST_KIND = "order_followup";

function mapFollowupStatusToRequestStatus(status: string | null | undefined): string {
  const s = (status ?? "").toLowerCase().trim();
  if (s === "resolved") return "approved";
  if (s === "dismissed") return "rejected";
  return "pending";
}

function toStringArray(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function resolveOrderId(db: any, input: string): Promise<string | null> {
  const v = String(input ?? "").trim();
  if (!v) return null;
  if (isUuidLike(v)) return v;
  const r = await db.query(`select id from public.orders where external_id = $1 limit 1`, [v]);
  return r.rows?.[0]?.id ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    if (req.method === "GET") {
      const q = req.query ?? {};
      const assistantIdParam = q.assistant_id ? String(q.assistant_id) : null;
      let assistantId = auth.user.role === "user" ? auth.user.id : null;
      if (!assistantId && assistantIdParam) assistantId = await resolveUserId(db as any, assistantIdParam);
      const kind = q.kind ? String(q.kind) : null;
      const orderIds = toStringArray(q.order_ids ?? q.order_id);
      const statusList = toStringArray(q.status);
      const updatedSince = q.updated_since ?? q.updatedSince;

      const where: string[] = [`r.type = '${REQUEST_TYPE}'`, `(r.payload->>'req') = '${REQUEST_KIND}'`];
      const params: any[] = [];
      const add = (cond: string, value: any) => {
        params.push(value);
        where.push(cond.replace("$$", `$${params.length}`));
      };

      if (assistantId) {
        // compat: incluir followups antigos cujo payload guardava clerk_user_id
        const assistantTextIds = assistantIdParam?.startsWith("user_")
          ? [String(assistantId), String(assistantIdParam)]
          : [String(assistantId)];
        params.push(assistantTextIds);
        where.push(`(r.payload->>'assistant_id') = any($${params.length})`);
      }
      if (kind) add(`r.payload->>'kind' = $$`, String(kind));
      if (orderIds.length) {
        params.push(orderIds);
        where.push(`(r.payload->>'order_id') = any($${params.length})`);
      }
      if (statusList.length) {
        params.push(statusList);
        where.push(`(r.payload->>'status') = any($${params.length})`);
      }
      if (updatedSince) add("r.requested_at > $$", String(updatedSince));

      const whereSql = where.length ? `where ${where.join(" and ")}` : "";
      const sql = `
        select
          r.id,
          (r.payload->>'order_id') as order_id,
          (r.payload->>'assistant_id') as assistant_id,
          r.requested_by as created_by_raw,
          uc.id as created_by,
          uc.clerk_user_id as created_by_clerk_user_id,
          (r.payload->>'kind') as kind,
          (r.payload->>'reason') as reason,
          (r.payload->>'status') as status,
          r.requested_at as created_at,
          r.reviewed_at as resolved_at,
          r.reviewed_by as resolved_by_raw,
          ur.id as resolved_by,
          ur.clerk_user_id as resolved_by_clerk_user_id,
          r.notes
        from public.requests r
        left join public.users uc
          on (uc.id::text = r.requested_by::text or uc.clerk_user_id = r.requested_by::text)
        left join public.users ur
          on (ur.id::text = r.reviewed_by::text or ur.clerk_user_id = r.reviewed_by::text)
        ${whereSql}
        order by r.requested_at desc
      `;

      const r = await db.query(sql, params);
      return res.status(200).json({ ok: true, followups: r.rows ?? [] });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const items = Array.isArray(body?.items) ? body.items : [];
      if (items.length === 0) {
        return res.status(400).json({ ok: false, error: "items is required" });
      }

      const cols = ["type", "requested_by", "status", "notes", "payload"];
      const values: any[] = [];
      const placeholders: string[] = [];

      for (let idx = 0; idx < items.length; idx += 1) {
        const item = items[idx] ?? {};
        const base = idx * cols.length;
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);

        const orderId = item?.order_id ? String(item.order_id) : "";
        if (!orderId) throw new HttpError(400, "order_id is required");

        const kind = item?.kind ? String(item.kind) : "";
        if (!kind) throw new HttpError(400, "kind is required");

        if (auth.user.role === "user") {
          const internalOrderId = await resolveOrderId(db as any, orderId);
          if (!internalOrderId) throw new HttpError(404, "Order not found");

          const assistantTextIds = auth.clerkUserId ? [auth.user.id, auth.clerkUserId] : [auth.user.id];
          const allowed = await db.query(
            `
              select 1
              from public.orders
              where id = $1 and assistant_id::text = any($2::text[])
              limit 1
            `,
            [internalOrderId, assistantTextIds]
          );
          if ((allowed.rows?.length ?? 0) === 0) throw new HttpError(403, "Forbidden");
        }

        const assistantId =
          auth.user.role === "user"
            ? auth.user.id
            : item?.assistant_id != null
              ? await resolveUserId(db as any, String(item.assistant_id))
              : null;

        const followupStatus = item.status ? String(item.status) : "open";
        values.push(REQUEST_TYPE, auth.user.id, mapFollowupStatusToRequestStatus(followupStatus), item.notes ?? null, {
          req: REQUEST_KIND,
          order_id: orderId,
          assistant_id: assistantId,
          kind,
          reason: item.reason ?? null,
          status: followupStatus,
        });
      }

      const sql = `
        insert into public.requests
          (${cols.join(", ")})
        values
          ${placeholders.join(", ")}
        returning
          id,
          (payload->>'order_id') as order_id,
          (payload->>'assistant_id') as assistant_id,
          requested_by as created_by_raw,
          requested_by as created_by,
          null::text as created_by_clerk_user_id,
          (payload->>'kind') as kind,
          (payload->>'reason') as reason,
          (payload->>'status') as status,
          requested_at as created_at,
          reviewed_at as resolved_at,
          reviewed_by as resolved_by_raw,
          reviewed_by as resolved_by,
          null::text as resolved_by_clerk_user_id,
          notes
      `;
      const r = await db.query(sql, values);
      return res.status(200).json({ ok: true, followups: r.rows ?? [] });
    }

    if (req.method === "PATCH") {
      await requireAuth(req, { roles: ["admin", "master"] });
      const body = parseBody(req);
      const orderIds = Array.isArray(body?.order_ids) ? body.order_ids : [];
      const ids = Array.isArray(body?.ids) ? body.ids : [];
      if (orderIds.length === 0 && ids.length === 0) {
        return res.status(400).json({ ok: false, error: "order_ids or ids is required" });
      }

      const kind = body.kind ?? null;
      const statusFilter = body.status_filter;
      const statusList = Array.isArray(statusFilter) ? statusFilter : statusFilter ? [statusFilter] : [];

      const setParts: string[] = [];
      const params: any[] = [];
      const addSet = (col: string, value: any) => {
        params.push(value);
        setParts.push(`${col} = $${params.length}`);
      };

      if (body.status !== undefined) {
        // status real do follow-up fica no payload; a coluna status usa mapping para satisfazer constraint
        const followupStatus = body.status ? String(body.status) : null;
        params.push(JSON.stringify({ status: followupStatus }));
        setParts.push(`payload = coalesce(payload, '{}'::jsonb) || $${params.length}::jsonb`);
        params.push(mapFollowupStatusToRequestStatus(followupStatus));
        setParts.push(`status = $${params.length}`);
      }
      if (body.resolved_at !== undefined) addSet("reviewed_at", body.resolved_at ?? null);
      if (body.resolved_by !== undefined) {
        addSet(
          "reviewed_by",
          body.resolved_by != null ? await resolveUserId(db as any, String(body.resolved_by)) : null
        );
      }
      if (body.notes !== undefined) addSet("notes", body.notes ?? null);

      if (setParts.length === 0) {
        return res.status(400).json({ ok: false, error: "No fields to update" });
      }

      const where: string[] = [`type = '${REQUEST_TYPE}'`, `(payload->>'req') = '${REQUEST_KIND}'`];
      if (orderIds.length) {
        params.push(orderIds);
        where.push(`(payload->>'order_id') = any($${params.length})`);
      }
      if (ids.length) {
        params.push(ids);
        where.push(`id = any($${params.length})`);
      }
      if (kind) {
        params.push(kind);
        where.push(`(payload->>'kind') = $${params.length}`);
      }
      if (statusList.length) {
        params.push(statusList);
        where.push(`(payload->>'status') = any($${params.length})`);
      }

      const sql = `
        update public.requests
        set ${setParts.join(", ")}
        where ${where.join(" and ")}
        returning
          id,
          (payload->>'order_id') as order_id,
          (payload->>'assistant_id') as assistant_id,
          requested_by as created_by_raw,
          requested_by as created_by,
          null::text as created_by_clerk_user_id,
          (payload->>'kind') as kind,
          (payload->>'reason') as reason,
          (payload->>'status') as status,
          requested_at as created_at,
          reviewed_at as resolved_at,
          reviewed_by as resolved_by_raw,
          reviewed_by as resolved_by,
          null::text as resolved_by_clerk_user_id,
          notes
      `;
      const r = await db.query(sql, params);
      return res.status(200).json({ ok: true, followups: r.rows ?? [] });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

