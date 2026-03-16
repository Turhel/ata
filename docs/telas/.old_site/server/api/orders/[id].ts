import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { hasColumn } from "../../_lib/schema.js";

export const config = { runtime: "nodejs" };

const APP_STATUSES = new Set([
  "available",
  "scheduled",
  "submitted",
  "followup",
  "canceled",
  "closed",
]);

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

function needsPossession(app_status: string) {
  // orders_possession_check:
  // available/canceled -> pode ser null
  // senão -> exige assistant_id e inspector_id
  return !["available", "canceled"].includes(app_status);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    const id = req.query?.id ? String(req.query.id) : null;
    if (!id) throw new HttpError(400, "Missing id");

    const includeAddress2 = await hasColumn(db as any, "orders", "address2");
    const address2Select = includeAddress2 ? "address2" : "null as address2";
    const includeInspectorCode = await hasColumn(db as any, "orders", "inspector_code");
    const inspectorCodeSelect = includeInspectorCode ? "inspector_code" : "null as inspector_code";
    const includeUpdatedBy = await hasColumn(db as any, "orders", "updated_by");
    const includeDueDateConfirmed = await hasColumn(db as any, "orders", "due_date_confirmed");
    const dueDateConfirmedSelect = includeDueDateConfirmed ? "due_date_confirmed" : "false as due_date_confirmed";

    const selectFields = `
      id,
      external_id,
      app_status,
      pool_status,
      otype,
      client_code,
      owner_name,
      address1,
      ${address2Select},
      city,
      state,
      zip,
      assistant_id,
      inspector_id,
      ${inspectorCodeSelect},
      hold_until,
      ${dueDateConfirmedSelect},
      submitted_at,
      closed_at,
      archived_at,
      created_at,
      updated_at,
      last_seen_batch_id,
      last_seen_at,
      pool_row_hash,
      followup_suspected,
      followup_suspected_at,
      followup_suspected_reason
    `;

    async function loadOrder() {
      const r = await db.query(`select ${selectFields} from public.orders where id = $1`, [id]);
      const order = r.rows?.[0];
      if (!order) throw new HttpError(404, "Order not found");

      if (auth.user.role === "user") {
        const canAccessOwn = order.assistant_id === auth.user.id;
        const canAccessAvailable =
          order.assistant_id == null && String(order.app_status) === "available";
        if (!canAccessOwn && !canAccessAvailable) throw new HttpError(403, "Forbidden");
      }
      return order;
    }

    if (req.method === "GET") {
      const order = await loadOrder();
      return res.status(200).json({ ok: true, order });
    }

    if (req.method !== "PATCH") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const current = await loadOrder();
    const body = parseBody(req);

    // Campos permitidos (subset seguro alinhado ao schema)
    // (Se quiser economizar ainda mais, dá pra apertar isso conforme o front precisar)
    const next: Record<string, any> = {};

    // status principal
    if (body.app_status !== undefined) {
      const v = String(body.app_status);
      if (!APP_STATUSES.has(v)) throw new HttpError(400, `Invalid app_status: ${v}`);
      if (auth.user.role === "user") {
        if (v === "closed") throw new HttpError(403, "Forbidden (status)");
        // Assistente pode cancelar apenas ordens que estÃ£o sob sua posse (nÃ£o permite cancelar ordens do pool)
        if (v === "canceled" && current.assistant_id !== auth.user.id) {
          throw new HttpError(403, "Forbidden (status)");
        }
      }
      next.app_status = v;
    }

    // posse
    if (body.assistant_id !== undefined) {
      if (auth.user.role === "user") {
        if (body.assistant_id != null && body.assistant_id !== auth.user.id) {
          throw new HttpError(403, "Forbidden (assistant_id)");
        }
        // UsuÃ¡rio nÃ£o precisa enviar assistant_id; a API resolve pelo auth.user.id quando necessÃ¡rio.
        next.assistant_id = body.assistant_id ?? null;
      } else {
        next.assistant_id = body.assistant_id ?? null;
      }
    }
    if (body.inspector_id !== undefined) next.inspector_id = body.inspector_id ?? null;

    // datas
    if (body.hold_until !== undefined) next.hold_until = body.hold_until ?? null;
    if (body.due_date_confirmed !== undefined && includeDueDateConfirmed) {
      next.due_date_confirmed = !!body.due_date_confirmed;
    }
    if (body.submitted_at !== undefined) next.submitted_at = body.submitted_at ?? null;
    if (body.closed_at !== undefined) next.closed_at = body.closed_at ?? null;
    if (body.archived_at !== undefined) next.archived_at = body.archived_at ?? null;

    // followup flags
    if (body.followup_suspected !== undefined) {
      next.followup_suspected = !!body.followup_suspected;
      // followup_suspected_at: set automático quando true; limpa quando false
      next.followup_suspected_at = next.followup_suspected ? "now()" : null;
    }
    if (body.followup_suspected_reason !== undefined) {
      next.followup_suspected_reason = body.followup_suspected_reason ?? null;
    }

    // pool_status (se vocês deixam editar manualmente)
    if (body.pool_status !== undefined) next.pool_status = body.pool_status ?? null;

    // Campos de import/rastreio: só admin/master (recomendado)
    const isPrivileged = auth.user.role === "admin" || auth.user.role === "master";
    if (body.last_seen_batch_id !== undefined || body.last_seen_at !== undefined || body.pool_row_hash !== undefined) {
      if (!isPrivileged) throw new HttpError(403, "Forbidden (import fields)");
      if (body.last_seen_batch_id !== undefined) next.last_seen_batch_id = body.last_seen_batch_id ?? null;
      if (body.last_seen_at !== undefined) next.last_seen_at = body.last_seen_at ?? null;
      if (body.pool_row_hash !== undefined) next.pool_row_hash = body.pool_row_hash ?? null;
    }

    // Se não veio nada pra atualizar
    const keys = Object.keys(next).filter((k) => next[k] !== undefined);
    if (keys.length === 0) throw new HttpError(400, "No fields to update");

    // Validação do orders_possession_check ANTES do UPDATE
    const finalStatus = (next.app_status ?? current.app_status) as string;
    let finalAssistant =
      next.assistant_id !== undefined ? next.assistant_id : current.assistant_id;
    const finalInspector =
      next.inspector_id !== undefined ? next.inspector_id : current.inspector_id;

    // Assistente: se o status exige posse e nÃ£o veio assistant_id, assume o auth.user.id automaticamente.
    if (auth.user.role === "user" && needsPossession(finalStatus) && !finalAssistant) {
      next.assistant_id = auth.user.id;
      finalAssistant = auth.user.id;
    }

    if (needsPossession(finalStatus)) {
      const computedAssistant =
        next.assistant_id !== undefined ? next.assistant_id : current.assistant_id;
      const computedInspector =
        next.inspector_id !== undefined ? next.inspector_id : current.inspector_id;
      if (!finalAssistant || !finalInspector) {
        throw new HttpError(
          400,
          `app_status=${finalStatus} requires assistant_id and inspector_id`
        );
      }
      if (!computedAssistant || !computedInspector) {
        throw new HttpError(
          400,
          `app_status=${finalStatus} requires assistant_id and inspector_id`
        );
      }
    }

    // Sugestão forte (domínio): archivar só quando closed/canceled
    if (next.archived_at != null) {
      if (!["closed", "canceled"].includes(finalStatus)) {
        throw new HttpError(400, "archived_at requires app_status to be closed or canceled");
      }
    }

    // (Opcional) Se voltar pra available/canceled e quiser limpar posse automaticamente:
    // body.auto_clear_possession=true
    if (!needsPossession(finalStatus) && body.auto_clear_possession === true) {
      next.assistant_id = null;
      next.inspector_id = null;
    }

    // UPDATE dinâmico
    const setParts: string[] = [];
    const params: any[] = [];

    for (const k of Object.keys(next)) {
      if (next[k] === undefined) continue;

      if (k === "followup_suspected_at" && next[k] === "now()") {
        setParts.push(`${k} = now()`);
        continue;
      }

      params.push(next[k]);
      setParts.push(`${k} = $${params.length}`);
    }

    // audit
    if (includeUpdatedBy) {
      params.push(auth.user.id);
      setParts.push(`updated_by = $${params.length}`);
    }

    // updated_at sempre (index e cursor)
    setParts.push(`updated_at = now()`);

    params.push(id);

    const sql = `
      update public.orders
      set ${setParts.join(", ")}
      where id = $${params.length}
      returning ${selectFields}
    `;

    const r = await db.query(sql, params);
    return res.status(200).json({ ok: true, order: r.rows?.[0] ?? null });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
