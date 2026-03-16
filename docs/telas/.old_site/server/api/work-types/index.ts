import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { WorkTypeCreateSchema, validateData } from "../../_lib/schemas.js";

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
      const updatedSince = req.query?.updated_since ?? req.query?.updatedSince;
      const params: any[] = [];
      let whereSql = "";
      if (updatedSince) {
        params.push(String(updatedSince));
        whereSql = `where wt.created_at > $${params.length}`;
      }
      const sql = `
        select
          wt.id,
          wt.code,
          wt.description,
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
        order by wt.code asc
      `;
      const r = await db.query(sql, params);
      return res.status(200).json({ ok: true, workTypes: r.rows ?? [] });
    }

    if (req.method === "POST") {
      if (auth.user.role !== "master") {
        throw new HttpError(403, "Forbidden");
      }

      const body = parseBody(req);
      const validatedData = validateData(WorkTypeCreateSchema, body);
      const code = validatedData.code.toUpperCase().trim();

      const insert = await db.query(
        `
          insert into public.work_types
            (code, description, category, assistant_value, inspector_value, active, created_by, created_at, updated_at)
          values
            ($1, $2, $3, $4, $5, $6, $7, now(), now())
          returning id
        `,
        [
          code,
          validatedData.description ? String(validatedData.description).trim() : null,
          String(validatedData.category),
          Number(validatedData.assistant_value ?? 0),
          Number(validatedData.inspector_value ?? 0),
          validatedData.active ?? true,
          auth.user.id,
        ]
      );
      const id = insert.rows?.[0]?.id ?? null;
      if (!id) throw new HttpError(500, "Failed to create work type");

      const r = await db.query(
        `
          select
            wt.id,
            wt.code,
            wt.description,
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
          where wt.id = $1
          limit 1
        `,
        [id]
      );
      return res.status(200).json({ ok: true, workType: r.rows?.[0] ?? null });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

