import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { hasColumn } from "../../_lib/schema.js";

export const config = { runtime: "nodejs" };

type ScopeCategory = { name: string; items: string[] };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function buildAddress(order: any) {
  const parts = [order?.address1, order?.address2, order?.city, order?.state, order?.zip].filter(Boolean);
  return parts.length ? parts.join(" ").trim() : null;
}

function normalizeCategories(content: any): ScopeCategory[] {
  if (!Array.isArray(content)) return [];
  return content
    .map((c) => ({
      name: typeof c?.name === "string" ? c.name : "",
      items: Array.isArray(c?.items) ? c.items.filter((x: any) => typeof x === "string") : [],
    }))
    .filter((c) => c.name || c.items.length > 0);
}

function categoriesFromItems(items: any[]): ScopeCategory[] {
  const ordered: ScopeCategory[] = [];
  const byName = new Map<string, ScopeCategory>();

  const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  for (const item of sorted) {
    const name = (item?.area ?? "GERAL").toString();
    const label = item?.label ? String(item.label) : "";
    if (!byName.has(name)) {
      const cat = { name, items: [] as string[] };
      byName.set(name, cat);
      ordered.push(cat);
    }
    if (label) byName.get(name)!.items.push(label);
  }

  return ordered;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      return res.status(204).end();
    }

    const auth = await requireAuth(req);
    const db = getPool();
    const includeAddress2 = await hasColumn(db as any, "orders", "address2");
    const orderAddress2Select = includeAddress2 ? "address2" : "null as address2";
    const oAddress2Select = includeAddress2 ? "o.address2" : "null as address2";

    if (req.method === "GET") {
      const orderId = req.query?.order_id ? String(req.query.order_id) : null; // historically this is WOR/External ID
      const updatedSince = req.query?.updated_since ?? req.query?.updatedSince;
      const where: string[] = [];
      const params: any[] = [];
      const add = (cond: string, value: any) => {
        params.push(value);
        where.push(cond.replace("$$", `$${params.length}`));
      };

      // Non-admin users only see their own summaries
      if (auth.user.role === "user") {
        params.push([auth.user.id, auth.clerkUserId]);
        where.push(`s.created_by::text = any($${params.length})`);
      }

      let orderRow: any | null = null;
      if (orderId) {
        if (isUuidLike(orderId)) {
          const r = await db.query(
            `select id, external_id, address1, ${orderAddress2Select}, city, state, zip from public.orders where id = $1 limit 1`,
            [orderId]
          );
          orderRow = r.rows?.[0] ?? null;
        } else {
          const r = await db.query(
            `select id, external_id, address1, ${orderAddress2Select}, city, state, zip from public.orders where external_id = $1 limit 1`,
            [orderId]
          );
          orderRow = r.rows?.[0] ?? null;
        }
        if (!orderRow) return res.status(200).json({ ok: true, summaries: [] });
        add("s.order_id = $$", orderRow.id);
      }

      if (updatedSince) add("s.updated_at > $$", String(updatedSince));

      const whereSql = where.length ? `where ${where.join(" and ")}` : "";
      const sql = `
        select
          s.id,
          s.order_id,
          o.external_id,
          o.address1,
          ${oAddress2Select},
          o.city,
          o.state,
          o.zip,
          s.loss_reason,
          s.route_point,
          s.created_by as created_by_raw,
          uc.id as created_by,
          uc.clerk_user_id as created_by_clerk_user_id,
          s.created_at,
          s.updated_at
        from public.scopes s
        join public.orders o on o.id = s.order_id
        left join public.users uc
          on (uc.id::text = s.created_by::text or uc.clerk_user_id = s.created_by::text)
        ${whereSql}
        order by s.created_at desc
      `;
      const r = await db.query(sql, params);
      const scopes = r.rows ?? [];
      if (scopes.length === 0) return res.status(200).json({ ok: true, summaries: [] });

      const scopeIds = scopes.map((s: any) => s.id);
      const itemsRes = await db.query(
        `
          select scope_id, sort_order, area, label
          from public.scope_items
          where scope_id = any($1)
          order by scope_id asc, sort_order asc nulls last, created_at asc
        `,
        [scopeIds]
      );

      const itemsByScopeId = new Map<string, any[]>();
      for (const row of itemsRes.rows ?? []) {
        const list = itemsByScopeId.get(row.scope_id) ?? [];
        list.push(row);
        itemsByScopeId.set(row.scope_id, list);
      }

      const summaries = scopes.map((s: any) => {
        const address = buildAddress(s);
        const items = itemsByScopeId.get(s.id) ?? [];
        return {
          id: s.id,
          order_id: s.external_id, // WOR/external id (legacy contract)
          address,
          loss_reason: s.loss_reason ?? null,
          route_point: s.route_point ?? null,
          content: categoriesFromItems(items),
          created_by: s.created_by,
          created_by_raw: s.created_by_raw ?? null,
          created_by_clerk_user_id: s.created_by_clerk_user_id ?? null,
          created_at: s.created_at,
          updated_at: s.updated_at ?? null,
        };
      });

      return res.status(200).json({ ok: true, summaries });
    }

    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      const body = parseBody(req);
      if (!body.order_id) throw new HttpError(400, "order_id is required");

      const externalId = String(body.order_id);
      const orderRes = await db.query(
        `select id, external_id, address1, ${orderAddress2Select}, city, state, zip from public.orders where external_id = $1 limit 1`,
        [externalId]
      );
      const order = orderRes.rows?.[0] ?? null;
      if (!order) throw new HttpError(404, "Order not found (import pool first)");

      const categories = normalizeCategories(body.content);
      const flattened: Array<{ area: string | null; label: string; sort_order: number }> = [];
      let idx = 1;
      for (const cat of categories) {
        for (const item of cat.items) {
          flattened.push({ area: cat.name || null, label: item, sort_order: idx++ });
        }
      }

      const existingRes = await db.query(
        `
          select id
          from public.scopes
          where order_id = $1 and created_by::text = any($2::text[]) and archived_at is null
          order by created_at desc
          limit 1
        `,
        [order.id, [auth.user.id, auth.clerkUserId]]
      );
      const existingScopeId: string | null = existingRes.rows?.[0]?.id ?? null;

      let scopeId = existingScopeId;

      if (!scopeId) {
        const ins = await db.query(
          `
            insert into public.scopes
              (order_id, external_id, kind, loss_reason, route_point, visibility, created_by, created_at, updated_at, archived_at)
            values
              ($1, $2, $3, $4, $5, 'private', $6, now(), now(), null)
            returning id, created_at, updated_at
          `,
          [order.id, externalId, "default", body.loss_reason ?? null, body.route_point ?? null, auth.user.id]
        );
        scopeId = ins.rows?.[0]?.id ?? null;
      } else {
        await db.query(
          `
            update public.scopes
            set loss_reason = $2,
                route_point = $3,
                updated_at = now()
            where id = $1
          `,
          [scopeId, body.loss_reason ?? null, body.route_point ?? null]
        );
        await db.query(`delete from public.scope_items where scope_id = $1`, [scopeId]);
      }

      if (!scopeId) throw new HttpError(500, "Failed to create scope");

      for (const row of flattened) {
        await db.query(
          `
            insert into public.scope_items
              (scope_id, sort_order, area, label, notes, required, done, done_at, done_by_user_id, done_by_inspector_id, created_at, updated_at)
            values
              ($1, $2, $3, $4, null, true, false, null, null, null, now(), now())
          `,
          [scopeId, row.sort_order, row.area, row.label]
        );
      }

      const itemsRes = await db.query(`select id, scope_id, sort_order, area, label from public.scope_items where scope_id = $1`, [
        scopeId,
      ]);

      return res.status(200).json({
        ok: true,
        summary: {
          id: scopeId,
          order_id: order.external_id,
          address: body.address ?? buildAddress(order),
          loss_reason: body.loss_reason ?? null,
          route_point: body.route_point ?? null,
          content: categoriesFromItems(itemsRes.rows ?? []),
          created_by: auth.user.id,
          created_at: new Date().toISOString(),
        },
      });
    }

    return res.status(405).json({
      ok: false,
      error: `Method not allowed: ${req.method}`,
      method: req.method,
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

