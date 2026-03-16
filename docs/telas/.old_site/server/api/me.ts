import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../_lib/auth.js";
import { getPool } from "../_lib/db.js";
import { hasColumn, hasTable } from "../_lib/schema.js";

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

type Persona = "assistant" | "inspector";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const method = req.method || "GET";
    if (method !== "GET" && method !== "PATCH") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const auth = await requireAuth(req);
    const db = getPool();

    const hasAvatarUrl = await hasColumn(db as any, "users", "avatar_url");
    const hasUserPersonas = await hasTable(db as any, "user_personas");
    const hasInspectorProfiles = await hasTable(db as any, "inspector_profiles");
    const hasInspectorAssignments = await hasTable(db as any, "inspector_user_assignments");
    const hasInspectorsDirectory = await hasTable(db as any, "inspectors_directory");
    const hasInspectors = await hasTable(db as any, "inspectors");
    const inspectorsTable = hasInspectorsDirectory ? "inspectors_directory" : hasInspectors ? "inspectors" : null;

    if (method === "PATCH") {
      const body = parseBody(req);
      const updates: string[] = [];
      const params: any[] = [];

      if (body.email !== undefined) {
        params.push(body.email ?? null);
        updates.push(`email = $${params.length}`);
      }
      if (body.full_name !== undefined) {
        params.push(body.full_name ?? null);
        updates.push(`full_name = $${params.length}`);
      }
      if (body.phone !== undefined) {
        params.push(body.phone ?? null);
        updates.push(`phone = $${params.length}`);
      }
      if (body.weekly_goal !== undefined) {
        const weeklyGoal = Number(body.weekly_goal);
        if (Number.isNaN(weeklyGoal)) {
          return res.status(400).json({ ok: false, error: "weekly_goal must be a number" });
        }
        params.push(weeklyGoal);
        updates.push(`weekly_goal = $${params.length}`);
      }
      if (body.avatar_url !== undefined && hasAvatarUrl) {
        const raw = body.avatar_url == null ? null : String(body.avatar_url).trim();
        if (raw && raw.length > 2048) {
          return res.status(400).json({ ok: false, error: "avatar_url too long" });
        }
        if (raw && !/^https?:\/\//i.test(raw)) {
          return res.status(400).json({ ok: false, error: "avatar_url must be an http(s) URL" });
        }
        params.push(raw || null);
        updates.push(`avatar_url = $${params.length}`);
      }

      if (updates.length > 0) {
        params.push(auth.user.id);
        const returning = [
          "id",
          "clerk_user_id",
          "role",
          "full_name",
          "email",
          "phone",
          "weekly_goal",
          hasAvatarUrl ? "avatar_url" : "null as avatar_url",
          "active",
          "created_at",
          "updated_at",
        ].join(", ");
        const updateSql = `
          update public.users
          set ${updates.join(", ")}, updated_at = now()
          where id = $${params.length}
          returning ${returning}
        `;
        const updateResult = await db.query(updateSql, params);
        const updated = updateResult.rows?.[0] ?? null;
        return res.status(200).json({
          ok: true,
          clerkUserId: auth.clerkUserId,
          sessionId: auth.sessionId,
          user: updated ?? auth.user,
        });
      }
    }

    let persona: Persona | null = null;
    if (hasUserPersonas) {
      const personaResult = await db.query(
        `select persona from public.user_personas where user_id = $1`,
        [auth.user.id]
      );
      const p = personaResult.rows?.[0]?.persona ?? null;
      if (p === "assistant" || p === "inspector") persona = p;
    }

    let inspector: any = null;
    if (persona === "inspector") {
      let origin: any = null;
      if (hasInspectorProfiles) {
        const profileResult = await db.query(
          `
            select origin_city, origin_state, origin_zip
            from public.inspector_profiles
            where user_id = $1
          `,
          [auth.user.id]
        );
        origin = profileResult.rows?.[0] ?? null;
      }

      let assignment: any = null;
      if (hasInspectorAssignments) {
        if (inspectorsTable) {
          const assignmentResult = await db.query(
            `
              select
                a.id,
                a.inspector_id,
                a.assigned_at,
                i.code as inspector_code,
                i.name as inspector_name
              from public.inspector_user_assignments a
              left join public.${inspectorsTable} i on i.id = a.inspector_id
              where a.user_id = $1 and a.unassigned_at is null
              order by a.assigned_at desc
              limit 1
            `,
            [auth.user.id]
          );
          assignment = assignmentResult.rows?.[0] ?? null;
        } else {
          const assignmentResult = await db.query(
            `
              select id, inspector_id, assigned_at
              from public.inspector_user_assignments
              where user_id = $1 and unassigned_at is null
              order by assigned_at desc
              limit 1
            `,
            [auth.user.id]
          );
          assignment = assignmentResult.rows?.[0] ?? null;
        }
      }

      inspector = { origin, assignment };
    }

    return res.status(200).json({
      ok: true,
      clerkUserId: auth.clerkUserId,
      sessionId: auth.sessionId,
      user: auth.user,
      persona,
      inspector,
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
