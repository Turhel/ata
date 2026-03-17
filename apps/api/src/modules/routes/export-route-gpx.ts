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

export type RouteGpxExportProfile = "inroute_legacy" | "generic_gpx";

function getCategoryLabel(category: string) {
  switch (category) {
    case "exterior":
      return "EXT";
    case "interior":
      return "INT";
    case "fint":
      return "FINT";
    case "overdue":
      return "OVD";
    default:
      return "REG";
  }
}

function categoryToSym(category: string, profile: RouteGpxExportProfile) {
  if (profile === "inroute_legacy") {
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
        return "Waypoint";
    }
  }

  switch (category) {
    case "exterior":
      return "Flag, Green";
    case "interior":
      return "Flag, Blue";
    case "fint":
      return "Flag, Orange";
    case "overdue":
      return "Flag, Red";
    default:
      return "Flag";
  }
}

function buildWaypointName(params: {
  seq: number;
  routeCategory: string;
  addressLine1: string | null;
}) {
  return `[${getCategoryLabel(params.routeCategory)}] ${String(params.seq).padStart(2, "0")} - ${params.addressLine1 ?? `Stop ${params.seq}`}`;
}

function buildWaypointComment(params: {
  routeCategory: string;
  geocodeReviewRequired: boolean;
  geocodeQuality: string | null;
}) {
  const parts = [`Categoria ${getCategoryLabel(params.routeCategory)}`];
  if (params.geocodeReviewRequired) {
    parts.push("REVISAR ENDEREÇO");
  }
  if (params.geocodeQuality) {
    parts.push(`Geocode ${params.geocodeQuality}`);
  }
  return parts.join(" | ");
}

function buildWaypointDescription(params: {
  seq: number;
  routeCategory: string;
  residentName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  geocodeReviewRequired: boolean;
}) {
  const lines = [
    `Seq ${params.seq}`,
    `Categoria: ${getCategoryLabel(params.routeCategory)}`,
    params.residentName ? `Morador: ${params.residentName}` : null,
    [params.addressLine1, params.addressLine2].filter(Boolean).join(" "),
    [params.city, params.state, params.zipCode].filter(Boolean).join(" / "),
    params.geocodeReviewRequired ? "ALERTA: revisar waypoint antes de sair." : null
  ].filter(Boolean);

  return lines.join(" | ");
}

function buildRouteDescription(params: {
  profile: RouteGpxExportProfile;
  stopCount: number;
  originCity: string | null;
  inspectorAccountCode: string;
}) {
  return [
    `Perfil: ${params.profile}`,
    `Conta: ${params.inspectorAccountCode}`,
    params.originCity ? `Saída: ${params.originCity}` : null,
    `Paradas: ${params.stopCount}`
  ]
    .filter(Boolean)
    .join(" | ");
}

export type ExportRouteGpxResult =
  | {
      ok: true;
      profile: RouteGpxExportProfile;
      fileName: string;
      contentType: "application/gpx+xml";
      content: string;
    }
  | { ok: false; error: "NOT_FOUND" | "INVALID_STATUS"; message: string };

export async function exportRouteGpx(params: {
  databaseUrl: string;
  routeId: string;
  generatedByUserId: string;
  profile?: RouteGpxExportProfile;
}): Promise<ExportRouteGpxResult> {
  const profile = params.profile ?? "inroute_legacy";
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
      const sym = categoryToSym(stop.routeCategory, profile);
      const sourceAddress = [stop.addressLine1, stop.city, stop.state, stop.zipCode].filter(Boolean).join(", ");
      const waypointName = buildWaypointName({
        seq: stop.seq,
        routeCategory: stop.routeCategory,
        addressLine1: stop.addressLine1
      });
      const waypointComment = buildWaypointComment({
        routeCategory: stop.routeCategory,
        geocodeReviewRequired: stop.geocodeReviewRequired,
        geocodeQuality: stop.geocodeQuality
      });
      const waypointDescription = buildWaypointDescription({
        seq: stop.seq,
        routeCategory: stop.routeCategory,
        residentName: stop.residentName,
        addressLine1: stop.addressLine1,
        addressLine2: stop.addressLine2,
        city: stop.city,
        state: stop.state,
        zipCode: stop.zipCode,
        geocodeReviewRequired: stop.geocodeReviewRequired
      });
      return [
        `    <rtept lat="${stop.latitude}" lon="${stop.longitude}">`,
        `      <name>${escapeXml(waypointName)}</name>`,
        `      <cmt>${escapeXml(waypointComment)}</cmt>`,
        `      <desc>${escapeXml(waypointDescription)}</desc>`,
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
    `    <desc>${escapeXml(
      buildRouteDescription({
        profile,
        stopCount: exportData.stops.length,
        originCity: exportData.route.originCity,
        inspectorAccountCode: exportData.route.inspectorAccountCode
      })
    )}</desc>`,
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
      reason: `gpx:${profile}`,
      metadata: {
        exportType: "gpx",
        profile,
        fileName,
        stopCount: exportData.stops.length
      }
  });

  return {
    ok: true,
    profile,
    fileName,
    contentType: "application/gpx+xml",
    content
  };
}
