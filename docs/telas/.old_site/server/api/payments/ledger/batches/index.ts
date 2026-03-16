import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { HttpError, requireAuth } from "../../../../_lib/auth.js";
import { getTurso, nowIso, toLegacyStatus, toStringArray, toTursoStatus } from "../_lib.js";

export const config = { runtime: "nodejs" };

function buildInList(values: any[]) {
  const placeholders = values.map(() => `?`);
  return { placeholders, args: values };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);

    if (req.method === "GET") {
      const q = req.query ?? {};

      // Legacy params (frontend already uses these):
      const periodStart = q.period_start ? String(q.period_start) : null;
      const periodEnd = q.period_end ? String(q.period_end) : null;
      const ids = toStringArray(q.ids ?? q.id);
      const statusFilter = q.status ? toStringArray(q.status) : [];

      let db: ReturnType<typeof getTurso>;
      try {
        db = getTurso();
      } catch (e: any) {
        // Degrade gracefully (keeps /dashboard/payments usable even if Turso isn't configured).
        return res.status(200).json({
          ok: true,
          batches: [],
          warning: { code: "turso_unavailable", error: e?.message ?? "Turso unavailable" },
        });
      }

      // User: only batches where user has items
      if (auth.user.role === "user") {
        const where: string[] = ["i.assistant_user_id = ?"];
        const args: any[] = [String(auth.user.id)];

        if (ids.length) {
          const { placeholders, args: inArgs } = buildInList(ids);
          where.push(`b.id in (${placeholders.join(",")})`);
          args.push(...inArgs);
        }
        if (periodStart) {
          args.push(periodStart);
          where.push(`b.week_start = ?`);
        }
        if (periodEnd) {
          args.push(periodEnd);
          where.push(`b.week_end = ?`);
        }
        if (statusFilter.length) {
          const mapped = statusFilter.map(toTursoStatus);
          const { placeholders, args: inArgs } = buildInList(mapped);
          where.push(`b.status in (${placeholders.join(",")})`);
          args.push(...inArgs);
        }

        const sql = `
          select
            b.id,
            b.week_start,
            b.week_end,
            b.status,
            b.created_at,
            b.closed_at,
            b.closed_by,
            b.paid_at,
            b.notes,
            coalesce(sum(i.assistant_value), 0) as total_assistant_value,
            coalesce(sum(i.inspector_value), 0) as total_inspector_value,
            count(i.id) as order_count
          from payment_batches b
          join payment_batch_items i on i.batch_id = b.id
          where ${where.join(" and ")}
          group by b.id
          order by b.week_start desc, b.created_at desc
        `;

        let r: any;
        try {
          r = await db.execute({ sql, args });
        } catch (e: any) {
          return res.status(200).json({
            ok: true,
            batches: [],
            warning: { code: "turso_query_failed", error: e?.message ?? "Turso query failed" },
          });
        }
        const batches = (r.rows ?? []).map((row: any) => {
          const assistantTotal = Number(row.total_assistant_value ?? 0) || 0;
          const inspectorTotal = Number(row.total_inspector_value ?? 0) || 0;
          return {
            id: String(row.id),
            period_start: String(row.week_start),
            period_end: String(row.week_end),
            status: toLegacyStatus(String(row.status) as any),
            // keep legacy key for existing UI
            total_value: assistantTotal, // assistant view is the main use-case
            notes: row.notes == null ? null : String(row.notes),
            created_at: row.created_at == null ? nowIso() : String(row.created_at),
            created_by: row.closed_by == null ? null : String(row.closed_by),
            paid_at: row.paid_at == null ? null : String(row.paid_at),
            paid_by: null,
            // extra fields (non-breaking)
            raw_status: String(row.status),
            closed_at: row.closed_at == null ? null : String(row.closed_at),
            closed_by: row.closed_by == null ? null : String(row.closed_by),
            order_count: Number(row.order_count ?? 0) || 0,
            total_inspector_value: inspectorTotal,
          };
        });

        return res.status(200).json({ ok: true, batches });
      }

      // Admin/Master: list all batches (optionally filtered)
      const where: string[] = [];
      const args: any[] = [];

      if (ids.length) {
        const { placeholders, args: inArgs } = buildInList(ids);
        where.push(`b.id in (${placeholders.join(",")})`);
        args.push(...inArgs);
      }
      if (periodStart) {
        args.push(periodStart);
        where.push(`b.week_start = ?`);
      }
      if (periodEnd) {
        args.push(periodEnd);
        where.push(`b.week_end = ?`);
      }
      if (statusFilter.length) {
        const mapped = statusFilter.map(toTursoStatus);
        const { placeholders, args: inArgs } = buildInList(mapped);
        where.push(`b.status in (${placeholders.join(",")})`);
        args.push(...inArgs);
      }

      const whereSql = where.length ? `where ${where.join(" and ")}` : "";
      const sql = `
        select
          b.id,
          b.week_start,
          b.week_end,
          b.status,
          b.created_at,
          b.closed_at,
          b.closed_by,
          b.paid_at,
          b.notes,
          coalesce(sum(i.assistant_value), 0) as total_assistant_value,
          coalesce(sum(i.inspector_value), 0) as total_inspector_value,
          count(i.id) as order_count
        from payment_batches b
        left join payment_batch_items i on i.batch_id = b.id
        ${whereSql}
        group by b.id
        order by b.week_start desc, b.created_at desc
      `;

      let r: any;
      try {
        r = await db.execute({ sql, args });
      } catch (e: any) {
        return res.status(200).json({
          ok: true,
          batches: [],
          warning: { code: "turso_query_failed", error: e?.message ?? "Turso query failed" },
        });
      }
      const batches = (r.rows ?? []).map((row: any) => {
        const assistantTotal = Number(row.total_assistant_value ?? 0) || 0;
        const inspectorTotal = Number(row.total_inspector_value ?? 0) || 0;
        return {
          id: String(row.id),
          period_start: String(row.week_start),
          period_end: String(row.week_end),
          status: toLegacyStatus(String(row.status) as any),
          total_value: assistantTotal + inspectorTotal,
          notes: row.notes == null ? null : String(row.notes),
          created_at: row.created_at == null ? nowIso() : String(row.created_at),
          created_by: row.closed_by == null ? null : String(row.closed_by),
          paid_at: row.paid_at == null ? null : String(row.paid_at),
          paid_by: null,
          raw_status: String(row.status),
          closed_at: row.closed_at == null ? null : String(row.closed_at),
          closed_by: row.closed_by == null ? null : String(row.closed_by),
          order_count: Number(row.order_count ?? 0) || 0,
          total_assistant_value: assistantTotal,
          total_inspector_value: inspectorTotal,
        };
      });

      return res.status(200).json({ ok: true, batches });
    }

    if (req.method === "POST") {
      if (auth.user.role !== "admin" && auth.user.role !== "master") {
        throw new HttpError(403, "Forbidden");
      }

      const body = typeof (req as any).body === "string" ? JSON.parse((req as any).body) : (req as any).body ?? {};
      const periodStart = body.period_start ? String(body.period_start) : body.week_start ? String(body.week_start) : null;
      const periodEnd = body.period_end ? String(body.period_end) : body.week_end ? String(body.week_end) : null;
      if (!periodStart || !periodEnd) throw new HttpError(400, "period_start and period_end are required");

      const db = getTurso();

      // Idempotent by (week_start, week_end): avoid creating duplicate batches for the same week.
      const existing = await db.execute({
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
          where b.week_start = ? and b.week_end = ?
          order by b.created_at desc
          limit 1
        `,
        args: [periodStart, periodEnd],
      });
      const existingRow: any = existing.rows?.[0] ?? null;

      const id = existingRow?.id ? String(existingRow.id) : body.id ? String(body.id) : randomUUID();
      const status = existingRow?.status ? String(existingRow.status) : toTursoStatus(body.status ?? "partial");
      const createdAt = existingRow?.created_at ? String(existingRow.created_at) : nowIso();
      const notes = existingRow?.notes ?? body.notes ?? null;

      if (!existingRow) {
        await db.execute({
          sql: `
            insert into payment_batches (id, week_start, week_end, status, created_at, notes)
            values (?, ?, ?, ?, ?, ?)
            on conflict(id) do nothing
          `,
          args: [id, periodStart, periodEnd, status, createdAt, notes],
        });
      }

      // Return via GET shape (single item)
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
      if (!row) throw new HttpError(500, "Failed to create batch");

      return res.status(200).json({
        ok: true,
        batch: {
          id: String(row.id),
          period_start: String(row.week_start),
          period_end: String(row.week_end),
          status: toLegacyStatus(String(row.status) as any),
          total_value: 0,
          notes: row.notes == null ? null : String(row.notes),
          created_at: row.created_at == null ? createdAt : String(row.created_at),
          created_by: row.closed_by == null ? null : String(row.closed_by),
          paid_at: row.paid_at == null ? null : String(row.paid_at),
          paid_by: null,
          raw_status: String(row.status),
          closed_at: row.closed_at == null ? null : String(row.closed_at),
          closed_by: row.closed_by == null ? null : String(row.closed_by),
        },
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
