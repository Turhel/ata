import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { HttpError, requireAuth } from "../../../../_lib/auth.js";
import { getPool } from "../../../../_lib/db.js";
import { hasColumn } from "../../../../_lib/schema.js";
import { getTurso, nowIso, toStringArray } from "../_lib.js";

export const config = { runtime: "nodejs" };

function buildInList(values: any[]) {
  const placeholders = values.map(() => `?`);
  return { placeholders, args: values };
}

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

function toNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function rowToLegacyItem(row: any) {
  return {
    id: String(row.id),
    batch_id: String(row.batch_id),
    order_id: String(row.order_id),
    assistant_id: String(row.assistant_user_id),
    amount: Number(row.assistant_value ?? 0) || 0,
    category: null,
    work_type: row.otype == null ? null : String(row.otype),
    external_id: row.external_id == null ? null : String(row.external_id),
    created_at: row.created_at == null ? null : String(row.created_at),
    // extra fields (non-breaking)
    assistant_value: Number(row.assistant_value ?? 0) || 0,
    inspector_value: Number(row.inspector_value ?? 0) || 0,
    inspector_id: row.inspector_id == null ? null : String(row.inspector_id),
    closed_at: row.closed_at == null ? null : String(row.closed_at),
    client_code: row.client_code == null ? null : String(row.client_code),
    city: row.city == null ? null : String(row.city),
    state: row.state == null ? null : String(row.state),
    zip: row.zip == null ? null : String(row.zip),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);

    if (req.method === "GET") {
      const q = req.query ?? {};
      const batchId = q.batch_id ? String(q.batch_id) : null;
      const batchIds = toStringArray(q.batch_ids ?? q.batch_id);
      const orderIds = toStringArray(q.order_ids ?? q.order_id);
      const assistantIds = toStringArray(q.assistant_ids ?? q.assistant_id);

      let db: ReturnType<typeof getTurso>;
      try {
        db = getTurso();
      } catch (e: any) {
        return res.status(200).json({
          ok: true,
          items: [],
          warning: { code: "turso_unavailable", error: e?.message ?? "Turso unavailable" },
        });
      }

      const where: string[] = [];
      const args: any[] = [];

      if (auth.user.role === "user") {
        args.push(String(auth.user.id));
        where.push(`assistant_user_id = ?`);
      } else if (assistantIds.length) {
        // Admin/Master: expect internal user ids (users.id UUID strings).
        // Clerk user ids ("user_...") are intentionally not resolved here to avoid extra HOT DB usage.
        const uniq = Array.from(new Set(assistantIds.map(String)));
        const { placeholders, args: inArgs } = buildInList(uniq);
        where.push(`assistant_user_id in (${placeholders.join(",")})`);
        args.push(...inArgs);
      }

      if (batchId) {
        args.push(batchId);
        where.push(`batch_id = ?`);
      } else if (batchIds.length) {
        const { placeholders, args: inArgs } = buildInList(batchIds);
        where.push(`batch_id in (${placeholders.join(",")})`);
        args.push(...inArgs);
      }

      if (orderIds.length) {
        const { placeholders, args: inArgs } = buildInList(orderIds);
        where.push(`order_id in (${placeholders.join(",")})`);
        args.push(...inArgs);
      }

      const whereSql = where.length ? `where ${where.join(" and ")}` : "";

      const sql = `
        select
          id,
          batch_id,
          order_id,
          external_id,
          assistant_user_id,
          inspector_id,
          assistant_value,
          inspector_value,
          closed_at,
          otype,
          client_code,
          city,
          state,
          zip,
          created_at
        from payment_batch_items
        ${whereSql}
        order by closed_at desc
      `;

      let r: any;
      try {
        r = await db.execute({ sql, args });
      } catch (e: any) {
        return res.status(200).json({
          ok: true,
          items: [],
          warning: { code: "turso_query_failed", error: e?.message ?? "Turso query failed" },
        });
      }
      const items = (r.rows ?? []).map(rowToLegacyItem);
      return res.status(200).json({ ok: true, items });
    }

    if (req.method === "POST") {
      if (auth.user.role !== "admin" && auth.user.role !== "master") {
        throw new HttpError(403, "Forbidden");
      }

      const body = parseBody(req);
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) throw new HttpError(400, "items is required");

      const db = getTurso();
      const createdAt = nowIso();

      const normalized = items.map((item: any) => ({
        batch_id: item.batch_id == null ? "" : String(item.batch_id).trim(),
        order_id: item.order_id == null ? "" : String(item.order_id).trim(),
        external_id: item.external_id == null ? null : String(item.external_id),
        assistant_user_id:
          item.assistant_user_id != null
            ? String(item.assistant_user_id).trim()
            : item.assistant_id != null
              ? String(item.assistant_id).trim()
              : "",
        inspector_id: item.inspector_id == null ? null : String(item.inspector_id),
        assistant_value: toNumber(item.assistant_value ?? item.amount ?? 0),
        inspector_value: toNumber(item.inspector_value ?? 0),
        closed_at: item.closed_at != null ? String(item.closed_at) : null,
        otype: item.otype != null ? String(item.otype) : item.work_type != null ? String(item.work_type) : null,
        client_code: item.client_code == null ? null : String(item.client_code),
        city: item.city == null ? null : String(item.city),
        state: item.state == null ? null : String(item.state),
        zip: item.zip == null ? null : String(item.zip),
      }));

      // Best-effort: enrich snapshot fields from HOT orders (keeps `closed_at` correct even if client doesn't send it).
      const orderMetaById = new Map<string, any>();
      try {
        const supa = getPool();
        const orderIds = Array.from(new Set(normalized.map((i) => i.order_id).filter(Boolean)));
        if (orderIds.length) {
          const r = await supa.query(
            `
              select
                o.id::text as id,
                o.external_id::text as external_id,
                o.assistant_id::text as assistant_id,
                o.inspector_id::text as inspector_id,
                o.closed_at as closed_at,
                o.otype::text as otype,
                o.client_code::text as client_code,
                o.city::text as city,
                o.state::text as state,
                o.zip::text as zip
              from public.orders o
              where o.id::text = any($1::text[])
            `,
            [orderIds],
          );
          (r.rows ?? []).forEach((row: any) => {
            if (!row?.id) return;
            orderMetaById.set(String(row.id), row);
          });
        }
      } catch {
        // ignore (keeps payments ledger usable even if HOT isn't configured)
      }

      const enriched = normalized.map((item) => {
        const meta = orderMetaById.get(item.order_id);
        const closedAtRaw = item.closed_at ?? meta?.closed_at ?? null;
        const closedAt =
          closedAtRaw == null
            ? createdAt
            : closedAtRaw instanceof Date
              ? closedAtRaw.toISOString()
              : String(closedAtRaw);

        return {
          ...item,
          external_id: item.external_id ?? (meta?.external_id == null ? null : String(meta.external_id)),
          assistant_user_id:
            item.assistant_user_id || (meta?.assistant_id == null ? "" : String(meta.assistant_id).trim()),
          inspector_id: item.inspector_id ?? (meta?.inspector_id == null ? null : String(meta.inspector_id)),
          otype: item.otype ?? (meta?.otype == null ? null : String(meta.otype)),
          client_code: item.client_code ?? (meta?.client_code == null ? null : String(meta.client_code)),
          city: item.city ?? (meta?.city == null ? null : String(meta.city)),
          state: item.state ?? (meta?.state == null ? null : String(meta.state)),
          zip: item.zip ?? (meta?.zip == null ? null : String(meta.zip)),
          closed_at: closedAt,
        };
      });

      const batchIds = Array.from(new Set(enriched.map((i) => i.batch_id).filter(Boolean)));
      if (batchIds.length === 0) throw new HttpError(400, "batch_id is required");
      if (batchIds.length > 50) throw new HttpError(400, "batch_id max length is 50");

      const { placeholders: batchPh, args: batchArgs } = buildInList(batchIds);
      const batchRes = await db.execute({
        sql: `select id, status from payment_batches where id in (${batchPh.join(",")})`,
        args: batchArgs,
      });
      const batchStatus = new Map<string, string>(
        (batchRes.rows ?? []).map((row: any) => [String(row.id), String(row.status)]),
      );

      for (const batchId of batchIds) {
        const batchIdStr = String(batchId);
        const status = batchStatus.get(batchIdStr);
        if (!status) throw new HttpError(404, `Batch not found: ${batchIdStr}`);
        if (status === "paid") throw new HttpError(409, "Batch is paid and cannot be modified");
        if (status === "closed") throw new HttpError(409, "Batch is closed and cannot be modified");
      }

      for (const item of enriched) {
        if (!item.batch_id) throw new HttpError(400, "batch_id is required");
        if (!item.order_id) throw new HttpError(400, "order_id is required");
        if (!item.assistant_user_id) throw new HttpError(400, "assistant_id is required");

        await db.execute({
          sql: `
            insert into payment_batch_items
              (id, batch_id, order_id, external_id, assistant_user_id, inspector_id,
               assistant_value, inspector_value, closed_at,
               otype, client_code, city, state, zip, created_at)
            values
              (?, ?, ?, ?, ?, ?,
               ?, ?, ?,
               ?, ?, ?, ?, ?, ?)
            on conflict(batch_id, order_id) do update set
              external_id = excluded.external_id,
              assistant_user_id = excluded.assistant_user_id,
              inspector_id = excluded.inspector_id,
              assistant_value = excluded.assistant_value,
              inspector_value = excluded.inspector_value,
              closed_at = excluded.closed_at,
              otype = excluded.otype,
              client_code = excluded.client_code,
              city = excluded.city,
              state = excluded.state,
              zip = excluded.zip
          `,
          args: [
            randomUUID(),
            item.batch_id,
            item.order_id,
            item.external_id,
            item.assistant_user_id,
            item.inspector_id,
            item.assistant_value,
            item.inspector_value,
            item.closed_at,
            item.otype,
            item.client_code,
            item.city,
            item.state,
            item.zip,
            createdAt,
          ],
        });
      }

      // Best-effort: write batching pointers back to HOT orders (keeps `/api/payments/open-balance` cheap and accurate).
      try {
        const supa = getPool();
        const hasLastBatchId = await hasColumn(supa as any, "orders", "last_payment_batch_id");
        const hasLastBatchedAt = await hasColumn(supa as any, "orders", "last_batched_at");

        if (hasLastBatchId || hasLastBatchedAt) {
          const byBatch = new Map<string, string[]>();
          enriched.forEach((i) => {
            if (!i.batch_id || !i.order_id) return;
            const list = byBatch.get(i.batch_id) ?? [];
            list.push(i.order_id);
            byBatch.set(i.batch_id, list);
          });

          for (const [batchId, orderIds] of byBatch.entries()) {
            const uniqOrderIds = Array.from(new Set(orderIds));
            if (uniqOrderIds.length === 0) continue;

            const setParts: string[] = [];
            const params: any[] = [];
            if (hasLastBatchId) {
              params.push(batchId);
              setParts.push(`last_payment_batch_id = $${params.length}::text`);
            }
            if (hasLastBatchedAt) {
              params.push(createdAt);
              setParts.push(`last_batched_at = $${params.length}::timestamptz`);
            }

            params.push(uniqOrderIds);
            await supa.query(
              `
                update public.orders
                set ${setParts.join(", ")}
                where id::text = any($${params.length}::text[])
              `,
              params,
            );
          }
        }
      } catch {
        // ignore (COLD is source of truth; pointers are optional)
      }

      const pairs = enriched.map((i) => ({ batch_id: i.batch_id, order_id: i.order_id }));
      const wherePairs = pairs.map(() => `(batch_id = ? and order_id = ?)`).join(" or ");
      const args = pairs.flatMap((p) => [p.batch_id, p.order_id]);

      const r = await db.execute({
        sql: `
          select
            id,
            batch_id,
            order_id,
            external_id,
            assistant_user_id,
            inspector_id,
            assistant_value,
            inspector_value,
            closed_at,
            otype,
            client_code,
            city,
            state,
            zip,
            created_at
          from payment_batch_items
          where ${wherePairs}
          order by closed_at desc
        `,
        args,
      });
      const inserted = (r.rows ?? []).map(rowToLegacyItem);

      return res.status(200).json({ ok: true, items: inserted });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
