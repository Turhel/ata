import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { HttpError, requireAuth } from "../../../../_lib/auth.js";
import { getTurso, nowIso, toLegacyStatus, toTursoStatus } from "../_lib.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["admin", "master"] });
    const db = getTurso();

    const id = req.query?.id ? String(req.query.id) : null;
    if (!id) throw new HttpError(400, "Missing id");

    if (req.method !== "PATCH") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = parseBody(req);
    const nextStatus = body.status !== undefined ? toTursoStatus(body.status) : null;
    const notes = body.notes !== undefined ? (body.notes == null ? null : String(body.notes)) : undefined;

    const setParts: string[] = [];
    const args: any[] = [];

    const add = (col: string, value: any) => {
      setParts.push(`${col} = ?`);
      args.push(value);
    };

    if (notes !== undefined) add("notes", notes);

    // Status transitions
    if (nextStatus) {
      add("status", nextStatus);
      if (nextStatus === "closed") {
        add("closed_at", body.closed_at ? String(body.closed_at) : nowIso());
        add("closed_by", body.closed_by ? String(body.closed_by) : String(auth.user.id));
      }
      if (nextStatus === "paid") {
        add("paid_at", body.paid_at ? String(body.paid_at) : nowIso());

        // Best-effort: store paid_by in notes (schema doesn't have paid_by).
        const paidBy = body.paid_by ? String(body.paid_by) : String(auth.user.id);
        if (notes === undefined) {
          // merge existing notes
          const existing = await db.execute({ sql: `select notes from payment_batches where id = ?`, args: [id] });
          const existingNotes = existing.rows?.[0]?.notes == null ? "" : String(existing.rows[0].notes);
          const merged = existingNotes
            ? `${existingNotes}\npaid_by=${paidBy}`
            : `paid_by=${paidBy}`;
          add("notes", merged);
        }

        // Optional: insert a payments row (if table exists).
        try {
          await db.execute({
            sql: `
              insert into payments (id, batch_id, paid_at, method, reference, notes)
              values (?, ?, ?, ?, ?, ?)
            `,
            args: [
              randomUUID(),
              id,
              body.paid_at ? String(body.paid_at) : nowIso(),
              body.method ?? null,
              body.reference ?? null,
              body.payment_notes ?? null,
            ],
          });
        } catch {
          // ignore (table optional / may not exist yet)
        }
      }
    }

    if (setParts.length === 0) throw new HttpError(400, "No fields to update");

    args.push(id);
    await db.execute({
      sql: `update payment_batches set ${setParts.join(", ")} where id = ?`,
      args,
    });

    const r = await db.execute({
      sql: `
        select
          b.id,
          b.week_start,
          b.week_end,
          b.status,
          b.created_at,
          b.closed_at,
          b.closed_by,
          b.paid_at,
          b.notes
        from payment_batches b
        where b.id = ?
        limit 1
      `,
      args: [id],
    });
    const row: any = r.rows?.[0] ?? null;
    if (!row) throw new HttpError(404, "Batch not found");

    return res.status(200).json({
      ok: true,
      batch: {
        id: String(row.id),
        period_start: String(row.week_start),
        period_end: String(row.week_end),
        status: toLegacyStatus(String(row.status) as any),
        total_value: 0,
        notes: row.notes == null ? null : String(row.notes),
        created_at: row.created_at == null ? nowIso() : String(row.created_at),
        created_by: row.closed_by == null ? null : String(row.closed_by),
        paid_at: row.paid_at == null ? null : String(row.paid_at),
        paid_by: null,
        raw_status: String(row.status),
        closed_at: row.closed_at == null ? null : String(row.closed_at),
        closed_by: row.closed_by == null ? null : String(row.closed_by),
      },
    });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
