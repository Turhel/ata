import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db.js";
import { HttpError, requireAuth } from "../../_lib/auth.js";
import { hasColumn } from "../../_lib/schema.js";
import { isUuid } from "../../_lib/users.js";

export const config = { runtime: "nodejs" };

const APP_STATUSES = new Set([
  "available",
  "scheduled",
  "submitted",
  "followup",
  "canceled",
  "closed",
]);

function b64urlEncode(obj: any) {
  return Buffer.from(JSON.stringify(obj), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlDecode(str: string) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

function toStringArray(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  // aceita app_status=a,b,c
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBool(v: any): boolean | null {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);

    if (req.method !== "GET") {
      // POST desabilitado por filosofia (ordens nascem via import)
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const db = getPool();
    const q = req.query ?? {};

    const includeAddress2 = await hasColumn(db as any, "orders", "address2");
    const includeInspectorCode = await hasColumn(db as any, "orders", "inspector_code");
    const includeDueDateConfirmed = await hasColumn(db as any, "orders", "due_date_confirmed");

    // archived default false => archived_at is null
    const archived =
      q.archived === "true" ? true : q.archived === "false" ? false : false;

    // Optional: filter by order UUIDs
    const ids = toStringArray(q.ids);
    if (ids.length > 200) throw new HttpError(400, "ids max length is 200");

    // Optional: filter by assistant UUIDs (admin/master only)
    let assistant_ids = toStringArray(q.assistant_ids);
    if (assistant_ids.length > 200) throw new HttpError(400, "assistant_ids max length is 200");
    for (const id of assistant_ids) {
      if (!isUuid(id)) throw new HttpError(400, "assistant_ids must be UUIDs (users.id)");
    }

    // Optional: filter by external ids (worder)
    const external_id = q.external_id ? String(q.external_id) : null;
    const external_ids = toStringArray(q.external_ids);
    if (external_ids.length > 200) throw new HttpError(400, "external_ids max length is 200");

    const limitRaw = Number(q.limit ?? 10);
    const maxLimit = external_id || ids.length || external_ids.length ? 200 : 50;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), maxLimit) : 10;

    const appStatuses = toStringArray(q.app_status);
    for (const s of appStatuses) {
      if (!APP_STATUSES.has(s)) throw new HttpError(400, `Invalid app_status: ${s}`);
    }

    const pool_status = q.pool_status ? String(q.pool_status) : null;
    const otype = q.otype ? String(q.otype) : q.work_type ? String(q.work_type) : null;
    const state = q.state ? String(q.state) : null;
    const zip = q.zip ? String(q.zip) : null;
    const client_code = q.client_code ? String(q.client_code) : null;
    const search = q.search ? String(q.search).trim() : null;
    const updatedSince =
      q.updated_since ? String(q.updated_since) : q.updatedSince ? String(q.updatedSince) : null;

    // Compat (legacy UI): assistant_not_null=true
    const assistantNotNull = parseBool(q.assistant_not_null);
    // Compat (legacy UI): audit_flag=true/false
    const auditFlag = parseBool(q.audit_flag);
    // Prefer the new name: followup_suspected=true/false
    const followupSuspected =
      parseBool((q as any).followup_suspected) ?? auditFlag;

    const createdFrom = q.created_from ? String(q.created_from) : null;
    const createdTo = q.created_to ? String(q.created_to) : null;
    const submittedFrom = q.submitted_from ? String(q.submitted_from) : null;
    const submittedTo = q.submitted_to ? String(q.submitted_to) : null;
    const closedFrom = q.closed_from ? String(q.closed_from) : null;
    const closedTo = q.closed_to ? String(q.closed_to) : null;

    // RBAC:
    // - user: assistant_id forçado para auth.user.id
    // - admin/master: pode filtrar por assistant_id/inspector_id
    const allowAvailableLookup =
      auth.user.role === "user" && (external_id != null || external_ids.length > 0);

    let assistant_id: string | null =
      auth.user.role === "user" && !allowAvailableLookup ? auth.user.id : null;
    if (!assistant_id && q.assistant_id) {
      const assistantIdRaw = String(q.assistant_id).trim();
      if (assistantIdRaw) {
        if (isUuid(assistantIdRaw)) {
          assistant_id = assistantIdRaw;
        } else {
          // compat: ainda aceitamos clerk_user_id no query param
          const r = await db.query(`select id from public.users where clerk_user_id = $1`, [
            assistantIdRaw,
          ]);
          assistant_id = r.rows?.[0]?.id ?? null;
          if (!assistant_id) throw new HttpError(404, "Assistant not found");
        }
      }
    }

    const inspector_id =
      auth.user.role === "user" ? null : q.inspector_id ? String(q.inspector_id) : null;

    // Cursor: { updated_at, id }
    let cursor: { updated_at: string; id: string } | null = null;

    // Se o parâmetro cursor EXISTE na query mas é vazio => 400 (evita cursor= virar "page 1")
    const hasCursorParam = Object.prototype.hasOwnProperty.call(q, "cursor");
    const cursorRaw = hasCursorParam ? String((q as any).cursor ?? "") : "";

    if (ids.length && hasCursorParam) {
      throw new HttpError(400, "cursor cannot be used together with ids");
    }

    if (hasCursorParam) {
      if (!cursorRaw.trim()) {
        throw new HttpError(400, "cursor must be a non-empty base64url string");
      }

      let decoded: any;
      try {
        decoded = b64urlDecode(cursorRaw);
      } catch {
        throw new HttpError(400, "cursor is invalid");
      }

      if (
        !decoded ||
        typeof decoded !== "object" ||
        typeof decoded.updated_at !== "string" ||
        typeof decoded.id !== "string" ||
        !decoded.updated_at ||
        !decoded.id
      ) {
        throw new HttpError(400, "cursor shape is invalid");
      }

      cursor = { updated_at: decoded.updated_at, id: decoded.id };
    }

    const where: string[] = [];
    const params: any[] = [];
    const add = (cond: string, value: any) => {
      params.push(value);
      where.push(cond.replace("$$", `$${params.length}`));
    };

    where.push(archived ? "archived_at is not null" : "archived_at is null");

    if (ids.length) {
      params.push(ids);
      where.push(`id = any($${params.length})`);
    }

    if (external_id) add("external_id = $$", external_id);
    if (external_ids.length) {
      params.push(external_ids);
      where.push(`external_id = any($${params.length})`);
    }

    // Compat: some screens accidentally send both `assistant_id` and `assistant_ids` (same intent).
    // Treat it as a union list to avoid 400s.
    if (assistant_ids.length && assistant_id) {
      assistant_ids = Array.from(new Set([...assistant_ids, assistant_id]));
      assistant_id = null;
    }

    if (assistant_id) add("assistant_id = $$", assistant_id);
    if (assistant_ids.length) {
      if (auth.user.role === "user") throw new HttpError(403, "Forbidden (assistant_ids)");
      params.push(assistant_ids);
      where.push(`assistant_id = any($${params.length})`);
    }
    if (assistantNotNull === true) where.push("assistant_id is not null");
    if (inspector_id) add("inspector_id = $$", inspector_id);

    if (pool_status) add("pool_status = $$", pool_status);
    if (otype) add("otype = $$", otype);
    if (state) add("state = $$", state);
    if (zip) add("zip = $$", zip);
    if (client_code) add("client_code = $$", client_code);

    // Legacy/admin UX: simple search across key fields (keeps payload small, avoids extra endpoints)
    if (search) {
      params.push(`%${search}%`);
      const p = `$${params.length}`;
      const parts = [
        `external_id ilike ${p}`,
        `address1 ilike ${p}`,
        `city ilike ${p}`,
        `state ilike ${p}`,
        `zip ilike ${p}`,
        `owner_name ilike ${p}`,
        `client_code ilike ${p}`,
      ];
      if (includeAddress2) parts.push(`address2 ilike ${p}`);
      if (includeInspectorCode) parts.push(`inspector_code ilike ${p}`);
      where.push(`(${parts.join(" or ")})`);
    }

    if (appStatuses.length) {
      params.push(appStatuses);
      where.push(`app_status = any($${params.length})`);
    }

    if (followupSuspected === true) where.push(`coalesce(followup_suspected, false) = true`);
    if (followupSuspected === false) where.push(`coalesce(followup_suspected, false) = false`);

    if (createdFrom) add("created_at >= $$", createdFrom);
    if (createdTo) add("created_at <= $$", createdTo);
    if (submittedFrom) add("submitted_at >= $$", submittedFrom);
    if (submittedTo) add("submitted_at <= $$", submittedTo);
    if (closedFrom) add("closed_at >= $$", closedFrom);
    if (closedTo) add("closed_at <= $$", closedTo);

    if (allowAvailableLookup) {
      params.push(auth.user.id);
      params.push("available");
      where.push(
        `(assistant_id = $${params.length - 1} or (assistant_id is null and app_status = $${params.length}))`
      );
    }

    if (updatedSince) {
      params.push(updatedSince);
      where.push(`updated_at > $${params.length}`);
    }

    if (cursor?.updated_at && cursor?.id) {
      params.push(cursor.updated_at);
      params.push(cursor.id);
      where.push(`(updated_at, id) < ($${params.length - 1}, $${params.length})`);
    }

    const whereSql = where.length ? `where ${where.join(" and ")}` : "";

    const address2Select = includeAddress2 ? "address2" : "null as address2";
    const inspectorCodeSelect = includeInspectorCode ? "inspector_code" : "null as inspector_code";
    const dueDateConfirmedSelect = includeDueDateConfirmed
      ? "due_date_confirmed"
      : "false as due_date_confirmed";

    // Seleciona só colunas úteis (economiza egress)
    const sql = `
      select
        id,
        external_id,
        app_status,
        pool_status,
        otype,
        client_code,
        owner_name,
        address1, ${address2Select}, city, state, zip,
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
        followup_suspected,
        followup_suspected_reason
      from public.orders
      ${whereSql}
      order by updated_at desc, id desc
      limit ${limit + 1}
    `;

    const r = await db.query(sql, params);
    const rows = r.rows ?? [];

    const items = rows.slice(0, limit);
    let nextCursor: string | null = null;

    if (rows.length > limit && items.length) {
      const last = items[items.length - 1];
      nextCursor = b64urlEncode({ updated_at: last.updated_at, id: last.id });
    }

    return res.status(200).json({ ok: true, items, nextCursor });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
