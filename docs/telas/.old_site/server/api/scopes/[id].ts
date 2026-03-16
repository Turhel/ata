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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    const id = req.query?.id ? String(req.query.id) : null;
    if (!id) throw new HttpError(400, "Missing id");

    async function requireCanEditScope() {
      const r = await db.query(`select created_by from public.scopes where id = $1`, [id]);
      const createdBy = r.rows?.[0]?.created_by ?? null;
      if (!createdBy) throw new HttpError(404, "Scope not found");
      const canEdit =
        auth.user.role === "master" ||
        auth.user.role === "admin" ||
        createdBy === auth.user.id ||
        createdBy === auth.clerkUserId; // compat (linhas antigas)
      if (!canEdit) throw new HttpError(403, "Forbidden");
      return createdBy as string;
    }

    if (req.method === "DELETE") {
      await requireCanEditScope();
      await db.query("begin");
      try {
        await db.query(`delete from public.scope_items where scope_id = $1`, [id]);
        await db.query(`delete from public.scopes where id = $1`, [id]);
        await db.query("commit");
      } catch (err) {
        await db.query("rollback");
        throw err;
      }

      return res.status(200).json({ ok: true });
    }

    if (req.method === "PATCH") {
      await requireCanEditScope();
      const body = parseBody(req);
      const updates: string[] = [];
      const params: any[] = [];

      if (body.kind !== undefined) {
        params.push(body.kind ?? null);
        updates.push(`kind = $${params.length}`);
      }
      if (body.loss_reason !== undefined) {
        params.push(body.loss_reason ?? null);
        updates.push(`loss_reason = $${params.length}`);
      }
      if (body.route_point !== undefined) {
        params.push(body.route_point ?? null);
        updates.push(`route_point = $${params.length}`);
      }
      if (body.visibility !== undefined) {
        params.push(body.visibility ?? "private");
        updates.push(`visibility = $${params.length}`);
      }
      if (body.archived_at !== undefined) {
        params.push(body.archived_at ?? null);
        updates.push(`archived_at = $${params.length}`);
      }
      if (body.order_id !== undefined) {
        const orderId = await resolveOrderId(db, String(body.order_id ?? ""));
        params.push(orderId);
        updates.push(`order_id = $${params.length}`);
      }

      const items = Array.isArray(body.items) ? body.items : null;

      const itemUpdates = Array.isArray(body.item_updates) ? body.item_updates : null;
      if (itemUpdates && itemUpdates.length > 0) {
        await db.query("begin");
        try {
          for (const u of itemUpdates) {
            const itemId = String(u?.id ?? "");
            if (!itemId) continue;
            const done = !!u?.done;
            if (done) {
              await db.query(
                `
                  update public.scope_items
                  set done = true,
                      done_at = now(),
                      done_by_user_id = $1,
                      updated_at = now()
                  where id = $2 and scope_id = $3
                `,
                [auth.user.id, itemId, id]
              );
            } else {
              await db.query(
                `
                  update public.scope_items
                  set done = false,
                      done_at = null,
                      done_by_user_id = null,
                      updated_at = now()
                  where id = $1 and scope_id = $2
                `,
                [itemId, id]
              );
            }
          }
          await db.query("commit");
        } catch (err) {
          await db.query("rollback");
          throw err;
        }
      }

      await db.query("begin");
      try {
        if (updates.length > 0) {
          params.push(id);
          await db.query(
            `
              update public.scopes
              set ${updates.join(", ")}, updated_at = now()
              where id = $${params.length}
            `,
            params
          );
        }

        if (items) {
          await db.query(`delete from public.scope_items where scope_id = $1`, [id]);

          const values: string[] = [];
          const itemsParams: any[] = [];
          items.forEach((item: any, idx: number) => {
            const label = typeof item === "string" ? item : item?.label ?? item?.item_label ?? null;
            if (!label) return;
            const area = typeof item === "string" ? null : item?.area ?? null;
            const notes = typeof item === "string" ? null : item?.notes ?? null;
            const required = typeof item === "string" ? true : item?.required ?? true;
            const sortOrder = typeof item === "string" ? idx + 1 : item?.sort_order ?? idx + 1;
            const done = typeof item === "string" ? false : !!item?.done;
            const doneByUserId = done ? auth.user.id : null;

            itemsParams.push(id, sortOrder, area, label, notes, required, done, doneByUserId);
            const base = itemsParams.length - 8;
            values.push(
              `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`
            );
          });

          if (values.length > 0) {
            await db.query(
              `
                insert into public.scope_items
                  (scope_id, sort_order, area, label, notes, required, done, done_by_user_id)
                values ${values.join(", ")}
              `,
              itemsParams
            );
          }
        }

        const scopeResult = await db.query(
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
            where s.id = $1
          `,
          [id]
        );
        const scope = scopeResult.rows?.[0];
        if (!scope) throw new HttpError(404, "Scope not found");

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
          [id]
        );

        await db.query("commit");
        return res.status(200).json({
          ok: true,
          scope: {
            ...scope,
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

