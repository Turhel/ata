import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../../_lib/db.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";

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

      const where: string[] = [`r.type = 'work_type'`];
      const params: any[] = [];

      if (auth.user.role === "user") {
        params.push(String(auth.user.id));
        const userIdParam = `$${params.length}`;
        if (auth.clerkUserId) {
          params.push(String(auth.clerkUserId));
          const clerkIdParam = `$${params.length}`;
          where.push(`(r.requested_by::text = ${userIdParam} or r.requested_by::text = ${clerkIdParam})`);
        } else {
          where.push(`r.requested_by::text = ${userIdParam}`);
        }
      }
      if (updatedSince) {
        params.push(String(updatedSince));
        where.push(`r.requested_at > $${params.length}`);
      }

      const whereSql = where.length ? `where ${where.join(" and ")}` : "";
      const sql = `
        select
          r.id,
          (r.payload->>'code') as code,
          req.id as requested_by,
          req.clerk_user_id as requested_by_clerk_user_id,
          r.requested_at,
          r.status,
          adm.id as admin_id,
          adm.clerk_user_id as admin_clerk_user_id,
          (r.payload->>'admin_notes') as admin_notes,
          (r.payload->>'admin_reviewed_at') as admin_reviewed_at,
          mst.id as master_id,
          mst.clerk_user_id as master_clerk_user_id,
          (r.payload->>'master_notes') as master_notes,
          (r.payload->>'master_reviewed_at') as master_reviewed_at,
          (r.payload->>'suggested_category') as suggested_category,
          (r.payload->>'created_work_type_id') as created_work_type_id,
          req.full_name as requester_name
        from public.requests r
        left join public.users req
          on (req.id::text = r.requested_by::text or req.clerk_user_id = r.requested_by::text)
        left join public.users adm
          on (adm.id::text = (r.payload->>'admin_id') or adm.clerk_user_id = (r.payload->>'admin_id'))
        left join public.users mst
          on (mst.id::text = (r.payload->>'master_id') or mst.clerk_user_id = (r.payload->>'master_id'))
        ${whereSql}
        order by r.requested_at desc
        limit 200
      `;
      const r = await db.query(sql, params);
      return res.status(200).json({ ok: true, requests: r.rows ?? [] });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const code = body.code ? String(body.code).toUpperCase().trim() : "";
      if (!code) throw new HttpError(400, "Missing code");

      const sql = `
        insert into public.requests
          (type, requested_by, status, notes, payload)
        values ($1, $2, 'pending', null, $3)
        returning
          id,
          (payload->>'code') as code,
          requested_by,
          requested_at,
          status
      `;
      const r = await db.query(sql, ["work_type", String(auth.user.id), { code }]);

      // notify admins/masters
      const admins = await db.query(`select id from public.users where role in ('admin','master') and active = true`);
      const notifications = (admins.rows ?? []).map((row: any) => ({
        user_id: row.id,
        title: `Solicitação: Novo tipo de trabalho "${code}"`,
        message: `Um assistente solicitou a adição do tipo de trabalho "${code}" ao sistema.`,
        type: "request",
        created_by: auth.user.id,
      }));

      if (notifications.length > 0) {
        const values: string[] = [];
        const params: any[] = [];
        notifications.forEach((n, idx) => {
          const base = idx * 5;
          params.push(n.user_id, n.title, n.message, n.type, n.created_by);
          values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, false, now())`);
        });
        await db.query(
          `
            insert into public.notifications
              (user_id, title, message, type, created_by, read, created_at)
            values ${values.join(", ")}
          `,
          params
        );
      }

      return res.status(200).json({ ok: true, request: r.rows?.[0] ?? null });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

