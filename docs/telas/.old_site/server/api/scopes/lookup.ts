import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { hasTable } from "../../_lib/schema.js";

export const config = { runtime: "nodejs" };

type Persona = "assistant" | "inspector";

async function getPersona(db: any, userId: string): Promise<Persona | null> {
  const r = await db.query(`select persona from public.user_personas where user_id = $1`, [userId]);
  const p = r.rows?.[0]?.persona ?? null;
  return p === "assistant" || p === "inspector" ? p : null;
}

async function getActiveInspectorId(db: any, userId: string): Promise<string | null> {
  const r = await db.query(
    `
      select inspector_id
      from public.inspector_user_assignments
      where user_id = $1 and unassigned_at is null
      order by assigned_at desc
      limit 1
    `,
    [userId]
  );
  const id = r.rows?.[0]?.inspector_id ?? null;
  return typeof id === "string" && id.trim() ? id.trim() : id ? String(id) : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

    const auth = await requireAuth(req);
    const db = getPool();

    const hasUserPersonas = await hasTable(db as any, "user_personas");
    const hasAssignments = await hasTable(db as any, "inspector_user_assignments");

    let persona: Persona | null = null;
    if (hasUserPersonas) {
      persona = await getPersona(db as any, auth.user.id);
    }

    let inspectorId: string | null = null;
    if (persona === "inspector") {
      if (!hasAssignments) throw new HttpError(503, "Missing migrations: inspector_user_assignments");
      inspectorId = await getActiveInspectorId(db as any, auth.user.id);
      if (!inspectorId) throw new HttpError(403, "Inspector is waiting authorization");
    }

    const externalIdRaw = req.query?.external_id ?? req.query?.externalId;
    const externalId = typeof externalIdRaw === "string" ? externalIdRaw.trim() : "";
    if (!externalId) throw new HttpError(400, "external_id is required");

    const orderResult = await db.query(
      `
        select id, external_id, inspector_id
        from public.orders
        where external_id = $1
        order by created_at desc
        limit 1
      `,
      [externalId]
    );
    const order = orderResult.rows?.[0] ?? null;
    if (!order?.id) return res.status(200).json({ ok: true, scope: null });

    if (persona === "inspector") {
      const orderInspectorId = order.inspector_id == null ? null : String(order.inspector_id);
      if (!orderInspectorId || orderInspectorId !== inspectorId) {
        return res.status(200).json({ ok: true, scope: null });
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
          s.created_at,
          s.updated_at,
          s.archived_at,
          o.external_id as order_external_id
        from public.scopes s
        left join public.orders o on o.id = s.order_id
        where s.order_id = $1
          and s.archived_at is null
        order by s.updated_at desc nulls last, s.created_at desc
        limit 1
      `,
      [order.id]
    );
    const scope = scopeResult.rows?.[0] ?? null;
    if (!scope?.id) return res.status(200).json({ ok: true, scope: null });

    const itemsResult = await db.query(
      `
        select id, scope_id, sort_order, area, label, notes, required, done, done_at
        from public.scope_items
        where scope_id = $1
        order by sort_order asc nulls last, created_at asc
      `,
      [scope.id]
    );

    return res.status(200).json({
      ok: true,
      scope: {
        id: scope.id,
        order_id: scope.order_id,
        order_external_id: scope.order_external_id ?? null,
        external_id: scope.external_id ?? scope.order_external_id ?? null,
        kind: scope.kind ?? null,
        loss_reason: scope.loss_reason ?? null,
        route_point: scope.route_point ?? null,
        visibility: scope.visibility ?? null,
        created_at: scope.created_at,
        updated_at: scope.updated_at ?? null,
        items: (itemsResult.rows ?? []).map((row: any) => ({
          id: row.id,
          area: row.area ?? null,
          label: row.label ?? null,
          notes: row.notes ?? null,
          required: row.required ?? true,
          done: row.done ?? false,
          done_at: row.done_at ?? null,
        })),
      },
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

