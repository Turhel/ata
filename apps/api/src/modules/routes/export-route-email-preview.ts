import { randomUUID } from "node:crypto";
import { routeEvents } from "../../db/schema.js";
import { getDb } from "../../lib/db.js";
import { getRouteExportData } from "./get-route-export-data.js";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type ExportRouteEmailPreviewResult =
  | {
      ok: true;
      subject: string;
      recipients: {
        inspectorEmail: string | null;
        assistantEmail: string | null;
      };
      textBody: string;
      htmlBody: string;
    }
  | { ok: false; error: "NOT_FOUND" | "INVALID_STATUS"; message: string };

export async function exportRouteEmailPreview(params: {
  databaseUrl: string;
  routeId: string;
  generatedByUserId: string;
}): Promise<ExportRouteEmailPreviewResult> {
  const exportData = await getRouteExportData({
    databaseUrl: params.databaseUrl,
    routeId: params.routeId
  });

  if (!exportData.ok) {
    return exportData;
  }

  const stopLines = exportData.stops.map((stop) => {
    const address = [stop.addressLine1, stop.city, stop.state, stop.zipCode].filter(Boolean).join(", ");
    const reviewFlag = stop.geocodeReviewRequired ? " [REVISAR]" : "";
    return `${stop.seq}. ${address}${reviewFlag}`;
  });

  const subject = `Rota ${exportData.route.inspectorAccountCode} - ${exportData.route.routeDate} (${exportData.stops.length} paradas)`;
  const textBody = [
    `Rota do dia ${exportData.route.routeDate}`,
    `Conta: ${exportData.route.inspectorAccountCode}`,
    `Inspetor: ${exportData.route.inspector.fullName ?? "não vinculado"}`,
    `Assistente: ${exportData.route.assistant.fullName ?? "não vinculado"}`,
    exportData.route.originCity ? `Origem: ${exportData.route.originCity}` : null,
    "",
    "Paradas:",
    ...stopLines
  ]
    .filter(Boolean)
    .join("\n");

  const htmlBody = [
    "<html><body>",
    `<h1>Rota do dia ${escapeHtml(exportData.route.routeDate)}</h1>`,
    `<p><strong>Conta:</strong> ${escapeHtml(exportData.route.inspectorAccountCode)}</p>`,
    `<p><strong>Inspetor:</strong> ${escapeHtml(exportData.route.inspector.fullName ?? "não vinculado")}</p>`,
    `<p><strong>Assistente:</strong> ${escapeHtml(exportData.route.assistant.fullName ?? "não vinculado")}</p>`,
    exportData.route.originCity
      ? `<p><strong>Origem:</strong> ${escapeHtml(exportData.route.originCity)}</p>`
      : "",
    "<ol>",
    ...exportData.stops.map((stop) => {
      const address = [stop.addressLine1, stop.city, stop.state, stop.zipCode].filter(Boolean).join(", ");
      const reviewFlag = stop.geocodeReviewRequired ? " <strong>[REVISAR]</strong>" : "";
      return `<li>${escapeHtml(address)}${reviewFlag}</li>`;
    }),
    "</ol>",
    "</body></html>"
  ].join("");

  const { db } = getDb(params.databaseUrl);
  await db.insert(routeEvents).values({
    id: randomUUID(),
    routeId: params.routeId,
    eventType: "export_generated",
    fromStatus: exportData.route.status,
    toStatus: exportData.route.status,
    performedByUserId: params.generatedByUserId,
    reason: "email_preview",
    metadata: {
      exportType: "email_preview",
      stopCount: exportData.stops.length
    }
  });

  return {
    ok: true,
    subject,
    recipients: {
      inspectorEmail: exportData.route.inspector.email,
      assistantEmail: exportData.route.assistant.email
    },
    textBody,
    htmlBody
  };
}
