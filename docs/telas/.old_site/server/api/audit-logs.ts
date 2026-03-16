import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { hasColumn, hasTable } from "../_lib/schema.js";
import { resolveOptionalUserId } from "../_lib/users.js";
import { fetchClerkAvatarUrls } from "../_lib/clerk.js";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();
    const hasAuditLogs = await hasTable(db as any, "audit_logs");
    const hasAvatarUrl = await hasColumn(db as any, "users", "avatar_url");

    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    if (req.method === "POST") {
      if (!hasAuditLogs) {
        return res.status(503).json({ ok: false, error: "Missing table: public.audit_logs" });
      }

      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!body?.action || !body?.resource_type) {
        return res.status(400).json({ ok: false, error: "action and resource_type are required" });
      }

      const requestedUserIdRaw =
        body.user_id != null && String(body.user_id).trim() !== "" ? String(body.user_id) : null;

      // user: só pode logar para si mesmo
      // admin/master: pode logar para outro usuário (quando necessário)
      let targetUserId: string | null = null;
      if (auth.user.role === "user") {
        targetUserId = auth.user.id;
      } else {
        targetUserId = requestedUserIdRaw ? await resolveOptionalUserId(db as any, requestedUserIdRaw) : auth.user.id;
      }

      const insertSql = `
        insert into public.audit_logs
          (action, resource_type, resource_id, user_id, details, ip_address, created_at)
        values
          ($1, $2, $3, $4, $5, $6, now())
        returning
          id,
          action,
          resource_type,
          resource_id,
          user_id,
          details,
          ip_address,
          created_at
      `;
      const r = await db.query(insertSql, [
        body.action,
        body.resource_type,
        body.resource_id ?? null,
        targetUserId,
        body.details ?? null,
        body.ip_address ?? null,
      ]);
      return res.status(200).json({ ok: true, log: r.rows?.[0] ?? null });
    }

    // GET é sensível: retorna logs globais.
    if (auth.user.role !== "admin" && auth.user.role !== "master") {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    if (!hasAuditLogs) {
      // Avoid breaking admin UI in environments that haven't created audit_logs yet.
      return res.status(200).json({
        ok: true,
        logs: [],
        stats: { total: 0, actions: {}, resources: {} },
        pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
        warning: { code: "missing_table", table: "audit_logs" },
      });
    }

    const pageRaw = Number(req.query?.page ?? 1);
    const pageSizeRaw = Number(req.query?.page_size ?? 20);
    const updatedSince = req.query?.updated_since ?? req.query?.updatedSince;
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(pageSizeRaw, 5), 100) : 20;
    const offset = (page - 1) * pageSize;

    const whereParts: string[] = [];
    const params: any[] = [];
    if (updatedSince) {
      params.push(String(updatedSince));
      whereParts.push(`a.created_at > $${params.length}`);
    }
    const whereSql = whereParts.length ? `where ${whereParts.join(" and ")}` : "";
    const avatarSelect = hasAvatarUrl ? "u.avatar_url as user_avatar_url" : "null as user_avatar_url";
    const clerkIdSelect = "u.clerk_user_id as user_clerk_user_id";

    const logsSql = `
      select
        a.id,
        a.action,
        a.resource_type,
        a.resource_id,
        a.details,
        a.ip_address,
        a.user_id,
        a.created_at,
        u.full_name as user_name,
        u.email as user_email,
        ${avatarSelect},
        ${clerkIdSelect}
      from public.audit_logs a
      left join public.users u
        on (u.id::text = a.user_id::text or u.clerk_user_id = a.user_id::text)
      ${whereSql}
      order by a.created_at desc
      limit $${params.length + 1} offset $${params.length + 2}
    `;
    const logs = await db.query(logsSql, [...params, pageSize, offset]);
    const items = (logs.rows ?? []) as any[];

    // Best-effort: backfill missing avatars for display (and optionally persist to HOT if column exists).
    const missingClerkIds = items
      .filter((r) => !r?.user_avatar_url && r?.user_clerk_user_id)
      .map((r) => String(r.user_clerk_user_id));
    const clerkAvatarById = await fetchClerkAvatarUrls(missingClerkIds);
    if (clerkAvatarById.size > 0) {
      const updates: { clerk_user_id: string; avatar_url: string }[] = [];
      items.forEach((row) => {
        const clerkId = row?.user_clerk_user_id ? String(row.user_clerk_user_id) : "";
        const url = clerkId ? clerkAvatarById.get(clerkId) : null;
        if (!url) return;
        if (!row.user_avatar_url) row.user_avatar_url = url;
        updates.push({ clerk_user_id: clerkId, avatar_url: url });
      });

      if (hasAvatarUrl && updates.length > 0) {
        const limited = updates.slice(0, 200);
        const valuesSql = limited.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ");
        const params: any[] = [];
        limited.forEach((v) => {
          params.push(v.clerk_user_id, v.avatar_url);
        });
        await db.query(
          `
            update public.users u
            set avatar_url = v.avatar_url
            from (values ${valuesSql}) as v(clerk_user_id, avatar_url)
            where u.clerk_user_id = v.clerk_user_id
              and (u.avatar_url is null or u.avatar_url = '')
          `,
          params,
        );
      }
    }

    const totalR = await db.query(`select count(*)::int as total from public.audit_logs a ${whereSql}`, params);
    const total = totalR.rows?.[0]?.total ?? 0;

    const actionsR = await db.query(
      `
        select action, count(*)::int as count
        from public.audit_logs a
        ${whereSql}
        group by action
      `,
      params,
    );
    const resourcesR = await db.query(
      `
        select resource_type, count(*)::int as count
        from public.audit_logs a
        ${whereSql}
        group by resource_type
      `,
      params,
    );

    const actions: Record<string, number> = {};
    (actionsR.rows ?? []).forEach((row: any) => {
      actions[String(row.action).toUpperCase()] = Number(row.count) || 0;
    });

    const resources: Record<string, number> = {};
    (resourcesR.rows ?? []).forEach((row: any) => {
      resources[String(row.resource_type)] = Number(row.count) || 0;
    });

    return res.status(200).json({
      ok: true,
      logs: items,
      stats: { total, actions, resources },
      pagination: {
        page,
        pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / pageSize) || 0,
      },
    });
  } catch (err: any) {
    console.error("[api] audit-logs error", { message: err?.message, stack: err?.stack });
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
