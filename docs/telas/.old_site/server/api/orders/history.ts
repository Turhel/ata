import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { getTursoPool } from "../../_lib/tursoDb.js";
import { resolveOptionalUserId } from "../../_lib/users.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

function safeJsonParse(input: any): any {
  if (input == null) return null;
  if (typeof input === "object") return input;
  const s = String(input);
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function isMissingTableError(err: any, tableName: string) {
  const msg = String(err?.message ?? "");
  return msg.toLowerCase().includes(`no such table: ${tableName.toLowerCase()}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool(); // HOT (orders/users) for RBAC + user resolution

    if (req.method === "GET") {
      const orderId = req.query?.order_id ? String(req.query.order_id) : null;
      const updatedSince = req.query?.updated_since ?? req.query?.updatedSince;
      if (!orderId) throw new HttpError(400, "Missing order_id");

      if (auth.user.role === "user") {
        const assistantTextIds = auth.clerkUserId ? [auth.user.id, auth.clerkUserId] : [auth.user.id];
        const allowed = await db.query(
          `
            select 1
            from public.orders
            where id = $1 and assistant_id::text = any($2::text[])
            limit 1
          `,
          [orderId, assistantTextIds],
        );
        if ((allowed.rows?.length ?? 0) === 0) throw new HttpError(403, "Forbidden");
      }

      let turso;
      try {
        turso = getTursoPool();
      } catch (e: any) {
        // COLD is optional for core UX; don't break the UI.
        return res.status(200).json({
          ok: true,
          history: [],
          warning: { code: "turso_unavailable", error: e?.message ?? "Turso unavailable" },
        });
      }

      try {
        let sql = `
          select
            id,
            order_id,
            previous_status,
            new_status,
            change_reason,
            changed_by,
            details,
            created_at
          from order_history
          where order_id = ?
        `;
        const args: any[] = [orderId];
        if (updatedSince) {
          sql += " and created_at > ?";
          args.push(String(updatedSince));
        }
        sql += " order by created_at desc";

        const r = await turso.execute({ sql, args });
        const history = (r.rows ?? []).map((row: any) => ({
          id: String(row.id),
          order_id: String(row.order_id),
          previous_status: row.previous_status == null ? null : String(row.previous_status),
          new_status: row.new_status == null ? null : String(row.new_status),
          change_reason: row.change_reason == null ? null : String(row.change_reason),
          changed_by: row.changed_by == null ? null : String(row.changed_by),
          details: row.details == null ? null : safeJsonParse(row.details),
          created_at: row.created_at == null ? null : String(row.created_at),
        }));
        return res.status(200).json({ ok: true, history, missingTable: false });
      } catch (e: any) {
        if (isMissingTableError(e, "order_history")) {
          return res.status(200).json({ ok: true, history: [], missingTable: true });
        }
        throw e;
      }
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const items = Array.isArray(body?.items) ? body.items : [];
      if (items.length === 0) throw new HttpError(400, "items is required");

      let turso;
      try {
        turso = getTursoPool();
      } catch (e: any) {
        // best-effort audit: do not break the flow if COLD is unavailable
        return res.status(200).json({
          ok: true,
          history: [],
          warning: { code: "turso_unavailable", error: e?.message ?? "Turso unavailable" },
        });
      }

      // user: only for own orders
      if (auth.user.role === "user") {
        const assistantTextIds = auth.clerkUserId ? [auth.user.id, auth.clerkUserId] : [auth.user.id];
        const orderIds = Array.from(new Set(items.map((i: any) => String(i?.order_id ?? "")).filter(Boolean)));
        if (orderIds.length === 0) throw new HttpError(400, "order_id is required");
        const allowed = await db.query(
          `
            select id
            from public.orders
            where id = any($1::uuid[]) and assistant_id::text = any($2::text[])
          `,
          [orderIds, assistantTextIds],
        );
        const allowedIds = new Set((allowed.rows ?? []).map((r: any) => String(r.id)));
        if (orderIds.some((id) => !allowedIds.has(String(id)))) throw new HttpError(403, "Forbidden");
      }

      const createdAt = new Date().toISOString();
      const out: any[] = [];
      const stmts: any[] = [];

      for (const item of items) {
        const orderId = item?.order_id != null ? String(item.order_id) : "";
        if (!orderId) throw new HttpError(400, "order_id is required");

        const id = randomUUID();

        const changedBy =
          auth.user.role === "user"
            ? auth.user.id
            : item?.changed_by != null
              ? await resolveOptionalUserId(db as any, item.changed_by)
              : auth.user.id;

        const detailsJson = item?.details != null ? JSON.stringify(item.details) : null;

        stmts.push({
          sql: `
            insert into order_history
              (id, order_id, previous_status, new_status, change_reason, changed_by, details, created_at)
            values
              (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            id,
            orderId,
            item?.previous_status ?? null,
            item?.new_status ?? null,
            item?.change_reason ?? null,
            changedBy,
            detailsJson,
            createdAt,
          ],
        });

        out.push({
          id,
          order_id: orderId,
          previous_status: item?.previous_status ?? null,
          new_status: item?.new_status ?? null,
          change_reason: item?.change_reason ?? null,
          changed_by: changedBy,
          details: item?.details ?? null,
          created_at: createdAt,
        });
      }

      try {
        await turso.batch(stmts);
        return res.status(200).json({ ok: true, history: out, missingTable: false });
      } catch (e: any) {
        if (isMissingTableError(e, "order_history")) {
          return res.status(200).json({ ok: true, history: [], missingTable: true });
        }
        throw e;
      }
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

