import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { hasTable } from "../../_lib/schema.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["admin", "master"] });
    const db = getPool();
    const hasImportBatches = await hasTable(db as any, "import_batches");

    if (!hasImportBatches) {
      if (req.method === "GET") {
        return res.status(200).json({
          ok: true,
          batches: [],
          warning: { code: "missing_table", table: "import_batches" },
        });
      }
      throw new HttpError(503, "Missing table: public.import_batches");
    }

    if (req.method === "GET") {
      const updatedSince = req.query?.updated_since ?? req.query?.updatedSince;
      const params: any[] = [];
      let whereSql = "";
      if (updatedSince) {
        params.push(String(updatedSince));
        whereSql = `where b.imported_at > $${params.length}`;
      }
      const sql = `
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
        ${whereSql}
        order by b.imported_at desc
        limit 50
      `;
      try {
        const r = await db.query(sql, params);
        return res.status(200).json({ ok: true, batches: r.rows ?? [] });
      } catch (e: any) {
        return res.status(200).json({
          ok: true,
          batches: [],
          warning: { code: "query_failed", error: e?.message ?? "query failed" },
        });
      }
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      if (!body.source_filename) throw new HttpError(400, "source_filename is required");
      const batchId = typeof body.id === "string" && body.id.trim() ? body.id.trim() : randomUUID();

      const sql = `
        insert into public.import_batches
          (id, source_filename, source_type, imported_at, imported_by, total_rows, notes)
        values
          ($1, $2, $3, $4, $5, $6, $7)
        returning id
      `;
      const ins = await db.query(sql, [
        batchId,
        String(body.source_filename),
        body.source_type ?? "xlsx",
        body.imported_at ?? new Date().toISOString(),
        auth.user.id,
        Number(body.total_rows ?? 0),
        body.notes ?? null,
      ]);
      const createdId = ins.rows?.[0]?.id ?? null;
      if (!createdId) throw new HttpError(500, "Failed to create import batch");
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
        [createdId]
      );
      return res.status(200).json({ ok: true, batch: r.rows?.[0] ?? null });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

