import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../../_lib/auth.js";
import { archiveOrder, getArchivedOrders } from "../../_lib/tursoDb.js";
import { getPool } from "../../_lib/db.js";
import { resolveOptionalUserId } from "../../_lib/users.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["admin", "master"] });

    if (req.method === "GET") {
      const { order_id, start_date, end_date } = req.query;

      const archivedOrders = await getArchivedOrders(
        order_id ? String(order_id) : undefined,
        start_date ? String(start_date) : undefined,
        end_date ? String(end_date) : undefined,
      );

      return res.status(200).json({ ok: true, archivedOrders });
    }

    if (req.method === "POST") {
      const { order_id } = req.query;

      if (!order_id || typeof order_id !== "string") {
        return res.status(400).json({
          ok: false,
          error: "order_id é obrigatório",
        });
      }

      const db = getPool();
      const orderResult = await db.query(
        `
          SELECT
            id,
            external_id,
            work_type,
            category,
            otype,
            client_code,
            status,
            app_status,
            assistant_id,
            inspector_id,
            inspector_code,
            due_date,
            execution_date,
            hold_until,
            submitted_at,
            closed_at,
            archived_at,
            created_at,
            updated_at,
            owner_name,
            address1,
            address2,
            city,
            state,
            zip,
            audit_flag,
            audit_reason,
            not_done_reason,
            pool_status,
            pool_match,
            pool_match_reason,
            last_seen_batch_id,
            last_seen_at,
            pool_row_hash,
            followup_suspected,
            followup_suspected_at,
            followup_suspected_reason,
            created_by,
            updated_by
          FROM public.orders
          WHERE id = $1
        `,
        [order_id],
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Ordem não encontrada" });
      }

      const orderData: any = orderResult.rows[0];
      orderData.created_by_raw = orderData.created_by ?? null;
      orderData.updated_by_raw = orderData.updated_by ?? null;
      orderData.created_by =
        orderData.created_by != null
          ? await resolveOptionalUserId(db as any, String(orderData.created_by))
          : null;
      orderData.updated_by =
        orderData.updated_by != null
          ? await resolveOptionalUserId(db as any, String(orderData.updated_by))
          : null;

      await archiveOrder(order_id, orderData, auth.user.id);

      return res.status(201).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
