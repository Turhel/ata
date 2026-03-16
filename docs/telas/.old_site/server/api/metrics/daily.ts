import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { requireAuth } from "../../_lib/auth.js";
import { getDailyMetrics, insertDailyMetric } from "../../_lib/tursoDb.js";
import { validateData } from "../../_lib/schemas.js";

const MetricCreateSchema = z.object({
  date: z.string().min(1, "Data e obrigatoria"),
  metric_type: z.string().min(1, "Tipo de metrica e obrigatorio"),
  metric_value: z.number().min(0, "Valor da metrica deve ser positivo"),
  user_id: z.string().optional(),
});

type MetricCreateInput = z.infer<typeof MetricCreateSchema>;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await requireAuth(req, { roles: ["admin", "master"] });

    if (req.method === "GET") {
      const { start_date, end_date, metric_type, user_id } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          ok: false,
          error: "start_date e end_date sao obrigatorios",
        });
      }

      const metrics = await getDailyMetrics(
        String(start_date),
        String(end_date),
        metric_type ? String(metric_type) : undefined,
        user_id ? String(user_id) : undefined,
      );

      return res.status(200).json({ ok: true, metrics });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const validated = validateData(MetricCreateSchema, body) as MetricCreateInput;

      await insertDailyMetric({
        date: validated.date,
        metric_type: validated.metric_type,
        metric_value: validated.metric_value,
        user_id: validated.user_id ?? auth.user.id,
      });

      return res.status(201).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err: any) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "unknown error" });
  }
}
