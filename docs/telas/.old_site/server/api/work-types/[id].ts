import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { WorkTypeUpdateSchema, validateData } from "../../_lib/schemas.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    if (auth.user.role !== "master") {
      throw new HttpError(403, "Forbidden");
    }
    const db = getPool();

    const id = req.query?.id ? String(req.query.id) : null;
    if (!id) throw new HttpError(400, "Missing id");

    if (req.method !== "PATCH") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = parseBody(req);
    const validatedData = validateData(WorkTypeUpdateSchema, body);

    const fields: string[] = [];
    const params: any[] = [];
    const add = (key: string, value: any) => {
      params.push(value);
      fields.push(`${key} = $${params.length}`);
    };

    if (validatedData.code !== undefined) add("code", validatedData.code.toUpperCase().trim());
    if (validatedData.description !== undefined) {
      add("description", validatedData.description ? validatedData.description.trim() : null);
    }
    if (validatedData.category !== undefined) add("category", validatedData.category);
    if (validatedData.assistant_value !== undefined) add("assistant_value", Number(validatedData.assistant_value ?? 0));
    if (validatedData.inspector_value !== undefined) add("inspector_value", Number(validatedData.inspector_value ?? 0));
    if (validatedData.active !== undefined) add("active", !!validatedData.active);

    if (!fields.length) throw new HttpError(400, "No fields to update");

    params.push(id);
    const sql = `
      update public.work_types
      set ${fields.join(", ")}, updated_at = now()
      where id = $${params.length}
    `;
    await db.query(sql, params);
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
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

