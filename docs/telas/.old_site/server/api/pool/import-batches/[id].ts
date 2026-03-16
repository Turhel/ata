import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../../_lib/db.js";
import { hasTable } from "../../../_lib/schema.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireAuth(req, { roles: ["admin", "master"] });
    const db = getPool();
    const hasImportBatches = await hasTable(db as any, "import_batches");
    if (!hasImportBatches) throw new HttpError(503, "Missing table: public.import_batches");

    const id = req.query?.id ? String(req.query.id) : null;
    if (!id) throw new HttpError(400, "Missing id");

    if (req.method !== "PATCH") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = parseBody(req);
    const setParts: string[] = [];
    const params: any[] = [];

    const add = (col: string, value: any) => {
      params.push(value);
      setParts.push(`${col} = $${params.length}`);
    };

    if (body.total_rows !== undefined) add("total_rows", Number(body.total_rows ?? 0));
    if (body.notes !== undefined) add("notes", body.notes ?? null);

    if (setParts.length === 0) throw new HttpError(400, "No fields to update");

    params.push(id);

    const sql = `
      update public.import_batches
      set ${setParts.join(", ")}
      where id = $${params.length}
    `;
    await db.query(sql, params);
    const r = await db.query(
      `
        select
          b.id,
          b.source_filename,
          b.source_type,
          b.imported_at,
          b.imported_by as imported_by_raw,
          u.id as imported_by,
          u.clerk_user_id as imported_by_clerk_user_id,
          b.total_rows,
          b.notes
        from public.import_batches b
        left join public.users u
          on (u.id::text = b.imported_by::text or u.clerk_user_id = b.imported_by::text)
        where b.id = $1
        limit 1
      `,
      [id]
    );
    return res.status(200).json({ ok: true, batch: r.rows?.[0] ?? null });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

