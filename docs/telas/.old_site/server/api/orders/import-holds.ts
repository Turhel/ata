import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";

export const config = { runtime: "nodejs" };

const REQUEST_TYPE = "other";
const REQUEST_KIND = "order_import_hold";

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
      const params: any[] = [];
      let whereSql =
        "where r.type = 'other' and (r.payload->>'req') = 'order_import_hold' and r.requested_by::text = $1";
      params.push(String(auth.user.id));
      if (updatedSince) {
        params.push(String(updatedSince));
        whereSql += ` and r.requested_at > $${params.length}`;
      }
      const sql = `
        select
          r.id,
          u.id as user_id,
          (r.payload->>'raw_path') as raw_path,
          (r.payload->>'order_id') as order_id,
          (r.payload->>'work_type') as work_type,
          (r.payload->>'reason') as reason,
          r.requested_at as created_at,
          (r.payload->>'expires_at') as expires_at
        from public.requests r
        left join public.users u on u.id::text = r.requested_by::text
        ${whereSql}
        order by r.requested_at desc
      `;
      const r = await db.query(sql, params);
      return res.status(200).json({ ok: true, holds: r.rows ?? [] });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) throw new HttpError(400, "items is required");

      const cols = ["type", "requested_by", "status", "notes", "payload"];
      const values: any[] = [];
      const placeholders: string[] = [];

      items.forEach((item, idx) => {
        const base = idx * cols.length;
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
        values.push(REQUEST_TYPE, String(auth.user.id), "pending", null, {
          req: REQUEST_KIND,
          raw_path: item.raw_path,
          order_id: item.order_id ?? null,
          work_type: item.work_type ?? null,
          reason: item.reason ?? null,
          expires_at: item.expires_at ?? null,
        });
      });

      const sql = `
        insert into public.requests
          (${cols.join(", ")})
        values
          ${placeholders.join(", ")}
        returning
          id,
          (payload->>'raw_path') as raw_path,
          (payload->>'order_id') as order_id,
          (payload->>'work_type') as work_type,
          (payload->>'reason') as reason,
          requested_at as created_at,
          (payload->>'expires_at') as expires_at
      `;
      const r = await db.query(sql, values);
      // Mantém shape compatível (inclui user_id)
      const holds = (r.rows ?? []).map((row: any) => ({ ...row, user_id: auth.user.id }));
      return res.status(200).json({ ok: true, holds });
    }

    if (req.method === "DELETE") {
      const id = req.query?.id ? String(req.query.id) : null;
      const expiresBefore = req.query?.expires_before ? String(req.query.expires_before) : null;

      if (id) {
        await db.query(
          `
            delete from public.requests
            where id = $1
              and type = $2
              and (payload->>'req') = $3
              and requested_by::text = $4
          `,
          [id, REQUEST_TYPE, REQUEST_KIND, String(auth.user.id)]
        );
        return res.status(200).json({ ok: true });
      }

      if (expiresBefore) {
        await db.query(
          `
            delete from public.requests
            where type = $1
              and (payload->>'req') = $2
              and requested_by::text = $3
              and (payload->>'expires_at')::timestamptz < $4::timestamptz
          `,
          [REQUEST_TYPE, REQUEST_KIND, String(auth.user.id), expiresBefore]
        );
        return res.status(200).json({ ok: true });
      }

      throw new HttpError(400, "id or expires_before is required");
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

