import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { hasColumn } from "../../_lib/schema.js";

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
    await requireAuth(req, { roles: ["admin", "master"] });
    const db = getPool();
    const [
      includeAddress2,
      hasLastSeenBatchId,
      hasLastSeenAt,
      hasPoolStatus,
      hasInspectorCode,
      hasClientCode,
      hasOwnerName,
      hasHoldUntil,
      hasDueDateConfirmed,
    ] = await Promise.all([
      hasColumn(db as any, "orders", "address2"),
      hasColumn(db as any, "orders", "last_seen_batch_id"),
      hasColumn(db as any, "orders", "last_seen_at"),
      hasColumn(db as any, "orders", "pool_status"),
      hasColumn(db as any, "orders", "inspector_code"),
      hasColumn(db as any, "orders", "client_code"),
      hasColumn(db as any, "orders", "owner_name"),
      hasColumn(db as any, "orders", "hold_until"),
      hasColumn(db as any, "orders", "due_date_confirmed"),
    ]);

    const address2Select = includeAddress2 ? "o.address2" : "null as address2";
    const poolStatusSelect = hasPoolStatus ? "o.pool_status as status" : "null as status";
    const batchIdSelect = hasLastSeenBatchId ? "o.last_seen_batch_id as batch_id" : "null as batch_id";
    const dueDateSelect = hasHoldUntil ? "o.hold_until as due_date" : "null as due_date";
    const inspectorCodeSelect = hasInspectorCode ? "o.inspector_code" : "null as inspector_code";
    const clientCodeSelect = hasClientCode ? "o.client_code" : "null as client_code";
    const ownerNameSelect = hasOwnerName ? "o.owner_name" : "null as owner_name";

    if (req.method === "GET") {
      // If the DB doesn't have pool columns, return empty list (keeps UI usable).
      if (!hasLastSeenBatchId) {
        return res.status(200).json({
          ok: true,
          items: [],
          totalCount: 0,
          warning: { code: "missing_column", table: "orders", column: "last_seen_batch_id" },
        });
      }

      const q = req.query ?? {};
      const worders = toStringArray(q.worders ?? q.worder);
      const batchId = q.batch_id ? String(q.batch_id) : null;
      const search = q.search ? String(q.search) : null;
      const page = Number(q.page ?? 0);
      const pageSize = Number(q.page_size ?? q.pageSize ?? 50);
      const limit = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 1), 500) : 50;
      const offset = Number.isFinite(page) ? Math.max(page, 0) * limit : 0;
      const updatedSince = q.updated_since ?? q.updatedSince;

      const where: string[] = [];
      const params: any[] = [];
      const add = (cond: string, value: any) => {
        params.push(value);
        where.push(cond.replace("$$", `$${params.length}`));
      };

      // Mantemos o conceito de "pool" como ordens importadas (associadas a um batch)
      where.push("o.last_seen_batch_id is not null");

      if (worders.length) {
        params.push(worders);
        where.push(`o.external_id = any($${params.length})`);
      }
      if (batchId) add("o.last_seen_batch_id = $$", batchId);
      if (search) {
        params.push(`%${search}%`);
        const p = `$${params.length}`;
        const searchParts = [
          `o.external_id ilike ${p}`,
          `o.otype ilike ${p}`,
          `o.address1 ilike ${p}`,
          `o.city ilike ${p}`,
          `o.zip ilike ${p}`,
          `o.client_code ilike ${p}`,
          `o.owner_name ilike ${p}`,
        ];
        if (includeAddress2) searchParts.push(`o.address2 ilike ${p}`);
        where.push(`(${searchParts.join(" or ")})`);
      }
      if (updatedSince) add("o.updated_at > $$", String(updatedSince));

      const whereSql = where.length ? `where ${where.join(" and ")}` : "";

      const sql = `
        select
          o.id,
          o.external_id as worder,
          o.otype,
          o.address1,
          ${address2Select},
          o.city,
          o.zip,
          ${dueDateSelect},
          ${inspectorCodeSelect},
          ${clientCodeSelect},
          ${ownerNameSelect},
          ${poolStatusSelect},
          ${batchIdSelect},
          o.created_at
        from public.orders o
        ${whereSql}
        order by o.external_id
        limit ${limit} offset ${offset}
      `;
      const countSql = `
        select count(*)::int as count
        from public.orders o
        ${whereSql}
      `;

      const [itemsRes, countRes] = await Promise.all([db.query(sql, params), db.query(countSql, params)]);

      return res.status(200).json({
        ok: true,
        items: itemsRes.rows ?? [],
        totalCount: countRes.rows?.[0]?.count ?? 0,
      });
    }

    if (req.method === "POST") {
      if (!hasLastSeenBatchId) throw new HttpError(503, "Pool import requires orders.last_seen_batch_id");
      if (!hasLastSeenAt) throw new HttpError(503, "Pool import requires orders.last_seen_at");
      if (!hasPoolStatus) throw new HttpError(503, "Pool import requires orders.pool_status");

      const body = parseBody(req);
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) throw new HttpError(400, "items is required");

      const cols: string[] = ["external_id", "otype", "address1", "city", "zip"];
      if (hasHoldUntil) cols.push("hold_until");
      if (hasInspectorCode) cols.push("inspector_code");
      if (hasClientCode) cols.push("client_code");
      if (hasOwnerName) cols.push("owner_name");
      cols.push("pool_status", "last_seen_batch_id", "last_seen_at", "app_status");

      const values: any[] = [];
      const placeholders: string[] = [];

      items.forEach((item) => {
        const rowPlaceholders: string[] = [];
        const push = (v: any) => {
          values.push(v);
          rowPlaceholders.push(`$${values.length}`);
        };

        push(item.worder);
        push(item.otype ?? null);
        push(item.address1 ?? null);
        push(item.city ?? null);
        push(item.zip ?? null);
        if (hasHoldUntil) push(item.due_date ?? null);
        if (hasInspectorCode) push(item.inspector_code ?? null);
        if (hasClientCode) push(item.client_code ?? null);
        if (hasOwnerName) push(item.owner_name ?? null);
        push(item.status ?? "open");
        push(item.batch_id ?? null);
        push(new Date().toISOString());
        push("available");

        placeholders.push(`(${rowPlaceholders.join(", ")})`);
      });

      const updateSet = cols
        .filter((c) => c !== "external_id" && c !== "app_status")
        .map((c) => {
          if (c !== "hold_until") return `${c} = excluded.${c}`;
          // If the assistant confirmed due date, do not overwrite hold_until via pool import.
          if (!hasDueDateConfirmed) return `hold_until = excluded.hold_until`;
          return `hold_until = case when coalesce(orders.due_date_confirmed, false) then orders.hold_until else excluded.hold_until end`;
        })
        .join(", ");

      const sql = `
        insert into public.orders
          (${cols.join(", ")})
        values
          ${placeholders.join(", ")}
        on conflict (external_id)
        do update set
          ${updateSet},
          updated_at = now()
        returning
          id,
          external_id as worder,
          otype,
          address1,
          ${includeAddress2 ? "address2" : "null as address2"},
          city,
          zip,
          ${hasHoldUntil ? "hold_until as due_date" : "null as due_date"},
          ${hasInspectorCode ? "inspector_code" : "null as inspector_code"},
          ${hasClientCode ? "client_code" : "null as client_code"},
          ${hasOwnerName ? "owner_name" : "null as owner_name"},
          ${hasPoolStatus ? "pool_status as status" : "null as status"},
          ${hasLastSeenBatchId ? "last_seen_batch_id as batch_id" : "null as batch_id"},
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
