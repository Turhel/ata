import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    const id = req.query?.id ? String(req.query.id) : null;
    if (!id) throw new HttpError(400, "Missing id");

    if (req.method === "PATCH") {
      const body = parseBody(req);
      if (body.read !== undefined) {
        const read = !!body.read;
        const sql = `
          update public.notifications
          set read = $1, read_at = ${read ? "now()" : "null"}
          where id = $2 and (user_id::text = $3 or user_id::text = $4)
        `;
        await db.query(sql, [read, id, auth.user.id, auth.clerkUserId]);
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
              and (n.user_id::text = $2 or n.user_id::text = $3)
            limit 1
          `,
          [id, auth.user.id, auth.clerkUserId]
        );
        return res.status(200).json({ ok: true, notification: r.rows?.[0] ?? null });
      }

      throw new HttpError(400, "Invalid payload");
    }

    if (req.method === "DELETE") {
      await db.query(
        `
          delete from public.notifications
          where id = $1 and (user_id::text = $2 or user_id::text = $3)
        `,
        [id, auth.user.id, auth.clerkUserId]
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

