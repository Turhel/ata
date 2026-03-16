import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";

export const config = { runtime: "nodejs" };

const REQUEST_TYPE = "other";
const REQUEST_KIND = "invitation_code";

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireAuth(req, { roles: ["master"] });
    const db = getPool();

    const id = req.query?.id ? String(req.query.id) : null;
    if (!id) throw new HttpError(400, "Missing id");

    if (req.method === "PATCH") {
      const body = parseBody(req);
      const action = body.action ? String(body.action) : null;
      if (action === "expire") {
        const r = await db.query(
          `
            update public.requests
            set payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('expires_at', now()::text)
            where id = $1
              and type = $2
              and (payload->>'req') = $3
            returning
              id,
              (payload->>'code') as code,
              (payload->>'role') as role,
              requested_at as created_at,
              (payload->>'created_by') as created_by_raw,
              null::uuid as created_by,
              null::text as created_by_clerk_user_id,
              (payload->>'expires_at') as expires_at,
              (payload->>'used_at') as used_at,
              (payload->>'used_by') as used_by_raw,
              null::uuid as used_by,
              null::text as used_by_clerk_user_id
          `,
          [id, REQUEST_TYPE, REQUEST_KIND]
        );
        const row = r.rows?.[0] ?? null;
        if (row) {
          const lookup = await db.query(
            `
              select
                uc.id as created_by,
                uc.clerk_user_id as created_by_clerk_user_id,
                uu.id as used_by,
                uu.clerk_user_id as used_by_clerk_user_id
              from public.requests r
              left join public.users uc
                on (uc.id::text = (r.payload->>'created_by') or uc.clerk_user_id = (r.payload->>'created_by'))
              left join public.users uu
                on (uu.id::text = (r.payload->>'used_by') or uu.clerk_user_id = (r.payload->>'used_by'))
              where r.id = $1
              limit 1
            `,
            [id]
          );
          const lu = lookup.rows?.[0] ?? null;
          if (lu) {
            row.created_by = lu.created_by ?? null;
            row.created_by_clerk_user_id = lu.created_by_clerk_user_id ?? null;
            row.used_by = lu.used_by ?? null;
            row.used_by_clerk_user_id = lu.used_by_clerk_user_id ?? null;
          }
        }
        return res.status(200).json({ ok: true, invitation: r.rows?.[0] ?? null });
      }
      throw new HttpError(400, "Invalid action");
    }

    if (req.method === "DELETE") {
      await db.query(
        `
          delete from public.requests
          where id = $1
            and type = $2
            and (payload->>'req') = $3
        `,
        [id, REQUEST_TYPE, REQUEST_KIND]
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

