import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { getPool } from "../../../_lib/db.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";
import { getTursoPool } from "../../../_lib/tursoDb.js";
import { resolveOptionalUserId } from "../../../_lib/users.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // LEGACY (FROZEN): do not add new features here.
    // Migration target is `/api/orders/:id` (app_status + followup flags).
    // Keep this endpoint only for existing screens until they are migrated.
    const auth = await requireAuth(req);
    const db = getPool();

    const id = req.query?.id ? String(req.query.id) : null;
    if (!id) throw new HttpError(400, "Missing id");

    const selectFields = `
      o.id,
      o.external_id,
      o.work_type,
      o.category,
      o.client_code,
      o.status,
      o.assistant_id as assistant_id_raw,
      u.id as assistant_id,
      u.clerk_user_id as assistant_clerk_user_id,
      o.inspector_id,
      o.inspector_code,
      o.due_date,
      o.execution_date,
      o.created_at,
      o.updated_at,
      o.owner_name,
      o.address1,
      o.address2,
      o.city,
      o.state,
      o.zip,
      o.audit_flag,
      o.audit_reason,
      o.not_done_reason,
      o.pool_status,
      o.pool_match,
      o.pool_match_reason,
      o.created_by as created_by_raw,
      uc.id as created_by,
      uc.clerk_user_id as created_by_clerk_user_id,
      o.updated_by as updated_by_raw,
      uu.id as updated_by,
      uu.clerk_user_id as updated_by_clerk_user_id
    `;

    async function loadOrder() {
      const r = await db.query(
        `
          select ${selectFields}
          from public.orders o
          left join public.users u
            on (u.id::text = o.assistant_id::text or u.clerk_user_id = o.assistant_id::text)
          left join public.users uc
            on (uc.id::text = o.created_by::text or uc.clerk_user_id = o.created_by::text)
          left join public.users uu
            on (uu.id::text = o.updated_by::text or uu.clerk_user_id = o.updated_by::text)
          where o.id = $1
        `,
        [id]
      );
      const order = r.rows?.[0];
      if (!order) throw new HttpError(404, "Order not found");
      if (auth.user.role === "user") {
        const assistantRaw = String(order.assistant_id_raw ?? "");
        const canAccess = assistantRaw === auth.user.id || assistantRaw === auth.clerkUserId;
        if (!canAccess) throw new HttpError(403, "Forbidden");
      }
      return order;
    }

    if (req.method === "GET") {
      const order = await loadOrder();
      return res.status(200).json({ ok: true, order });
    }

    if (req.method !== "PATCH") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const current = await loadOrder();
    const body = parseBody(req);

    const next: Record<string, any> = {};

    if (body.status !== undefined) next.status = body.status ?? null;
    if (body.audit_flag !== undefined) next.audit_flag = !!body.audit_flag;
    if (body.audit_reason !== undefined) next.audit_reason = body.audit_reason ?? null;
    if (body.not_done_reason !== undefined) next.not_done_reason = body.not_done_reason ?? null;
    if (body.due_date !== undefined) next.due_date = body.due_date ?? null;
    if (body.execution_date !== undefined) next.execution_date = body.execution_date ?? null;
    if (body.assistant_id !== undefined) next.assistant_id = body.assistant_id ?? null;
    if (body.work_type !== undefined) next.work_type = body.work_type ?? null;
    if (body.category !== undefined) next.category = body.category ?? null;
    if (body.inspector_id !== undefined) next.inspector_id = body.inspector_id ?? null;
    if (body.inspector_code !== undefined) next.inspector_code = body.inspector_code ?? null;
    if (body.address1 !== undefined) next.address1 = body.address1 ?? null;
    if (body.address2 !== undefined) next.address2 = body.address2 ?? null;
    if (body.city !== undefined) next.city = body.city ?? null;
    if (body.zip !== undefined) next.zip = body.zip ?? null;

    const keys = Object.keys(next).filter((k) => next[k] !== undefined);
    if (keys.length === 0) throw new HttpError(400, "No fields to update");

    const setParts: string[] = [];
    const params: any[] = [];

    for (const k of keys) {
      if (k === "assistant_id") {
        params.push(next[k] != null ? await resolveOptionalUserId(db as any, next[k]) : null);
      } else {
        params.push(next[k]);
      }
      setParts.push(`${k} = $${params.length}`);
    }

    params.push(auth.user.id);
    setParts.push(`updated_by = $${params.length}`);
    setParts.push("updated_at = now()");

    params.push(id);

    const sql = `
      update public.orders
      set ${setParts.join(", ")}
      where id = $${params.length}
    `;

    await db.query(sql, params);
    const updated = await loadOrder();

    if (updated && current?.status && next.status && next.status !== current.status) {
      const changeReason =
        (typeof next.audit_reason === "string" && next.audit_reason) ||
        (typeof next.not_done_reason === "string" && next.not_done_reason) ||
        null;

      // Best-effort audit (COLD): order history lives in Turso.
      // Do not block legacy flows if Turso is missing/unavailable.
      try {
        const turso = getTursoPool();
        await turso.execute({
          sql: `
            insert into order_history
              (id, order_id, previous_status, new_status, change_reason, changed_by, details, created_at)
            values
              (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            randomUUID(),
            id,
            current.status,
            next.status,
            changeReason,
            auth.user.id,
            JSON.stringify({ source: "api/legacy/orders/[id]" }),
            new Date().toISOString(),
          ],
        });
      } catch (e: any) {
        const msg = String(e?.message ?? "").toLowerCase();
        const isMissingTursoEnv = msg.includes("missing turso_database_url");
        const isMissingTable = msg.includes("no such table: order_history");
        if (!isMissingTursoEnv && !isMissingTable) {
          console.warn("[api] legacy/orders/[id] order_history log failed", { message: e?.message });
        }
      }
    }

    return res.status(200).json({ ok: true, order: updated });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
