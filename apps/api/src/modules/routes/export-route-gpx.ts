import { randomUUID } from "node:crypto";
import { routeEvents } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";
import { getRouteExportData } from "./get-route-export-data.js";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function categoryToSym(category: string) {
  switch (category) {
    case "exterior":
      return "Dark_Green";
    case "interior":
      return "Pink";
    case "fint":
      return "Brown";
    case "overdue":
      return "Dark_Red";
    default:
      return null;
  }
}

export type ExportRouteGpxResult =
  | {
      ok: true;
      fileName: string;
      contentType: "application/gpx+xml";
      content: string;
    }
  | { ok: false; error: "NOT_FOUND" | "INVALID_STATUS"; message: string };

export async function exportRouteGpx(params: {
  databaseUrl: string;
  routeId: string;
  generatedByUserId: string;
}): Promise<ExportRouteGpxResult> {
  const exportData = await getRouteExportData({
    databaseUrl: params.databaseUrl,
    routeId: params.routeId
  });

  if (!exportData.ok) {
    return exportData;
  }

  const routeName = `${exportData.route.inspectorAccountCode} ${exportData.route.routeDate} v${exportData.route.version}`;
  const waypoints = exportData.stops
    .filter((stop) => stop.latitude && stop.longitude)
    .map((stop) => {
      const sym = categoryToSym(stop.routeCategory);
      const sourceAddress = [stop.addressLine1, stop.city, stop.state, stop.zipCode].filter(Boolean).join(", ");
      return [
        `    <rtept lat="${stop.latitude}" lon="${stop.longitude}">`,
        `      <name>${escapeXml(stop.addressLine1 ?? `Stop ${stop.seq}`)}</name>`,
        sourceAddress ? `      <src>${escapeXml(sourceAddress)}</src>` : null,
        sym ? `      <sym>${sym}</sym>` : null,
        "    </rtept>"
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const content = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="ATA Portal" xmlns="http://www.topografix.com/GPX/1/1">',
    "  <rte>",
    `    <name>${escapeXml(routeName)}</name>`,
    waypoints,
    "  </rte>",
    "</gpx>"
  ].join("\n");

  const fileName = `route-${exportData.route.inspectorAccountCode}-${exportData.route.routeDate}-v${exportData.route.version}.gpx`;
  const { db } = getDb(params.databaseUrl);
  await db.insert(routeEvents).values({
    id: randomUUID(),
    routeId: params.routeId,
    eventType: "export_generated",
    fromStatus: exportData.route.status,
    toStatus: exportData.route.status,
    performedByUserId: params.generatedByUserId,
    reason: "gpx",
    metadata: {
      exportType: "gpx",
      fileName,
      stopCount: exportData.stops.length
    }
  });

  return {
    ok: true,
    fileName,
    contentType: "application/gpx+xml",
    content
  };
}
