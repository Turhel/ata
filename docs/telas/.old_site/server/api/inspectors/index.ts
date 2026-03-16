import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { hasTable } from "../../_lib/schema.js";
import { InspectorCreateSchema, InspectorUpdateSchema, validateData } from "../../_lib/schemas.js";

export const config = { runtime: "nodejs" };

function toStringArray(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Everyone (user/admin/master) needs to read inspectors for order flows.
    // Writes are restricted to master.
    const auth = await requireAuth(req);
    const db = getPool();
    const hasInspectorsDirectory = await hasTable(db as any, "inspectors_directory");
    const tableName = hasInspectorsDirectory ? "inspectors_directory" : "inspectors";

    if (req.method === "GET") {
      const q = req.query ?? {};
      const activeOnly = q.active_only !== "false";
      const ids = toStringArray(q.ids);
      const codes = toStringArray(q.codes);
      const updatedSince = q.updated_since ?? q.updatedSince;

      const where: string[] = [];
      const params: any[] = [];
      const add = (cond: string, value: any) => {
        params.push(value);
        where.push(cond.replace("$$", `$${params.length}`));
      };

      if (activeOnly) add("active = $$", true);
      if (updatedSince) add("created_at > $$", String(updatedSince));

      if (ids.length || codes.length) {
        if (ids.length && codes.length) {
          params.push(ids);
          const idsParam = params.length;
          params.push(codes);
          const codesParam = params.length;
          where.push(`(id = any($${idsParam}) or code = any($${codesParam}))`);
        } else if (ids.length) {
          params.push(ids);
          where.push(`id = any($${params.length})`);
        } else if (codes.length) {
          params.push(codes);
          where.push(`code = any($${params.length})`);
        }
      }

      const whereSql = where.length ? `where ${where.join(" and ")}` : "";
      const sql = `
        select id, name, code, active, created_at
        from public.${tableName}
        ${whereSql}
        order by name
      `;

      const r = await db.query(sql, params);
      return res.status(200).json({ ok: true, inspectors: r.rows ?? [] });
    }

    if (auth.user.role !== "master") {
      throw new HttpError(403, "Forbidden");
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const validatedData = validateData(InspectorCreateSchema, body);

      const id = typeof validatedData.id === "string" && validatedData.id.trim() ? validatedData.id.trim() : randomUUID();
      const result = await db.query(
        `
          insert into public.${tableName}
            (id, name, code, active, created_at)
          values ($1, $2, $3, $4, now())
          returning id, name, code, active, created_at
        `,
        [id, validatedData.name?.trim() ?? null, validatedData.code.trim().toUpperCase(), true]
      );

      return res.status(201).json({
        ok: true,
        inspector: result.rows[0],
      });
    }

    if (req.method === "PATCH") {
      const { id } = req.query;
      if (!id || typeof id !== "string") {
        throw new HttpError(400, "ID do inspetor é obrigatório");
      }

      const body = parseBody(req);
      const validatedData = validateData(InspectorUpdateSchema, body);

      const updates: string[] = [];
      const params: any[] = [id];

      if (validatedData.name !== undefined) {
        params.push(validatedData.name.trim());
        updates.push(`name = $${params.length}`);
      }

      if (validatedData.code !== undefined) {
        params.push(validatedData.code.trim().toUpperCase());
        updates.push(`code = $${params.length}`);
      }

      if (validatedData.active !== undefined) {
        params.push(validatedData.active);
        updates.push(`active = $${params.length}`);
      }

      const result = await db.query(
        `
          update public.${tableName}
          set ${updates.join(", ")}
          where id = $1
          returning id, name, code, active, created_at
        `,
        params
      );

      if (result.rows.length === 0) {
        throw new HttpError(404, "Inspetor não encontrado");
      }

      return res.status(200).json({
        ok: true,
        inspector: result.rows[0],
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

