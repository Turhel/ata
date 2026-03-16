import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { resolveUserId } from "../../_lib/users.js";

export const config = { runtime: "nodejs" };

function toStringArray(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const auth = await requireAuth(req);

    const q = req.query ?? {};
    const all = q.all === "true";
    const rawUserIds = toStringArray(q.user_ids ?? q.user_id);
    const updatedSince = q.updated_since ?? q.updatedSince;

    if (all) {
      if (auth.user.role !== "admin" && auth.user.role !== "master") {
        throw new HttpError(403, "Forbidden");
      }
    } else {
      // Assistants can only read their own profile, even if they pass other user_ids.
      if (auth.user.role === "user") {
        if (rawUserIds.length === 0) {
          rawUserIds.push(auth.user.id);
        }
      }
    }

    const where: string[] = [];
    const params: any[] = [];
    const add = (cond: string, value: any) => {
      params.push(value);
      where.push(cond.replace("$$", `$${params.length}`));
    };

    where.push("active = true");

    let userIds: string[] = [];
    if (!all && rawUserIds.length) {
      const db = getPool();
      userIds = await Promise.all(rawUserIds.map((id) => resolveUserId(db as any, id)));

      if (auth.user.role === "user") {
        if (userIds.some((id) => id !== auth.user.id)) throw new HttpError(403, "Forbidden");
      }

      params.push(userIds);
      where.push(`id = any($${params.length})`);
    }
    if (updatedSince) add("updated_at > $$", String(updatedSince));

    const whereSql = where.length ? `where ${where.join(" and ")}` : all ? "" : "where false";
    const sql = `
      select
        id as id,
        id as user_id,
        full_name,
        email,
        phone,
        weekly_goal,
        created_at,
        updated_at,
        clerk_user_id
      from public.users
      ${whereSql}
      order by full_name
    `;

    const db = getPool();
    const r = await db.query(sql, params);
    return res.status(200).json({ ok: true, profiles: r.rows ?? [] });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

