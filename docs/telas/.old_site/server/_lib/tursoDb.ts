import { createClient, type Client } from "@libsql/client";

export function getTursoPool() {
  // Lazy init: do not crash the entire Vercel Function on cold start when
  // Turso env vars are missing (most routes don't need Turso).
  if (tursoClient) return tursoClient;

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("Missing TURSO_DATABASE_URL");

  tursoClient = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || "",
  });

  return tursoClient;
}

// Turso/libSQL HTTP client (singleton per runtime instance).
let tursoClient: Client | null = null;

// Schema para metricas diarias
export interface DailyMetric {
  id?: number;
  date: string;
  metric_type: string;
  metric_value: number;
  user_id?: string;
  created_at?: string;
}

// Schema para ordens arquivadas
export interface ArchivedOrder {
  id?: number;
  order_id: string;
  order_data: any;
  archived_at: string;
  archived_by: string;
}

// Funcoes para metricas diarias
export async function insertDailyMetric(metric: Omit<DailyMetric, "id" | "created_at">) {
  const db = getTursoPool();

  return db.execute({
    sql: `
      INSERT INTO daily_metrics (date, metric_type, metric_value, user_id)
      VALUES (?, ?, ?, ?)
    `,
    args: [metric.date, metric.metric_type, metric.metric_value, metric.user_id || null],
  });
}

export async function getDailyMetrics(
  startDate: string,
  endDate: string,
  metricType?: string,
  userId?: string,
) {
  const db = getTursoPool();

  let sql = `
    SELECT
      id,
      date,
      metric_type,
      metric_value,
      user_id,
      created_at
    FROM daily_metrics
    WHERE date BETWEEN ? AND ?
  `;
  const args: any[] = [startDate, endDate];

  if (metricType) {
    sql += " AND metric_type = ?";
    args.push(metricType);
  }

  if (userId) {
    sql += " AND user_id = ?";
    args.push(userId);
  }

  sql += " ORDER BY date DESC";

  const result = await db.execute({ sql, args });
  return (result.rows ?? []).map((r: any) => ({
    id: r.id == null ? undefined : Number(r.id),
    date: String(r.date),
    metric_type: String(r.metric_type),
    metric_value: Number(r.metric_value),
    user_id: r.user_id == null ? undefined : String(r.user_id),
    created_at: r.created_at == null ? undefined : String(r.created_at),
  })) as DailyMetric[];
}

// Funcoes para ordens arquivadas
export async function archiveOrder(orderId: string, orderData: any, archivedBy: string) {
  const db = getTursoPool();

  return db.execute({
    sql: `
      INSERT INTO orders_archive (order_id, order_data, archived_at, archived_by)
      VALUES (?, ?, datetime('now'), ?)
    `,
    args: [orderId, JSON.stringify(orderData), archivedBy],
  });
}

export async function getArchivedOrders(orderId?: string, startDate?: string, endDate?: string) {
  const db = getTursoPool();

  let sql = `
    SELECT
      id,
      order_id,
      order_data,
      archived_at,
      archived_by
    FROM orders_archive
  `;
  const args: any[] = [];

  if (orderId) {
    sql += " WHERE order_id = ?";
    args.push(orderId);
  } else if (startDate && endDate) {
    sql += " WHERE archived_at BETWEEN ? AND ?";
    args.push(startDate, endDate);
  }

  sql += " ORDER BY archived_at DESC";

  const result = await db.execute({ sql, args });
  return (result.rows ?? []).map((r: any) => ({
    id: r.id == null ? undefined : Number(r.id),
    order_id: String(r.order_id),
    // order_data pode vir como string JSON no libsql; mantemos compatibilidade.
    order_data: r.order_data,
    archived_at: String(r.archived_at),
    archived_by: String(r.archived_by),
  })) as ArchivedOrder[];
}
