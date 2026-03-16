import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { resolveUserId } from "../../_lib/users.js";
import { hasColumn, hasTable } from "../../_lib/schema.js";
import { fetchClerkAvatarUrls } from "../../_lib/clerk.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["admin", "master"] });
    const db = getPool();

    if (req.method === "GET") {
      const hasUserPersonas = await hasTable(db as any, "user_personas");
      const hasAvatarUrl = await hasColumn(db as any, "users", "avatar_url");
      const usersResult = await db.query(
        `
          select u.id, u.clerk_user_id, u.full_name, u.email, u.role
          ${hasUserPersonas ? ", up.persona" : ""}
          ${hasAvatarUrl ? ", u.avatar_url" : ""}
          from public.users u
          ${hasUserPersonas ? "left join public.user_personas up on up.user_id = u.id" : ""}
          where u.active = true and u.role in ('admin','master','user')
        `
      );
      const users = (usersResult.rows ?? []) as any[];

      // Best-effort: backfill missing avatar_url from Clerk (no need for users to log in after the change).
      const missingClerkIds = users
        .filter((u) => !u?.avatar_url && u?.clerk_user_id)
        .map((u) => String(u.clerk_user_id));
      const clerkAvatarById = await fetchClerkAvatarUrls(missingClerkIds);
      if (clerkAvatarById.size > 0) {
        const updates: { clerk_user_id: string; avatar_url: string }[] = [];
        users.forEach((u) => {
          const clerkId = u?.clerk_user_id ? String(u.clerk_user_id) : "";
          const url = clerkId ? clerkAvatarById.get(clerkId) : null;
          if (!url) return;
          if (!u.avatar_url) u.avatar_url = url;
          updates.push({ clerk_user_id: clerkId, avatar_url: url });
        });

        if (hasAvatarUrl && updates.length > 0) {
          const limited = updates.slice(0, 200);
          const valuesSql = limited.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ");
          const params: any[] = [];
          limited.forEach((v) => {
            params.push(v.clerk_user_id, v.avatar_url);
          });
          await db.query(
            `
              update public.users u
              set avatar_url = v.avatar_url
              from (values ${valuesSql}) as v(clerk_user_id, avatar_url)
              where u.clerk_user_id = v.clerk_user_id
                and (u.avatar_url is null or u.avatar_url = '')
            `,
            params,
          );
        }
      }

      const assignmentsResult = await db.query(
        `select id, admin_id, assistant_id, assigned_by, assigned_at from public.team_assignments`
      );
      const assignments = assignmentsResult.rows ?? [];

      const usersById = new Map(users.map((u: any) => [u.id, u]));
      const usersByClerk = new Map(users.map((u: any) => [u.clerk_user_id, u]));

      const admins = users.filter((u: any) => u.role === "admin");
      const masters = users.filter((u: any) => u.role === "master");
      const assistants = users.filter((u: any) => u.role === "user" && (u.persona ?? null) !== "inspector");

      const allAdmins = [...admins, ...masters];

      const teamsMap = new Map<string, any>();
      allAdmins.forEach((admin: any) => {
        teamsMap.set(admin.id, {
          adminId: admin.id,
          adminClerkUserId: admin.clerk_user_id ?? null,
          adminAvatarUrl: admin.avatar_url ?? null,
          adminName: admin.full_name || "Admin",
          adminEmail: admin.email || "",
          assistants: [],
        });
      });

      const assignedAssistantIds = new Set<string>();
      assignments.forEach((assignment: any) => {
        const adminRaw = assignment.admin_id ?? null;
        const adminUser =
          adminRaw && usersById.has(adminRaw)
            ? usersById.get(adminRaw)
            : adminRaw
              ? usersByClerk.get(adminRaw) ?? null
              : null;
        const team = adminUser?.id ? teamsMap.get(adminUser.id) : null;
        if (!team) return;
        const assistantRaw = assignment.assistant_id ?? null;
        const assistant =
          assistantRaw && usersById.has(assistantRaw)
            ? usersById.get(assistantRaw)
            : assistantRaw
              ? usersByClerk.get(assistantRaw) ?? null
              : null;
        if (assistant?.role === "user" && (assistant?.persona ?? null) === "inspector") return;

        const assignedByRaw = assignment.assigned_by ?? null;
        const assignedByUser =
          assignedByRaw && usersById.has(assignedByRaw)
            ? usersById.get(assignedByRaw)
            : assignedByRaw
              ? usersByClerk.get(assignedByRaw) ?? null
              : null;
        team.assistants.push({
          id: assistant?.id ?? assignment.assistant_id,
          clerkUserId:
            assistant?.clerk_user_id ??
            (typeof assistantRaw === "string" && assistantRaw.startsWith("user_") ? assistantRaw : null),
          avatarUrl: assistant?.avatar_url ?? null,
          name: assistant?.full_name || "Assistente",
          email: assistant?.email || "",
          assignmentId: assignment.id,
          assignedAt: assignment.assigned_at ?? null,
          assignedBy: assignedByUser?.id ?? null,
          assignedByRaw,
          assignedByClerkUserId:
            assignedByUser?.clerk_user_id ??
            (typeof assignedByRaw === "string" && assignedByRaw.startsWith("user_") ? assignedByRaw : null),
        });
        if (assistant?.id) assignedAssistantIds.add(assistant.id);
      });

      let filteredTeams = Array.from(teamsMap.values());
      if (auth.user.role === "admin") {
        filteredTeams = filteredTeams.filter((t) => t.adminId === auth.user.id);
      }

      const unassignedAssistants = assistants
        .filter((a: any) => !assignedAssistantIds.has(a.id))
        .map((a: any) => ({
          id: a.id,
          clerkUserId: a.clerk_user_id ?? null,
          avatarUrl: a.avatar_url ?? null,
          name: a.full_name || "Assistente",
          email: a.email || "",
        }));

      const availableAdmins = allAdmins.map((a: any) => ({
        id: a.id,
        clerkUserId: a.clerk_user_id ?? null,
        avatarUrl: a.avatar_url ?? null,
        name: a.full_name || "Admin",
        isMaster: a.role === "master",
      }));

      return res.status(200).json({
        ok: true,
        teams: filteredTeams,
        unassignedAssistants,
        availableAdmins,
      });
    }

    if (req.method === "DELETE") {
      const body = parseBody(req);
      const idParam =
        req.query?.id ??
        req.query?.assignmentId ??
        req.query?.assignment_id ??
        body?.id ??
        body?.assignmentId ??
        body?.assignment_id ??
        null;
      const id = idParam ? String(Array.isArray(idParam) ? idParam[0] : idParam).trim() : null;
      if (!id) throw new HttpError(400, "Missing id");

      const hasAvatarUrl = await hasColumn(db as any, "users", "avatar_url");
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
        assistant?.clerk_user_id ??
        (typeof assistantRaw === "string" && assistantRaw.startsWith("user_") ? assistantRaw : null);

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
    }

    if (req.method === "POST") {
      const hasAvatarUrl = await hasColumn(db as any, "users", "avatar_url");
      const body = parseBody(req);
      const adminInput = String(body.admin_id ?? "").trim();
      const assistantInput = String(body.assistant_id ?? "").trim();
      if (!adminInput || !assistantInput) throw new HttpError(400, "admin_id and assistant_id are required");

      const adminId = await resolveUserId(db as any, adminInput);
      const assistantId = await resolveUserId(db as any, assistantInput);

      const adminSelect = hasAvatarUrl
        ? "id, clerk_user_id, full_name, email, role, avatar_url"
        : "id, clerk_user_id, full_name, email, role, null as avatar_url";
      const adminRow = await db.query(`select ${adminSelect} from public.users where id = $1`, [adminId]);
      const admin = adminRow.rows?.[0];
      if (!admin?.id) throw new HttpError(404, "Admin not found");

      // Impedir que admin crie vínculos para outros admins
      if (auth.user.role === "admin" && adminId !== auth.user.id) {
        throw new HttpError(403, "Admin can only create assignments for themselves");
      }

      const assistantSelect = hasAvatarUrl
        ? "id, clerk_user_id, full_name, email, avatar_url"
        : "id, clerk_user_id, full_name, email, null as avatar_url";
      const assistantRow = await db.query(`select ${assistantSelect} from public.users where id = $1`, [assistantId]);
      const assistant = assistantRow.rows?.[0];
      if (!assistant?.id) throw new HttpError(404, "Assistant not found");

      const hasUserPersonas = await hasTable(db as any, "user_personas");
      if (hasUserPersonas) {
        const personaResult = await db.query(`select persona from public.user_personas where user_id = $1`, [assistant.id]);
        if (personaResult.rows?.[0]?.persona === "inspector") {
          throw new HttpError(400, "Inspector accounts cannot be assigned as assistants");
        }
      }

      const insert = await db.query(
        `
          insert into public.team_assignments (admin_id, assistant_id, assigned_by)
          values ($1, $2, $3)
          returning id, admin_id, assistant_id, assigned_by, assigned_at
        `,
        [admin.id, assistant.id, auth.user.id]
      );
      const assignment = insert.rows?.[0];
      if (!assignment) throw new HttpError(500, "Failed to create assignment");

      return res.status(200).json({
        ok: true,
        assignment: {
          ...assignment,
          admin_id_raw: assignment.admin_id ?? null,
          admin_id: admin.id,
          admin_clerk_user_id: admin.clerk_user_id ?? null,
          assistant_id_raw: assignment.assistant_id ?? null,
          assistant_id: assistant.id,
          assistant_clerk_user_id: assistant.clerk_user_id ?? null,
          assigned_by_raw: assignment.assigned_by ?? null,
          assigned_by: auth.user.id,
          assigned_by_clerk_user_id: auth.clerkUserId ?? null,
        },
        assistant: {
          id: assistant.id,
          clerkUserId: assistant.clerk_user_id ?? null,
          avatarUrl: assistant.avatar_url ?? null,
          name: assistant.full_name || "Assistente",
          email: assistant.email || "",
        },
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
