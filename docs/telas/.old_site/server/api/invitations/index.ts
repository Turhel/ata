import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes } from "crypto";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";

export const config = { runtime: "nodejs" };

const REQUEST_TYPE = "other";
const REQUEST_KIND = "invitation_code";

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

function makeCode() {
  return randomBytes(5).toString("base64").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 8);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["master"] });
    const db = getPool();

    if (req.method === "GET") {
      // cleanup expired unused (keep table small / reduce egress)
      await db.query(
        `
          delete from public.requests
          where type = $1
            and (payload->>'req') = $2
            and (payload->>'used_at') is null
            and (payload->>'expires_at') is not null
            and (payload->>'expires_at')::timestamptz < now()
        `,
        [REQUEST_TYPE, REQUEST_KIND]
      );

      const updatedSince = req.query?.updated_since ?? req.query?.updatedSince;
      const params: any[] = [REQUEST_TYPE, REQUEST_KIND];
      let whereSql = "";
      if (updatedSince) {
        params.push(String(updatedSince));
        whereSql = `and r.requested_at > $${params.length}`;
      }
      const r = await db.query(
        `
          select
            r.id,
            (r.payload->>'code') as code,
            (r.payload->>'role') as role,
            r.requested_at as created_at,
            (r.payload->>'created_by') as created_by_raw,
            uc.id as created_by,
            uc.clerk_user_id as created_by_clerk_user_id,
            (r.payload->>'expires_at') as expires_at,
            (r.payload->>'used_at') as used_at,
            (r.payload->>'used_by') as used_by_raw,
            uu.id as used_by,
            uu.clerk_user_id as used_by_clerk_user_id
          from public.requests r
          left join public.users uc
            on (uc.id::text = (r.payload->>'created_by') or uc.clerk_user_id = (r.payload->>'created_by'))
          left join public.users uu
            on (uu.id::text = (r.payload->>'used_by') or uu.clerk_user_id = (r.payload->>'used_by'))
          where r.type = $1
            and (r.payload->>'req') = $2
            ${whereSql}
          order by r.requested_at desc
        `,
        params
      );
      return res.status(200).json({ ok: true, invitations: r.rows ?? [] });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const role = body.role ? String(body.role) : null;
      const expiresAt = body.expires_at ? String(body.expires_at) : null;
      if (!role) throw new HttpError(400, "Missing role");

      let code = makeCode();
      let created: any = null;
      for (let i = 0; i < 5; i += 1) {
        try {
          const r = await db.query(
            `
              insert into public.requests
                (type, requested_by, status, notes, payload)
              values
                ($1, $2, 'pending', null, $3)
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
            [
              REQUEST_TYPE,
              String(auth.user.id),
              {
                req: REQUEST_KIND,
                code,
                role,
                created_by: auth.user.id,
                expires_at: expiresAt,
                used_at: null,
                used_by: null,
              },
            ]
          );
          created = r.rows?.[0] ?? null;
          break;
        } catch (err: any) {
          if (err?.code === "23505") {
            code = makeCode();
            continue;
          }
          throw err;
        }
      }

      if (!created) throw new HttpError(500, "Failed to generate invitation");
      created.created_by = auth.user.id;
      created.created_by_clerk_user_id = auth.clerkUserId ?? null;
      return res.status(200).json({ ok: true, invitation: created });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

