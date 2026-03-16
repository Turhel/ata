import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await requireAuth(req);
    const db = getPool();

    const id = req.query?.id ? String(req.query.id) : null;
    if (!id) throw new HttpError(400, "Missing id");

    if (req.method !== "DELETE") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    try {
      await db.query("delete from public.manuals where id = $1", [id]);
      return res.status(200).json({ ok: true });
    } catch (e: any) {
      if (e?.code === "42P01") {
        throw new HttpError(503, "Manuals unavailable (missing table)");
      }
      throw e;
    }
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

