import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../../_lib/db.js";
import { HttpError, requireAuth } from "../../../_lib/auth.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

async function selectRequest(db: any, id: string) {
  const r = await db.query(
    `
      select
        r.id,
        (r.payload->>'code') as code,
        req.id as requested_by,
        req.clerk_user_id as requested_by_clerk_user_id,
        r.requested_at,
        r.status,
        adm.id as admin_id,
        adm.clerk_user_id as admin_clerk_user_id,
        (r.payload->>'admin_notes') as admin_notes,
        (r.payload->>'admin_reviewed_at') as admin_reviewed_at,
        mst.id as master_id,
        mst.clerk_user_id as master_clerk_user_id,
        (r.payload->>'master_notes') as master_notes,
        (r.payload->>'master_reviewed_at') as master_reviewed_at,
        (r.payload->>'suggested_category') as suggested_category,
        (r.payload->>'created_work_type_id') as created_work_type_id,
        req.full_name as requester_name
      from public.requests r
      left join public.users req
        on (req.id::text = r.requested_by::text or req.clerk_user_id = r.requested_by::text)
      left join public.users adm
        on (adm.id::text = (r.payload->>'admin_id') or adm.clerk_user_id = (r.payload->>'admin_id'))
      left join public.users mst
        on (mst.id::text = (r.payload->>'master_id') or mst.clerk_user_id = (r.payload->>'master_id'))
      where r.id = $1 and r.type = 'work_type'
      limit 1
    `,
    [id]
  );
  return r.rows?.[0] ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    const id = req.query?.id ? String(req.query.id) : null;
    if (!id) throw new HttpError(400, "Missing id");

    if (req.method !== "PATCH") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = parseBody(req);
    const action = body.action ? String(body.action) : null;
    const notes = body.notes ? String(body.notes) : null;
    const category = body.category ? String(body.category) : null;
    const assistantValueRaw = body.assistant_value;
    const inspectorValueRaw = body.inspector_value;
    const assistantValue =
      assistantValueRaw === undefined || assistantValueRaw === null ? null : Number(assistantValueRaw);
    const inspectorValue =
      inspectorValueRaw === undefined || inspectorValueRaw === null ? null : Number(inspectorValueRaw);

    if (assistantValue !== null && (!Number.isFinite(assistantValue) || assistantValue < 0)) {
      throw new HttpError(400, "Invalid assistant_value");
    }
    if (inspectorValue !== null && (!Number.isFinite(inspectorValue) || inspectorValue < 0)) {
      throw new HttpError(400, "Invalid inspector_value");
    }

    if (action === "escalate") {
      if (!["admin", "master"].includes(auth.user.role)) {
        throw new HttpError(403, "Forbidden");
      }

      const existing = await selectRequest(db, id);
      const code = existing?.code ? String(existing.code).toUpperCase().trim() : "";
      if (!code) throw new HttpError(404, "Request not found");

      const payloadPatch: Record<string, any> = {
        admin_id: String(auth.user.id),
        admin_notes: notes ?? null,
        admin_reviewed_at: new Date().toISOString(),
      };
      if (category != null) payloadPatch.suggested_category = category;

      await db.query(
        `
          update public.requests
          set payload = coalesce(payload, '{}'::jsonb) || $1::jsonb
          where id = $2 and type = 'work_type'
        `,
        [JSON.stringify(payloadPatch), id]
      );

      const masters = await db.query(`select id from public.users where role = 'master' and active = true`);
      const notifications = (masters.rows ?? []).map((row: any) => ({
        user_id: row.id,
        title: "Nova solicitação de tipo de ordem",
        message: `Um admin encaminhou uma solicitação para adicionar o tipo de ordem "${code}".`,
        type: "info",
        created_by: auth.user.id,
      }));

      if (notifications.length > 0) {
        const values: string[] = [];
        const params: any[] = [];
        notifications.forEach((n, idx) => {
          const base = idx * 5;
          params.push(n.user_id, n.title, n.message, n.type, n.created_by);
          values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, false, now())`);
        });
        await db.query(
          `
            insert into public.notifications
              (user_id, title, message, type, created_by, read, created_at)
            values ${values.join(", ")}
          `,
          params
        );
      }

      const request = await selectRequest(db, id);
      if (!request) throw new HttpError(404, "Request not found");
      return res.status(200).json({ ok: true, request });
    }

    if (action === "reject") {
      if (auth.user.role !== "master") throw new HttpError(403, "Forbidden");

      const payloadPatch = {
        master_id: String(auth.user.id),
        master_notes: notes ?? null,
        master_reviewed_at: new Date().toISOString(),
      };

      await db.query(
        `
          update public.requests
          set status = 'rejected',
              reviewed_by = $1,
              reviewed_at = now(),
              payload = coalesce(payload, '{}'::jsonb) || $2::jsonb
          where id = $3 and type = 'work_type'
        `,
        [String(auth.user.id), JSON.stringify(payloadPatch), id]
      );

      const request = await selectRequest(db, id);
      if (!request) throw new HttpError(404, "Request not found");
      return res.status(200).json({ ok: true, request });
    }

    if (action === "approve") {
      if (auth.user.role !== "master") throw new HttpError(403, "Forbidden");
      if (!category) throw new HttpError(400, "Missing category");

      const existing = await selectRequest(db, id);
      const code = existing?.code ? String(existing.code).toUpperCase().trim() : "";
      if (!code) throw new HttpError(404, "Request not found");

      const nextAssistantValue = assistantValue ?? 0;
      const nextInspectorValue = inspectorValue ?? 0;

      let createdWorkTypeId: string | null = existing?.created_work_type_id ? String(existing.created_work_type_id) : null;

      if (createdWorkTypeId) {
        await db.query(
          `
            update public.work_types
            set category = $2,
                assistant_value = $3,
                inspector_value = $4,
                active = true,
                updated_at = now()
            where id = $1
          `,
          [createdWorkTypeId, category, nextAssistantValue, nextInspectorValue]
        );
      } else {
        const newType = await db.query(
          `
            insert into public.work_types
              (code, category, assistant_value, inspector_value, created_by, created_at, updated_at, active)
            values
              ($1, $2, $3, $4, $5, now(), now(), true)
            returning id
          `,
          [code, category, nextAssistantValue, nextInspectorValue, auth.user.id]
        );

        createdWorkTypeId = newType.rows?.[0]?.id ?? null;
      }
      const payloadPatch = {
        master_id: String(auth.user.id),
        master_notes: notes ?? null,
        master_reviewed_at: new Date().toISOString(),
        created_work_type_id: createdWorkTypeId,
        suggested_category: category,
        assistant_value: nextAssistantValue,
        inspector_value: nextInspectorValue,
      };

      await db.query(
        `
          update public.requests
          set status = 'approved',
              reviewed_by = $1,
              reviewed_at = now(),
              payload = coalesce(payload, '{}'::jsonb) || $2::jsonb
          where id = $3 and type = 'work_type'
        `,
        [String(auth.user.id), JSON.stringify(payloadPatch), id]
      );

      const request = await selectRequest(db, id);
      if (!request) throw new HttpError(404, "Request not found");
      return res.status(200).json({ ok: true, request });
    }

    throw new HttpError(400, "Invalid action");
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

