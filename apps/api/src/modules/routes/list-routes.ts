import { and, count, desc, eq, sql } from "drizzle-orm";
import { inspectorAccounts, routes, routeStops } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";

type RouteStatus = (typeof routes.status.enumValues)[number];

export async function listRoutes(params: {
  databaseUrl: string;
  routeDate?: string;
  status?: RouteStatus;
  inspectorAccountCode?: string;
  page: number;
  pageSize: number;
  offset: number;
}) {
  const { db } = getDb(params.databaseUrl);
  const conditions = [];

  if (params.routeDate) {
    conditions.push(eq(routes.routeDate, params.routeDate));
  }

  if (params.status) {
    conditions.push(eq(routes.status, params.status));
  }

  if (params.inspectorAccountCode) {
    conditions.push(eq(inspectorAccounts.accountCode, params.inspectorAccountCode));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rowsQuery = db
    .select({
      id: routes.id,
      routeDate: routes.routeDate,
      sourceBatchId: routes.sourceBatchId,
      inspectorAccountId: routes.inspectorAccountId,
      inspectorAccountCode: inspectorAccounts.accountCode,
      inspectorId: routes.inspectorId,
      assistantUserId: routes.assistantUserId,
      originCity: routes.originCity,
      optimizationMode: routes.optimizationMode,
      status: routes.status,
      version: routes.version,
      publishedAt: routes.publishedAt,
      createdAt: routes.createdAt,
      updatedAt: routes.updatedAt,
      totalStops: count(routeStops.id)
    })
    .from(routes)
    .innerJoin(inspectorAccounts, eq(inspectorAccounts.id, routes.inspectorAccountId))
    .leftJoin(routeStops, eq(routeStops.routeId, routes.id))
    .groupBy(routes.id, inspectorAccounts.accountCode)
    .orderBy(desc(routes.routeDate), desc(routes.createdAt))
    .limit(params.pageSize)
    .offset(params.offset);

  const totalQuery = db
    .select({ total: count() })
    .from(routes)
    .innerJoin(inspectorAccounts, eq(inspectorAccounts.id, routes.inspectorAccountId));

  const [rows, totalRows] = await Promise.all([
    whereClause ? rowsQuery.where(whereClause) : rowsQuery,
    whereClause ? totalQuery.where(whereClause) : totalQuery
  ]);

  return {
    routes: rows,
    total: totalRows[0]?.total ?? 0
  };
}
