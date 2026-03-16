import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { getPool } from "../../../_lib/db.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";
import { hasTable } from "../../../_lib/schema.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

function asId(v: any): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["master"] });
    const db = getPool();

    const hasUserPersonas = await hasTable(db as any, "user_personas");
    const hasAssignments = await hasTable(db as any, "inspector_user_assignments");
    const hasInspectorsDirectory = await hasTable(db as any, "inspectors_directory");
    const hasInspectors = await hasTable(db as any, "inspectors");
    const inspectorsTable = hasInspectorsDirectory ? "inspectors_directory" : hasInspectors ? "inspectors" : null;

    if (!hasUserPersonas || !hasAssignments || !inspectorsTable) {
      throw new HttpError(
        503,
        "Missing migrations: user_personas / inspector_user_assignments / inspectors(_directory)"
      );
    }

    if (req.method === "GET") {
      const assignmentsResult = await db.query(
        `
          select
            a.id,
            a.user_id,
            a.inspector_id,
            a.assigned_by,
            a.assigned_at,
            a.unassigned_at,
            a.unassigned_by,
            a.notes,
            u.full_name as user_full_name,
            u.email as user_email,
            u.clerk_user_id as user_clerk_user_id,
            i.code as inspector_code,
            i.name as inspector_name,
            i.active as inspector_active
          from public.inspector_user_assignments a
          left join public.users u on u.id = a.user_id
          left join public.${inspectorsTable} i on i.id = a.inspector_id
          where a.unassigned_at is null
          order by a.assigned_at desc
        `
      );

      const pendingUsersResult = await db.query(
        `
          select u.id, u.full_name, u.email, u.clerk_user_id, u.created_at
          from public.user_personas up
          join public.users u on u.id = up.user_id
          left join public.inspector_user_assignments a
            on a.user_id = up.user_id and a.unassigned_at is null
          where up.persona = 'inspector'
            and a.id is null
          order by u.created_at desc
          limit 200
        `
      );

      return res.status(200).json({
        ok: true,
        assignments: assignmentsResult.rows ?? [],
        pending_users: pendingUsersResult.rows ?? [],
      });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const userId = asId(body.user_id ?? body.userId);
      const inspectorId = asId(body.inspector_id ?? body.inspectorId);
      const notes = typeof body.notes === "string" ? body.notes.trim() : null;

      if (!userId) throw new HttpError(400, "user_id is required");
      if (!inspectorId) throw new HttpError(400, "inspector_id is required");

      await db.query("begin");
      try {
        const personaResult = await db.query(
          `select persona from public.user_personas where user_id = $1`,
          [userId]
        );
        if (personaResult.rows?.[0]?.persona !== "inspector") {
          throw new HttpError(400, "User is not marked as persona=inspector");
        }

        const inspectorExists = await db.query(
          `select id from public.${inspectorsTable} where id = $1 limit 1`,
          [inspectorId]
        );
        if ((inspectorExists.rows?.length ?? 0) === 0) {
          throw new HttpError(404, "Inspector code not found");
        }

        const existingUserAssignment = await db.query(
          `
            select id
            from public.inspector_user_assignments
            where user_id = $1 and unassigned_at is null
            limit 1
          `,
          [userId]
        );
        if ((existingUserAssignment.rows?.length ?? 0) > 0) {
          throw new HttpError(409, "User already has an active inspector code assigned");
        }

        const existingInspectorAssignment = await db.query(
          `
            select id
            from public.inspector_user_assignments
            where inspector_id = $1 and unassigned_at is null
            limit 1
          `,
          [inspectorId]
        );
        if ((existingInspectorAssignment.rows?.length ?? 0) > 0) {
          throw new HttpError(409, "Inspector code is already assigned to another user");
        }

        const id = randomUUID();
        const insertResult = await db.query(
          `
            insert into public.inspector_user_assignments
              (id, user_id, inspector_id, assigned_by, assigned_at, notes)
            values ($1, $2, $3, $4, now(), $5)
            returning id, user_id, inspector_id, assigned_by, assigned_at, notes
          `,
          [id, userId, inspectorId, auth.user.id, notes]
        );

        await db.query("commit");
        return res.status(201).json({ ok: true, assignment: insertResult.rows?.[0] ?? null });
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
