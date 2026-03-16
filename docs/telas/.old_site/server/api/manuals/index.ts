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

    if (req.method === "GET") {
      try {
        const updatedSince = req.query?.updated_since ?? req.query?.updatedSince;
        const params: any[] = [];
        const where = updatedSince ? `where created_at > $1` : "";
        if (updatedSince) params.push(String(updatedSince));

        const sql = `
          select
            m.id,
            m.title,
            m.description,
            m.cover_url,
            m.file_url,
            m.created_at,
            m.created_by as created_by_raw,
            u.id as created_by,
            u.clerk_user_id as created_by_clerk_user_id
          from public.manuals m
          left join public.users u
            on (u.id::text = m.created_by::text or u.clerk_user_id = m.created_by::text)
          ${where}
          order by m.created_at desc
        `;
        const r = await db.query(sql, params);
        return res.status(200).json({ ok: true, manuals: r.rows ?? [] });
      } catch (e: any) {
        // Compat: em alguns ambientes a tabela pode não existir ainda.
        // Mantemos a tela funcional retornando lista vazia.
        if (e?.code === "42P01") {
          return res.status(200).json({ ok: true, manuals: [] });
        }
        throw e;
      }
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const title = body.title ? String(body.title).trim() : "";
      if (!title) throw new HttpError(400, "Missing title");
      const description = body.description ? String(body.description) : null;
      const coverUrl = body.cover_url ? String(body.cover_url) : null;
      const fileUrl = body.file_url ? String(body.file_url) : null;

      let ins: any;
      try {
        const sql = `
          insert into public.manuals (title, description, cover_url, file_url, created_at, created_by)
          values ($1, $2, $3, $4, now(), $5)
          returning id
        `;
        ins = await db.query(sql, [title, description, coverUrl, fileUrl, auth.user.id]);
      } catch (e: any) {
        if (e?.code === "42P01") {
          throw new HttpError(503, "Manuals unavailable (missing table)");
        }
        throw e;
      }
      const id = ins.rows?.[0]?.id ?? null;
      if (!id) throw new HttpError(500, "Failed to create manual");
      const r = await db.query(
        `
          select
            m.id,
            m.title,
            m.description,
            m.cover_url,
            m.file_url,
            m.created_at,
            m.created_by as created_by_raw,
            u.id as created_by,
            u.clerk_user_id as created_by_clerk_user_id
          from public.manuals m
          left join public.users u
            on (u.id::text = m.created_by::text or u.clerk_user_id = m.created_by::text)
          where m.id = $1
          limit 1
        `,
        [id]
      );
      return res.status(200).json({ ok: true, manual: r.rows?.[0] ?? null });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

