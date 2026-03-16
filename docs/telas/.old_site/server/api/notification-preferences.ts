import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";

export const config = { runtime: "nodejs" };

function parseBody(req: any) {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req);
    const db = getPool();

    if (req.method === "GET") {
      try {
        const r = await db.query(
          `
            select
              email_notifications,
              order_updates,
              weekly_report,
              system_alerts,
              due_date_alerts
            from public.user_notification_preferences
            where user_id::text = $1 or user_id::text = $2
            limit 1
          `,
          [auth.user.id, auth.clerkUserId]
        );
        return res.status(200).json({ ok: true, preferences: r.rows?.[0] ?? null, missingTable: false });
      } catch (err: any) {
        if (err?.code === "42P01") {
          return res.status(200).json({ ok: true, preferences: null, missingTable: true });
        }
        throw err;
      }
    }

    if (req.method === "PATCH" || req.method === "POST") {
      const body = parseBody(req);
      try {
        const r = await db.query(
          `
            insert into public.user_notification_preferences
              (user_id, email_notifications, order_updates, weekly_report, system_alerts, due_date_alerts)
            values
              ($1, $2, $3, $4, $5, $6)
            on conflict (user_id)
            do update set
              email_notifications = excluded.email_notifications,
              order_updates = excluded.order_updates,
              weekly_report = excluded.weekly_report,
              system_alerts = excluded.system_alerts,
              due_date_alerts = excluded.due_date_alerts
            returning
              email_notifications,
              order_updates,
              weekly_report,
              system_alerts,
              due_date_alerts
          `,
          [
            auth.user.id,
            !!body.email_notifications,
            !!body.order_updates,
            !!body.weekly_report,
            !!body.system_alerts,
            !!body.due_date_alerts,
          ]
        );
        return res.status(200).json({ ok: true, preferences: r.rows?.[0] ?? null, missingTable: false });
      } catch (err: any) {
        if (err?.code === "42P01") {
          return res.status(200).json({ ok: true, preferences: null, missingTable: true });
        }
        throw err;
      }
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}

