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
    // LEGACY (FROZEN): do not add new features here.
    // Migration target is `/api/orders` (app_status + cursor pagination).
    // Keep this endpoint only for existing screens until they are migrated.
    const auth = await requireAuth(req);

    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = req.query ?? {};
    const limitRaw = Number(q.limit ?? 200);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;

    const status = q.status ? String(q.status) : null;
    const statusList = q.status_in ? String(q.status_in).split(",").map((s) => s.trim()).filter(Boolean) : [];
    const category = q.category ? String(q.category) : null;
    const auditFlag = q.audit_flag !== undefined ? q.audit_flag === "true" : null;
    const externalId = q.external_id ? String(q.external_id) : null;
    const externalIds = q.external_ids ? String(q.external_ids).split(",").map((s) => s.trim()).filter(Boolean) : [];
    const assistantNotNull = q.assistant_not_null === "true";
    const ids = q.ids ? String(q.ids).split(",").map((s) => s.trim()).filter(Boolean) : [];
    const createdFrom = q.created_from ? String(q.created_from) : null;
    const createdTo = q.created_to ? String(q.created_to) : null;
    const executionFrom = q.execution_from ? String(q.execution_from) : null;
    const executionTo = q.execution_to ? String(q.execution_to) : null;
    const search = q.search ? String(q.search) : null;
    const updatedSince = q.updated_since ?? q.updatedSince;

    const db = getPool();

    const assistantIdParam = q.assistant_id ? String(q.assistant_id).trim() : null;
    const assistantIdsRaw = q.assistant_ids ? String(q.assistant_ids).split(",").map((s) => s.trim()).filter(Boolean) : [];

    // user role: always filter to own internal id (compat: also match legacy rows that used clerk_user_id)
    const assistantIdInternal =
      auth.user.role === "user"
        ? auth.user.id
        : assistantIdParam
          ? await resolveUserId(db as any, assistantIdParam)
          : null;

    const assistantTextIdsForSingle =
      auth.user.role === "user"
        ? [auth.user.id, auth.clerkUserId]
        : assistantIdParam?.startsWith("user_")
          ? [assistantIdInternal, assistantIdParam]
          : assistantIdInternal
            ? [assistantIdInternal]
            : [];

    const assistantTextIdsForList =
      assistantIdsRaw.length > 0
        ? Array.from(new Set([
            ...(await Promise.all(assistantIdsRaw.map((v) => resolveUserId(db as any, v)))),
            ...assistantIdsRaw.filter((v) => v.startsWith("user_")),
          ]))
        : [];

    const where: string[] = [];
    const params: any[] = [];
    const add = (cond: string, value: any) => {
      params.push(value);
      where.push(cond.replace("$$", `$${params.length}`));
    };

    if (assistantTextIdsForSingle.length) {
      params.push(assistantTextIdsForSingle);
      where.push(`assistant_id::text = any($${params.length})`);
    }
    if (!assistantTextIdsForSingle.length && assistantTextIdsForList.length) {
      params.push(assistantTextIdsForList);
      where.push(`assistant_id::text = any($${params.length})`);
    }
    if (status) add("status = $$", status);
    if (statusList.length) {
      params.push(statusList);
      where.push(`status = any($${params.length})`);
    }
    if (category) add("category = $$", category);
    if (auditFlag !== null) add("audit_flag = $$", auditFlag);
    if (assistantNotNull) where.push("assistant_id is not null");
    if (ids.length) {
      params.push(ids);
      where.push(`id = any($${params.length})`);
    }
    if (createdFrom) add("created_at >= $$", createdFrom);
    if (createdTo) add("created_at <= $$", createdTo);
    if (executionFrom) add("execution_date >= $$", executionFrom);
    if (executionTo) add("execution_date <= $$", executionTo);
    if (externalId) add("external_id = $$", externalId);
    if (externalIds.length) {
      params.push(externalIds);
      where.push(`external_id = any($${params.length})`);
    }
    if (updatedSince) add("updated_at > $$", String(updatedSince));
    if (search) {
      params.push(`%${search}%`);
      const p = `$${params.length}`;
      where.push(`(external_id ilike ${p} or address1 ilike ${p} or address2 ilike ${p})`);
    }

    const whereSql = where.length ? `where ${where.join(" and ")}` : "";
    const sql = `
      select
        o.id,
        o.external_id,
        o.work_type,
        o.category,
        o.client_code,
        o.status,
        o.assistant_id as assistant_id_raw,
        u.id as assistant_id,
        u.clerk_user_id as assistant_clerk_user_id,
        o.inspector_id,
        o.inspector_code,
        o.due_date,
        o.execution_date,
        o.created_at,
        o.updated_at,
        o.owner_name,
        o.address1,
        o.address2,
        o.city,
        o.state,
        o.zip,
        o.audit_flag,
        o.audit_reason,
        o.not_done_reason,
        o.pool_status,
        o.pool_match,
        o.pool_match_reason,
        o.created_by as created_by_raw,
        uc.id as created_by,
        uc.clerk_user_id as created_by_clerk_user_id,
        o.updated_by as updated_by_raw,
        uu.id as updated_by,
        uu.clerk_user_id as updated_by_clerk_user_id
      from public.orders o
      left join public.users u
        on (u.id::text = o.assistant_id::text or u.clerk_user_id = o.assistant_id::text)
      left join public.users uc
        on (uc.id::text = o.created_by::text or uc.clerk_user_id = o.created_by::text)
      left join public.users uu
        on (uu.id::text = o.updated_by::text or uu.clerk_user_id = o.updated_by::text)
      ${whereSql}
      order by o.created_at desc
      limit ${limit}
    `;

    if (req.method === "GET") {
      const r = await db.query(sql, params);
      return res.status(200).json({ ok: true, orders: r.rows ?? [] });
    }

    const body = parseBody(req);
    if (!body.external_id) throw new HttpError(400, "external_id is required");

    const insertSql = `
      insert into public.orders
        (external_id, work_type, category, inspector_id, inspector_code, status, due_date, execution_date,
         address1, address2, city, zip, not_done_reason, assistant_id, created_at, updated_at, created_by, updated_by)
      values
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),now(),$15,$16)
      returning
        id,
        external_id,
        work_type,
        category,
        client_code,
        status,
        assistant_id,
        inspector_id,
        inspector_code,
        due_date,
        execution_date,
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
        created_by,
        updated_by
    `;

    const r = await db.query(insertSql, [
      body.external_id,
      body.work_type ?? null,
      body.category ?? null,
      body.inspector_id ?? null,
      body.inspector_code ?? null,
      body.status ?? null,
      body.due_date ?? null,
      body.execution_date ?? null,
      body.address1 ?? null,
      body.address2 ?? null,
      body.city ?? null,
      body.zip ?? null,
      body.not_done_reason ?? null,
      body.assistant_id != null ? await resolveOptionalUserId(db as any, body.assistant_id) : null,
      auth.user.id,
      auth.user.id,
    ]);
    return res.status(200).json({ ok: true, order: r.rows?.[0] ?? null });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
