import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

function isUuid(value: string) {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

async function resolveOrderId(db: any, input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new HttpError(400, "order_id is required");
  if (isUuid(trimmed)) return trimmed;

  const r = await db.query(`select id from public.orders where external_id = $1 order by created_at desc limit 1`, [
    trimmed,
  ]);
  const row = r.rows?.[0];
  if (!row?.id) throw new HttpError(404, "Order not found");
  return row.id;
}

async function getOrderExternalId(db: any, orderId: string): Promise<string | null> {
  const r = await db.query(`select external_id from public.orders where id = $1`, [orderId]);
  return r.rows?.[0]?.external_id ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    if (req.method === "GET") {
      const limitRaw = Number(req.query?.limit ?? 200);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;
      const updatedSince = req.query?.updated_since ?? req.query?.updatedSince;
      const params: any[] = [];
      let whereSql = "";
      if (updatedSince) {
        params.push(String(updatedSince));
        whereSql = `where s.updated_at > $${params.length}`;
      }

      const scopesResult = await db.query(
        `
          select
            s.id,
            s.order_id,
            s.external_id,
            s.kind,
            s.loss_reason,
            s.route_point,
            s.visibility,
            s.created_by as created_by_raw,
            u.id as created_by,
            u.clerk_user_id as created_by_clerk_user_id,
            s.created_at,
            s.updated_at,
            s.archived_at,
            o.external_id as order_external_id
          from public.scopes s
          left join public.orders o on o.id = s.order_id
          left join public.users u
            on (u.id::text = s.created_by::text or u.clerk_user_id = s.created_by::text)
          ${whereSql}
          order by s.updated_at desc, s.id desc
          limit $${params.length + 1}
        `,
        [...params, limit]
      );

      const scopes = scopesResult.rows ?? [];
      if (scopes.length === 0) {
        return res.status(200).json({ ok: true, scopes: [] });
      }

      const scopeIds = scopes.map((s: any) => s.id);
      const itemsResult = await db.query(
        `
          select
            si.id,
            si.scope_id,
            si.sort_order,
            si.area,
            si.label,
            si.notes,
            si.required,
            si.done,
            si.done_at,
            si.done_by_user_id as done_by_user_id_raw,
            du.id as done_by_user_id,
            du.clerk_user_id as done_by_user_clerk_user_id,
            si.done_by_inspector_id,
            si.created_at,
            si.updated_at
          from public.scope_items si
          left join public.users du
            on (du.id::text = si.done_by_user_id::text or du.clerk_user_id = si.done_by_user_id::text)
          where si.scope_id = any($1)
          order by si.scope_id asc, si.sort_order asc nulls last, si.created_at asc
        `,
        [scopeIds]
      );

      const itemsByScope = new Map<string, any[]>();
      (itemsResult.rows ?? []).forEach((item: any) => {
        if (!itemsByScope.has(item.scope_id)) itemsByScope.set(item.scope_id, []);
        itemsByScope.get(item.scope_id)?.push({
          id: item.id,
          scope_id: item.scope_id,
          sort_order: item.sort_order ?? null,
          area: item.area ?? null,
          label: item.label ?? null,
          notes: item.notes ?? null,
          required: item.required ?? true,
          done: item.done ?? false,
          done_at: item.done_at ?? null,
          done_by_user_id: item.done_by_user_id ?? null,
          done_by_user_id_raw: item.done_by_user_id_raw ?? null,
          done_by_user_clerk_user_id: item.done_by_user_clerk_user_id ?? null,
          done_by_inspector_id: item.done_by_inspector_id ?? null,
          created_at: item.created_at,
          updated_at: item.updated_at ?? null,
        });
      });

      const payload = scopes.map((scope: any) => ({
        id: scope.id,
        order_id: scope.order_id,
        order_external_id: scope.order_external_id ?? null,
        external_id: scope.external_id ?? scope.order_external_id ?? null,
        kind: scope.kind ?? null,
        loss_reason: scope.loss_reason ?? null,
        route_point: scope.route_point ?? null,
        visibility: scope.visibility ?? "private",
        created_by: scope.created_by,
        created_by_raw: scope.created_by_raw ?? null,
        created_by_clerk_user_id: scope.created_by_clerk_user_id ?? null,
        created_at: scope.created_at,
        updated_at: scope.updated_at ?? null,
        archived_at: scope.archived_at ?? null,
        items: itemsByScope.get(scope.id) ?? [],
      }));

      return res.status(200).json({ ok: true, scopes: payload });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const orderInput = String(body.order_id ?? "");
      const kind = body.kind ?? body.scope_label ?? null;
      const lossReason = body.loss_reason ?? body.description ?? null;
      const routePoint = body.route_point ?? null;
      const visibility = body.visibility ?? "private";
      const items = Array.isArray(body.items) ? body.items : [];

      const orderId = await resolveOrderId(db, orderInput);
      const orderExternalId = await getOrderExternalId(db, orderId);

      await db.query("begin");
      try {
        const insertScope = await db.query(
          `
            insert into public.scopes
              (order_id, external_id, kind, loss_reason, route_point, visibility, created_by, created_at, updated_at)
            values ($1, $2, $3, $4, $5, $6, $7, now(), now())
            returning id, order_id, external_id, kind, loss_reason, route_point, visibility, created_by, created_at, updated_at, archived_at
          `,
          [orderId, orderExternalId, kind, lossReason, routePoint, visibility, auth.user.id]
        );

        const scope = insertScope.rows?.[0];
        if (!scope) throw new HttpError(500, "Failed to create scope");

        if (items.length > 0) {
          const values: string[] = [];
          const params: any[] = [];
          items.forEach((item: any, idx: number) => {
            const label = typeof item === "string" ? item : item?.label ?? item?.item_label ?? null;
            if (!label) return;
            const area = typeof item === "string" ? null : item?.area ?? null;
            const notes = typeof item === "string" ? null : item?.notes ?? null;
            const required = typeof item === "string" ? true : item?.required ?? true;
            const sortOrder = typeof item === "string" ? idx + 1 : item?.sort_order ?? idx + 1;

            params.push(scope.id, sortOrder, area, label, notes, required);
            values.push(
              `($${params.length - 5}, $${params.length - 4}, $${params.length - 3}, $${params.length - 2}, $${params.length - 1}, $${params.length})`
            );
          });
          if (values.length > 0) {
            await db.query(
              `
                insert into public.scope_items (scope_id, sort_order, area, label, notes, required)
                values ${values.join(", ")}
              `,
              params
            );
          }
        }

        const itemsResult = await db.query(
          `
            select
              si.id,
              si.scope_id,
              si.sort_order,
              si.area,
              si.label,
              si.notes,
              si.required,
              si.done,
              si.done_at,
              si.done_by_user_id as done_by_user_id_raw,
              du.id as done_by_user_id,
              du.clerk_user_id as done_by_user_clerk_user_id,
              si.done_by_inspector_id,
              si.created_at,
              si.updated_at
            from public.scope_items si
            left join public.users du
              on (du.id::text = si.done_by_user_id::text or du.clerk_user_id = si.done_by_user_id::text)
            where si.scope_id = $1
            order by si.sort_order asc nulls last, si.created_at asc
          `,
          [scope.id]
        );

        await db.query("commit");
        return res.status(200).json({
          ok: true,
          scope: {
            ...scope,
            order_external_id: orderExternalId,
            items: itemsResult.rows ?? [],
          },
        });
      } catch (err) {
        await db.query("rollback");
        throw err;
      }
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

