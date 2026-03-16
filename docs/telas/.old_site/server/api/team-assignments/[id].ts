import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { hasColumn } from "../../_lib/schema.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["admin", "master"] });
    const db = getPool();
    const hasAvatarUrl = await hasColumn(db as any, "users", "avatar_url");

    const id = req.query?.id ? String(req.query.id) : null;
    if (!id) throw new HttpError(400, "Missing id");

    if (req.method !== "DELETE") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const existing = await db.query(
      `select id, admin_id, assistant_id, assigned_by, assigned_at from public.team_assignments where id = $1`,
      [id]
    );
    const assignment = existing.rows?.[0];
    if (!assignment) throw new HttpError(404, "Assignment not found");

    // Admin can only delete assignments from their own team.
    if (auth.user.role === "admin") {
      const adminRaw = String(assignment.admin_id ?? "");
      const canDelete = adminRaw === auth.user.id || (auth.clerkUserId ? adminRaw === auth.clerkUserId : false);
      if (!canDelete) {
        throw new HttpError(403, "Forbidden");
      }
    }

    await db.query(`delete from public.team_assignments where id = $1`, [id]);

    const assistantSelect = hasAvatarUrl
      ? "id, clerk_user_id, full_name, email, avatar_url"
      : "id, clerk_user_id, full_name, email, null as avatar_url";
    const assistantRow = await db.query(
      `select ${assistantSelect} from public.users where id::text = $1 or clerk_user_id = $1 limit 1`,
      [String(assignment.assistant_id)]
    );
    const assistant = assistantRow.rows?.[0] ?? null;

    const assignedByRaw = assignment.assigned_by ?? null;
    let assignedBy: string | null = null;
    let assignedByClerkUserId: string | null = null;
    if (assignedByRaw) {
      const r = await db.query(
        `select id, clerk_user_id from public.users where id::text = $1 or clerk_user_id = $1 limit 1`,
        [String(assignedByRaw)]
      );
      assignedBy = r.rows?.[0]?.id ?? null;
      assignedByClerkUserId =
        r.rows?.[0]?.clerk_user_id ??
        (typeof assignedByRaw === "string" && assignedByRaw.startsWith("user_") ? assignedByRaw : null);
    }

    const adminRaw = assignment.admin_id ?? null;
    let adminId: string | null = null;
    let adminClerkUserId: string | null = null;
    if (adminRaw) {
      const r = await db.query(
        `select id, clerk_user_id from public.users where id::text = $1 or clerk_user_id = $1 limit 1`,
        [String(adminRaw)]
      );
      adminId = r.rows?.[0]?.id ?? null;
      adminClerkUserId =
        r.rows?.[0]?.clerk_user_id ?? (typeof adminRaw === "string" && adminRaw.startsWith("user_") ? adminRaw : null);
    }

    const assistantRaw = assignment.assistant_id ?? null;
    const assistantClerkUserId =
      assistant?.clerk_user_id ?? (typeof assistantRaw === "string" && assistantRaw.startsWith("user_") ? assistantRaw : null);

    return res.status(200).json({
      ok: true,
      assignment: {
        ...assignment,
        admin_id_raw: adminRaw,
        admin_id: adminId,
        admin_clerk_user_id: adminClerkUserId,
        assistant_id_raw: assistantRaw,
        assistant_id: assistant?.id ?? null,
        assistant_clerk_user_id: assistantClerkUserId,
        assigned_by_raw: assignedByRaw,
        assigned_by: assignedBy,
        assigned_by_clerk_user_id: assignedByClerkUserId,
      },
      assistant: {
        id: assistant?.id ?? assignment.assistant_id,
        clerkUserId: assistantClerkUserId,
        avatarUrl: assistant?.avatar_url ?? null,
        name: assistant?.full_name || "Assistente",
        email: assistant?.email || "",
      },
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
