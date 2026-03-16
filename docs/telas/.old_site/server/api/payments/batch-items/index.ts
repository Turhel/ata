import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../../_lib/db.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";
import { resolveUserId } from "../../../_lib/users.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

function toStringArray(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    if (req.method === "GET") {
      const q = req.query ?? {};
      const orderIds = toStringArray(q.order_ids ?? q.order_id);
      const assistantIds = toStringArray(q.assistant_ids ?? q.assistant_id);
      const batchId = q.batch_id ? String(q.batch_id) : null;
      const batchIds = toStringArray(q.batch_ids ?? q.batch_id);
      const updatedSince = q.updated_since ?? q.updatedSince;

      const where: string[] = [];
      const params: any[] = [];
      const add = (cond: string, value: any) => {
        params.push(value);
        where.push(cond.replace("$$", `$${params.length}`));
      };

      if (orderIds.length) {
        params.push(orderIds);
        // Avoid uuid/text operator mismatches across environments (some columns are uuid, some are text)
        where.push(`order_id::text = any($${params.length}::text[])`);
      }
      if (auth.user.role === "user") {
        const assistantTextIds = auth.clerkUserId ? [auth.user.id, auth.clerkUserId] : [auth.user.id];
        params.push(assistantTextIds);
        where.push(`assistant_id::text = any($${params.length}::text[])`);
      } else if (assistantIds.length) {
        const resolved = await Promise.all(assistantIds.map((v) => resolveUserId(db as any, v)));
        const assistantTextIds = Array.from(new Set([...resolved, ...assistantIds.filter((v) => v.startsWith("user_"))]));
        params.push(assistantTextIds);
        // compat: alguns itens antigos podem ter assistant_id salvo como clerk_user_id
        where.push(`assistant_id::text = any($${params.length}::text[])`);
      }
      if (batchId) add("batch_id::text = $$::text", batchId);
      if (!batchId && batchIds.length) {
        params.push(batchIds);
        where.push(`batch_id::text = any($${params.length}::text[])`);
      }
      if (updatedSince) add("created_at > $$::timestamptz", String(updatedSince));

      const whereSql = where.length ? `where ${where.join(" and ")}` : "";

      try {
        const sql = `
          select
            id,
            batch_id,
            order_id,
            assistant_id,
            amount,
            category,
            work_type,
            external_id,
            created_at
          from public.payment_batch_items
          ${whereSql}
          order by created_at desc
        `;
        const r = await db.query(sql, params);
        return res.status(200).json({ ok: true, items: r.rows ?? [] });
      } catch (e: any) {
        // Compat: algumas instâncias podem não ter todas as colunas/tabelas (migrações pendentes).
        // Para não quebrar o dashboard, devolvemos shape compat com colunas faltantes como `null`.
        if (e?.code === "42P01") {
          return res.status(200).json({ ok: true, items: [] });
        }
        if (e?.code === "42703") {
          const sql = `
            select
              id,
              batch_id,
              order_id,
              assistant_id,
              amount,
              null::text as category,
              null::text as work_type,
              null::text as external_id,
              created_at
            from public.payment_batch_items
            ${whereSql}
            order by created_at desc
          `;
          const r = await db.query(sql, params);
          return res.status(200).json({ ok: true, items: r.rows ?? [] });
        }
        throw e;
      }
    }

    if (req.method === "POST") {
      if (auth.user.role !== "admin" && auth.user.role !== "master") {
        throw new HttpError(403, "Forbidden");
      }

      const body = parseBody(req);
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) throw new HttpError(400, "items is required");

      const cols = ["batch_id", "order_id", "assistant_id", "amount", "category", "work_type", "external_id"];
      const values: any[] = [];
      const placeholders: string[] = [];

      const resolvedAssistantIds = await Promise.all(
        items.map((item: any) => resolveUserId(db as any, String(item.assistant_id ?? "")))
      );

      items.forEach((item, idx) => {
        const base = idx * cols.length;
        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`
        );
        values.push(
          item.batch_id,
          item.order_id,
          resolvedAssistantIds[idx],
          Number(item.amount ?? 0),
          item.category ?? null,
          item.work_type ?? null,
          item.external_id ?? null
        );
      });

      const sql = `
        insert into public.payment_batch_items
          (${cols.join(", ")})
        values
          ${placeholders.join(", ")}
        returning
          id,
          batch_id,
          order_id,
          assistant_id,
          amount,
          category,
          work_type,
          external_id,
          created_at
      `;
      const r = await db.query(sql, values);
      return res.status(200).json({ ok: true, items: r.rows ?? [] });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
