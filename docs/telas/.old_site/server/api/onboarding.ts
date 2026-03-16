import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
import { HttpError, requireAuth } from "../_lib/auth.js";
import { hasTable } from "../_lib/schema.js";

export const config = { runtime: "nodejs" };

type Persona = "assistant" | "inspector";

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

function normalizeString(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function normalizeZip(v: any): string | null {
  const s = normalizeString(v);
  if (!s) return null;
  const onlyDigits = s.replace(/[^\d]/g, "");
  if (onlyDigits.length === 5) return onlyDigits;
  return s;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const method = req.method || "GET";
    if (method !== "GET" && method !== "PATCH") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const auth = await requireAuth(req);
    const db = getPool();

    const hasUserPersonas = await hasTable(db as any, "user_personas");
    const hasInspectorProfiles = await hasTable(db as any, "inspector_profiles");

    if (!hasUserPersonas) {
      throw new HttpError(
        503,
        "Missing migrations: public.user_personas (required for onboarding)"
      );
    }

    if (method === "GET") {
      const personaResult = await db.query(
        `select persona from public.user_personas where user_id = $1`,
        [auth.user.id]
      );
      const persona = (personaResult.rows?.[0]?.persona as Persona | null) ?? null;

      let origin: any = null;
      if (persona === "inspector" && hasInspectorProfiles) {
        const profileResult = await db.query(
          `
            select origin_city, origin_state, origin_zip
            from public.inspector_profiles
            where user_id = $1
          `,
          [auth.user.id]
        );
        origin = profileResult.rows?.[0] ?? null;
      }

      return res.status(200).json({ ok: true, persona, origin });
    }

    const body = parseBody(req);
    const personaRaw = normalizeString(body.persona);
    if (personaRaw !== "assistant" && personaRaw !== "inspector") {
      throw new HttpError(400, "Invalid persona (expected assistant|inspector)");
    }
    const persona = personaRaw as Persona;

    await db.query("begin");
    try {
      await db.query(
        `
          insert into public.user_personas (user_id, persona, created_at, updated_at)
          values ($1, $2, now(), now())
          on conflict (user_id)
          do update set persona = excluded.persona, updated_at = now()
        `,
        [auth.user.id, persona]
      );

      if (persona === "inspector") {
        if (!hasInspectorProfiles) {
          throw new HttpError(
            503,
            "Missing migrations: public.inspector_profiles (required for inspector onboarding)"
          );
        }

        const originCity = normalizeString(body.origin_city ?? body.originCity);
        const originState = normalizeString(body.origin_state ?? body.originState);
        const originZip = normalizeZip(body.origin_zip ?? body.originZip);

        if (!originCity) {
          throw new HttpError(400, "origin_city is required for inspector onboarding");
        }
        if (!originState && !originZip) {
          throw new HttpError(400, "origin_state or origin_zip is required for inspector onboarding");
        }

        await db.query(
          `
            insert into public.inspector_profiles
              (user_id, origin_city, origin_state, origin_zip, created_at, updated_at)
            values ($1, $2, $3, $4, now(), now())
            on conflict (user_id)
            do update set
              origin_city = excluded.origin_city,
              origin_state = excluded.origin_state,
              origin_zip = excluded.origin_zip,
              updated_at = now()
          `,
          [auth.user.id, originCity, originState, originZip]
        );
      }

      await db.query("commit");
    } catch (err) {
      await db.query("rollback");
      throw err;
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

