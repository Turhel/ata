import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    if (req.method === "GET") {
      const activeOnly = req.query?.active_only === "true";
      const updatedSince = req.query?.updated_since ?? req.query?.updatedSince;
      const whereParts: string[] = [];
      const params: any[] = [];

      if (activeOnly) whereParts.push("wt.active = true");
      if (updatedSince) {
        params.push(String(updatedSince));
        whereParts.push(`wt.updated_at > $${params.length}`);
      }
      const whereSql = whereParts.length ? `where ${whereParts.join(" and ")}` : "";
      const sql = `
        select
          wt.id,
          wt.code as otype,
          wt.category,
          wt.assistant_value,
          wt.inspector_value,
          wt.active,
          wt.created_at,
          wt.updated_at,
          wt.created_by as created_by_raw,
          u.id as created_by,
          u.clerk_user_id as created_by_clerk_user_id
        from public.work_types wt
        left join public.users u
          on (u.id::text = wt.created_by::text or u.clerk_user_id = wt.created_by::text)
        ${whereSql}
        order by wt.code
      `;
      const r = await db.query(sql, params);
      return res.status(200).json({ ok: true, pricing: r.rows ?? [] });
    }

    if (req.method === "POST") {
      await requireAuth(req, { roles: ["master"] });
      const body = parseBody(req);
      if (!body.otype || !body.category) throw new HttpError(400, "otype and category are required");

      const code = String(body.otype).toUpperCase().trim();
      const category = String(body.category);
      const assistantValue = Number(body.assistant_value ?? 0);
      const inspectorValue = Number(body.inspector_value ?? 0);
      const active = body.active ?? true;

      // Pricing é armazenado na tabela work_types (substitui order_pricing)
      await db.query(
        `
          update public.work_types
          set
            code = $1,
            category = $2,
            assistant_value = $3,
            inspector_value = $4,
            active = $5,
            updated_at = now()
          where code = $1
        `,
        [code, category, assistantValue, inspectorValue, !!active]
      );

      const r = await db.query(
        `
          select
            wt.id,
            wt.code as otype,
            wt.category,
            wt.assistant_value,
            wt.inspector_value,
            wt.active,
            wt.created_at,
            wt.updated_at,
            wt.created_by as created_by_raw,
            u.id as created_by,
            u.clerk_user_id as created_by_clerk_user_id
          from public.work_types wt
          left join public.users u
            on (u.id::text = wt.created_by::text or u.clerk_user_id = wt.created_by::text)
          where wt.code = $1
          limit 1
        `,
        [code]
      );
      if (!r.rows?.[0]) throw new HttpError(404, `Work type not found for otype=${code}`);

      return res.status(200).json({ ok: true, pricing: r.rows[0] });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

