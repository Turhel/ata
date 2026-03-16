import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { resolveUserId } from "../../_lib/users.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    if (req.method === "GET") {
      const updatedSince = req.query?.updated_since ?? req.query?.updatedSince;
      const params: any[] = [auth.user.id, auth.clerkUserId];
      let whereSql = "where n.user_id::text = $1 or n.user_id::text = $2";
      if (updatedSince) {
        params.push(String(updatedSince));
        whereSql += ` and n.created_at > $${params.length}`;
      }
      const sql = `
        select
          n.id,
          n.user_id,
          n.title,
          n.message,
          n.type,
          n.read,
          n.read_at,
          n.created_at,
          n.created_by as created_by_raw,
          u.id as created_by,
          u.clerk_user_id as created_by_clerk_user_id
        from public.notifications n
        left join public.users u
          on (u.id::text = n.created_by::text or u.clerk_user_id = n.created_by::text)
        ${whereSql}
        order by n.created_at desc
      `;
      const r = await db.query(sql, params);
      return res.status(200).json({ ok: true, notifications: r.rows ?? [] });
    }

    if (req.method === "POST") {
      if (auth.user.role !== "admin" && auth.user.role !== "master") {
        throw new HttpError(403, "Forbidden");
      }

      const body = parseBody(req);
      const userIdRaw = body.user_id ? String(body.user_id) : null;
      const title = body.title ? String(body.title) : null;
      const message = body.message ? String(body.message) : null;
      const type = body.type ? String(body.type) : "info";

      if (!userIdRaw || !title || !message) {
        throw new HttpError(400, "user_id, title, and message are required");
      }

      const userId = await resolveUserId(db as any, userIdRaw);

      const sql = `
        insert into public.notifications
          (user_id, title, message, type, created_by, read, created_at)
        values
          ($1, $2, $3, $4, $5, false, now())
        returning id
      `;
      const ins = await db.query(sql, [userId, title, message, type, auth.user.id]);
      const id = ins.rows?.[0]?.id ?? null;
      if (!id) throw new HttpError(500, "Failed to create notification");
      const r = await db.query(
        `
          select
            n.id,
            n.user_id,
            n.title,
            n.message,
            n.type,
            n.read,
            n.read_at,
            n.created_at,
            n.created_by as created_by_raw,
            u.id as created_by,
            u.clerk_user_id as created_by_clerk_user_id
          from public.notifications n
          left join public.users u
            on (u.id::text = n.created_by::text or u.clerk_user_id = n.created_by::text)
          where n.id = $1
          limit 1
        `,
        [id]
      );
      return res.status(200).json({ ok: true, notification: r.rows?.[0] ?? null });
    }

    if (req.method === "PATCH") {
      const body = parseBody(req);
      const action = body.action ? String(body.action) : null;

      if (action === "mark_all_read") {
        await db.query(
          `
            update public.notifications
            set read = true, read_at = now()
            where (user_id::text = $1 or user_id::text = $2) and read = false
          `,
          [auth.user.id, auth.clerkUserId]
        );
        return res.status(200).json({ ok: true });
      }

      if (action === "delete_read") {
        await db.query(
          `
            delete from public.notifications
            where (user_id::text = $1 or user_id::text = $2) and read = true
          `,
          [auth.user.id, auth.clerkUserId]
        );
        return res.status(200).json({ ok: true });
      }

      throw new HttpError(400, "Invalid action");
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

