import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../../_lib/db.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";
import { resolveOptionalUserId, resolveUserId } from "../../../_lib/users.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["admin", "master"] });
    const db = getPool();

    const id = req.query?.id ? String(req.query.id) : null;
    if (!id) throw new HttpError(400, "Missing id");

    if (req.method !== "PATCH") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = parseBody(req);
    const status = body.status === "approved" || body.status === "rejected" ? body.status : null;
    if (!status) throw new HttpError(400, "status must be approved or rejected");
    const reviewNotes = body.review_notes ?? null;

    await db.query("begin");
    try {
      const reqRow = await db.query(
        `
          select
            id,
            type,
            status,
            requested_by,
            requested_at,
            reviewed_by,
            reviewed_at,
            notes,
            payload
          from public.requests
          where id = $1 and type = 'duplicate_order'
          for update
        `,
        [id]
      );
      const request = reqRow.rows?.[0];
      if (!request) throw new HttpError(404, "Request not found");

      const payload = request.payload ?? {};
      const externalId = payload.external_id ?? null;
      const originalOrderId = payload.original_order_id ?? null;
      const originalAssistantId = payload.original_assistant_id ?? null;

      const requestedById = await resolveUserId(db as any, request.requested_by);
      const resolvedOriginalAssistantId = await resolveOptionalUserId(db as any, originalAssistantId);

      if (status === "approved") {
        await db.query(
          `
            update public.orders
            set assistant_id = $1,
                followup_suspected = false,
                followup_suspected_reason = null,
                updated_at = now()
            where id = $2
          `,
          [requestedById, originalOrderId]
        );

        if (resolvedOriginalAssistantId) {
          await db.query(
            `
              insert into public.notifications (user_id, title, message, type, created_by)
              values ($1, $2, $3, $4, $5)
            `,
            [
              resolvedOriginalAssistantId,
              "Ordem Transferida",
              `A ordem ${externalId} foi transferida para outro assistente após revisão de duplicata.`,
              "info",
              auth.user.id,
            ]
          );
        }

        await db.query(
          `
            insert into public.notifications (user_id, title, message, type, created_by)
            values ($1, $2, $3, $4, $5)
          `,
          [
            requestedById,
            "Solicitação Aprovada",
            `Sua solicitação para a ordem ${externalId} foi aprovada. A ordem foi transferida para você.`,
            "success",
            auth.user.id,
          ]
        );
      } else {
        await db.query(
          `
            insert into public.notifications (user_id, title, message, type, created_by)
            values ($1, $2, $3, $4, $5)
          `,
          [
            requestedById,
            "Solicitação Rejeitada",
            `Sua solicitação para a ordem ${externalId} foi rejeitada.${reviewNotes ? ` Motivo: ${reviewNotes}` : ""}`,
            "warning",
            auth.user.id,
          ]
        );
      }

      const update = await db.query(
        `
          update public.requests
          set status = $1,
              reviewed_by = $2,
              reviewed_at = now(),
              notes = $3
          where id = $4
          returning id, status, requested_at, reviewed_at, notes, payload
        `,
        [status, auth.user.id, reviewNotes, id]
      );

      const updated = update.rows?.[0];
      const requesterRow = await db.query(`select id, full_name from public.users where id = $1`, [requestedById]);
      const requester = requesterRow.rows?.[0] ?? null;

      let originalAssistantName: string | null = null;
      if (resolvedOriginalAssistantId) {
        const origRow = await db.query(`select full_name from public.users where id = $1`, [resolvedOriginalAssistantId]);
        originalAssistantName = origRow.rows?.[0]?.full_name ?? null;
      }

      await db.query("commit");
      return res.status(200).json({
        ok: true,
        request: {
          id: updated?.id ?? id,
          external_id: payload.external_id ?? null,
          requested_by: requestedById,
          original_order_id: payload.original_order_id ?? null,
          original_created_at: payload.original_created_at ?? null,
          original_assistant_id: resolvedOriginalAssistantId,
          original_assistant_name: originalAssistantName,
          notes: payload.notes ?? null,
          status: updated?.status ?? status,
          reviewed_by: auth.user.id,
          reviewed_at: updated?.reviewed_at ?? null,
          review_notes: updated?.notes ?? null,
          requested_at: updated?.requested_at ?? request.requested_at,
          requester_name: requester?.full_name ?? null,
        },
      });
    } catch (err) {
      await db.query("rollback");
      throw err;
    }
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

