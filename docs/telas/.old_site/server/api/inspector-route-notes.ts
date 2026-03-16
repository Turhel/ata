import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
import { HttpError, requireAuth } from "../_lib/auth.js";
import { hasTable } from "../_lib/schema.js";
import { resolveUserId } from "../_lib/users.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();
    const hasInspectorRouteNotes = await hasTable(db as any, "inspector_route_notes");

    if (req.method === "GET") {
      const q = req.query ?? {};
      const assistantParam = q.assistant_id ? String(q.assistant_id) : null;
      const reportDate = q.report_date ? String(q.report_date) : null;
      const updatedSince = q.updated_since ?? q.updatedSince;
      if (!reportDate) throw new HttpError(400, "report_date is required");

      if (!hasInspectorRouteNotes) {
        return res.status(200).json({ ok: true, notes: [], missingTable: true });
      }

      const assistantId = assistantParam ? await resolveUserId(db as any, assistantParam) : auth.user.id;

      // compat: algumas linhas antigas podem ter assistant_id = clerk_user_id
      const assistantTextIds = assistantParam?.startsWith("user_")
        ? [String(assistantId), String(assistantParam)]
        : [String(assistantId), auth.clerkUserId];

      const params: any[] = [assistantTextIds, reportDate];
      let whereSql = "where assistant_id::text = any($1) and report_date = $2";
      if (updatedSince) {
        params.push(String(updatedSince));
        whereSql += ` and created_at > $${params.length}`;
      }
      const sql = `
        select
          id,
          assistant_id,
          inspector_id,
          inspector_code,
          report_date,
          stop_point,
          skipped_points,
          skipped_reason,
          created_at
        from public.inspector_route_notes
        ${whereSql}
        order by created_at desc
      `;
      const r = await db.query(sql, params);
      return res.status(200).json({ ok: true, notes: r.rows ?? [], missingTable: false });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      if (!body.inspector_id || !body.report_date) {
        throw new HttpError(400, "inspector_id and report_date are required");
      }

      if (!hasInspectorRouteNotes) {
        return res.status(200).json({ ok: true, note: null, missingTable: true });
      }

      const sql = `
        insert into public.inspector_route_notes
          (assistant_id, inspector_id, inspector_code, report_date, stop_point, skipped_points, skipped_reason, created_at)
        values
          ($1, $2, $3, $4, $5, $6, $7, now())
        returning
          id,
          assistant_id,
          inspector_id,
          inspector_code,
          report_date,
          stop_point,
          skipped_points,
          skipped_reason,
          created_at
      `;
      const r = await db.query(sql, [
        auth.user.id,
        body.inspector_id,
        body.inspector_code ?? null,
        body.report_date,
        body.stop_point ?? null,
        body.skipped_points ?? null,
        body.skipped_reason ?? null,
      ]);
      return res.status(200).json({ ok: true, note: r.rows?.[0] ?? null, missingTable: false });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
