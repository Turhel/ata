import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../../_lib/db.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";
import { resolveOptionalUserId } from "../../../_lib/users.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    if (req.method === "GET") {
      const limitRaw = Number(req.query?.limit ?? 500);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 500;
      const updatedSince = req.query?.updated_since ?? req.query?.updatedSince;

      const where: string[] = [`r.type = 'duplicate_order'`];
      const params: any[] = [];

      if (auth.user.role === "user") {
        params.push(String(auth.user.id));
        const userIdParam = `$${params.length}`;
        if (auth.clerkUserId) {
          params.push(String(auth.clerkUserId));
          const clerkIdParam = `$${params.length}`;
          where.push(`(r.requested_by::text = ${userIdParam} or r.requested_by::text = ${clerkIdParam})`);
        } else {
          where.push(`r.requested_by::text = ${userIdParam}`);
        }
      }
      if (updatedSince) {
        params.push(String(updatedSince));
        where.push(`r.requested_at > $${params.length}`);
      }

      const whereSql = where.length ? `where ${where.join(" and ")}` : "";
      const r = await db.query(
        `
          select
            r.id,
            r.status,
            r.requested_at,
            r.reviewed_at,
            r.notes as review_notes,
            req.id as requested_by,
            req.clerk_user_id as requested_by_clerk_user_id,
            rev.id as reviewed_by,
            rev.clerk_user_id as reviewed_by_clerk_user_id,
            req.full_name as requester_name,
            orig.id as original_assistant_id,
            orig.clerk_user_id as original_assistant_clerk_user_id,
            orig.full_name as original_assistant_name,
            r.payload
          from public.requests r
          left join public.users req
            on (req.id::text = r.requested_by::text or req.clerk_user_id = r.requested_by::text)
          left join public.users rev
            on (rev.id::text = r.reviewed_by::text or rev.clerk_user_id = r.reviewed_by::text)
          left join public.users orig
            on (
              orig.id::text = (r.payload->>'original_assistant_id')
              or orig.clerk_user_id = (r.payload->>'original_assistant_id')
            )
          ${whereSql}
          order by r.requested_at desc
          limit $${params.length + 1}
        `,
        [...params, limit]
      );

      const requests = (r.rows ?? []).map((row: any) => ({
        id: row.id,
        external_id: row.payload?.external_id ?? null,
        requested_by: row.requested_by,
        original_order_id: row.payload?.original_order_id ?? null,
        original_created_at: row.payload?.original_created_at ?? null,
        original_assistant_id: row.original_assistant_id ?? null,
        original_assistant_name: row.original_assistant_name ?? null,
        notes: row.payload?.notes ?? null,
        status: row.status,
        reviewed_by: row.reviewed_by ?? null,
        reviewed_at: row.reviewed_at ?? null,
        review_notes: row.review_notes ?? null,
        requested_at: row.requested_at,
        requester_name: row.requester_name ?? null,
      }));

      return res.status(200).json({ ok: true, requests });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const externalId = String(body.external_id ?? "").trim();
      const originalOrderId = String(body.original_order_id ?? "").trim();
      const notes = body.notes ?? null;

      if (!externalId || !originalOrderId) {
        throw new HttpError(400, "external_id and original_order_id are required");
      }

      if (!isUuidLike(originalOrderId)) {
        throw new HttpError(400, "original_order_id must be a UUID");
      }

      // Always derive canonical data from DB (do not trust client payload).
      const orderR = await db.query(
        `
          select
            id,
            external_id,
            assistant_id,
            created_at,
            otype,
            app_status
          from public.orders
          where id = $1
          limit 1
        `,
        [originalOrderId]
      );
      const order = orderR.rows?.[0] ?? null;
      if (!order) throw new HttpError(404, "Original order not found");

      if (String(order.external_id ?? "") !== externalId) {
        throw new HttpError(400, "external_id does not match original_order_id");
      }
      if (String(order.app_status ?? "") === "canceled") {
        throw new HttpError(400, "Order is canceled");
      }
      if (order.assistant_id == null || String(order.assistant_id).trim() === "") {
        throw new HttpError(400, "Order has no assistant");
      }

      const originalAssistantId = await resolveOptionalUserId(db as any, String(order.assistant_id));
      const originalCreatedAt = order.created_at ?? null;

      await db.query("begin");
      try {
        const insertReq = await db.query(
          `
            insert into public.requests
              (type, requested_by, notes, payload)
            values ($1, $2, $3, $4)
            returning id, status, requested_at, reviewed_at, notes, payload
          `,
          [
            "duplicate_order",
            auth.user.id,
            null,
            {
              external_id: externalId,
              original_order_id: originalOrderId,
              original_created_at: originalCreatedAt,
              original_assistant_id: originalAssistantId,
              notes,
              // extra context (optional)
              work_type: order.otype ?? null,
              app_status: order.app_status ?? null,
            },
          ]
        );

        const requestRow = insertReq.rows?.[0];
        if (!requestRow) throw new HttpError(500, "Failed to create request");

        const requester = await db.query(`select full_name from public.users where id = $1`, [auth.user.id]);
        const requesterName = requester.rows?.[0]?.full_name ?? "Um assistente";

        const admins = await db.query(`select id from public.users where role in ('admin','master') and active = true`);
        const adminIds = (admins.rows ?? []).map((row: any) => row.id).filter(Boolean);

        if (adminIds.length > 0) {
          const values: string[] = [];
          const params: any[] = [];
          adminIds.forEach((userId: string, idx: number) => {
            params.push(
              userId,
              "Solicitação de Ordem Duplicada",
              `${requesterName} solicitou revisão para a ordem ${externalId} que já existe no sistema.`,
              "info",
              auth.user.id
            );
            const base = idx * 5;
            values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
          });
          await db.query(
            `
              insert into public.notifications (user_id, title, message, type, created_by)
              values ${values.join(", ")}
            `,
            params
          );
        }

        await db.query("commit");
        return res.status(200).json({
          ok: true,
          request: {
            id: requestRow.id,
            external_id: externalId,
            requested_by: auth.user.id,
            original_order_id: originalOrderId,
            original_created_at: originalCreatedAt,
            original_assistant_id: originalAssistantId,
            original_assistant_name: null,
            notes,
            status: requestRow.status,
            reviewed_by: null,
            reviewed_at: null,
            review_notes: null,
            requested_at: requestRow.requested_at,
            requester_name: requesterName,
          },
        });
      } catch (err) {
        await db.query("rollback");
        throw err;
      }
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

