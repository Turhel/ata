import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../../_lib/db.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";
import { hasTable } from "../../../_lib/schema.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["master"] });
    const db = getPool();

    const hasAssignments = await hasTable(db as any, "inspector_user_assignments");
    if (!hasAssignments) {
      throw new HttpError(503, "Missing migrations: public.inspector_user_assignments");
    }

    const id = String((req.query as any)?.id ?? "").trim();
    if (!id) throw new HttpError(400, "id is required");

    if (req.method === "PATCH") {
      const body = parseBody(req);
      const action = String(body.action ?? "").trim();
      if (action !== "unassign") throw new HttpError(400, "Invalid action (expected unassign)");

      const result = await db.query(
        `
          update public.inspector_user_assignments
          set unassigned_at = now(), unassigned_by = $2
          where id = $1 and unassigned_at is null
          returning id, user_id, inspector_id, assigned_at, assigned_by, unassigned_at, unassigned_by
        `,
        [id, auth.user.id]
      );

      const row = result.rows?.[0];
      if (!row) throw new HttpError(404, "Active assignment not found");

      return res.status(200).json({ ok: true, assignment: row });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

