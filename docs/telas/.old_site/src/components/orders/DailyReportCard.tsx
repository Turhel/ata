import { useEffect, useRef, useState, useMemo } from "react";
import { format, isAfter, startOfDay, parseISO } from "date-fns"; // Adicionado imports de data
import { Copy, Download, FileText, CheckCircle2, Users, Clock, AlertCircle } from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Order as BaseOrder } from "@/hooks/useOrders";
import type { FollowupKind } from "@/hooks/useOrderFollowups";
import { getNotDoneReasonLabel } from "@/lib/not-done-reasons";
import { useAuth } from "@/hooks/useAuth";
import { loadInspectorRouteNotes, type InspectorRouteNote } from "@/lib/inspectorRouteNotes";
import { getDateKeyInAppTimezone, getDueDateKey } from "@/lib/timezone";

// Estendendo o tipo Order
type Order = BaseOrder & {
  inspectors?: { id: string; name: string; code: string } | null;
  not_done_reason?: string | null;
  followup_kind?: FollowupKind;
  followup_reason?: string | null;
};

type WorkCategory = "regular" | "exterior" | "interior" | "fint";

interface DailyReportCardProps {
  date: Date;
  orders: Order[];
  assistantName?: string;
}

type SkippedEntry = { point: string; reason: string };

const categoryConfig: Record<string, { emoji: string; label: string }> = {
  regular: { emoji: "🪴", label: "Regular" },
  exterior: { emoji: "🏡", label: "Exterior" },
  interior: { emoji: "🛋️", label: "Interior" },
  fint: { emoji: "🏚️", label: "FINT" },
};

interface InspectorStats {
  code: string;
  name: string;
  categories: Record<string, number>;
  valid: number;
  dueDates: number;
  scheduled: number;
  notDone: Order[];
  total: number;
}

// Extrai as iniciais do nome (ex: "João Silva" → "JS")
const getNameInitials = (name: string): string => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getNotDoneReasonText = (order: Order): string => {
  // Prefer followup reason for pool exceptions (source of truth in the new flow)
  if (order.followup_kind === "pool_exception" && order.followup_reason) {
    if (order.followup_reason === "outro" && order.audit_reason) return order.audit_reason;
    return getNotDoneReasonLabel(order.followup_reason);
  }

  // Legacy / compat: not_done_reason + audit_reason
  if (order.not_done_reason === "outro" && order.audit_reason) return order.audit_reason;
  if (order.not_done_reason) return getNotDoneReasonLabel(order.not_done_reason);
  if (order.audit_reason) return order.audit_reason;
  return "Sem motivo";
};

const formatStopPointLabel = (stopPoint: string): string => {
  const raw = String(stopPoint || "").trim();
  if (!raw) return raw;
  if (raw === "rota_completa") return "rota completa";
  return raw.replace(/_/g, " ");
};

const isRouteComplete = (stopPoint: string | null | undefined): boolean => {
  const v = String(stopPoint ?? "")
    .trim()
    .toLowerCase();
  return v === "rota completa" || v === "rota_completa";
};

const splitSkippedPoints = (raw: string): string[] => {
  return String(raw || "")
    .split(/[,\n]/g)
    .map((p) => p.trim())
    .filter(Boolean);
};

const parseSkippedReasonLines = (raw: string): SkippedEntry[] => {
  const out: SkippedEntry[] = [];
  String(raw || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split("|");
      if (parts.length < 2) return;
      const point = parts[0].trim();
      const reason = parts.slice(1).join("|").trim();
      if (point && reason) out.push({ point, reason });
    });
  return out;
};

const parseSkippedReasonUsingPoints = (raw: string, points: string[]): SkippedEntry[] => {
  const text = String(raw || "").trim();
  if (!text || points.length === 0) return [];

  const lower = text.toLowerCase();
  const matches = points
    .map((point) => {
      const p = String(point || "").trim();
      if (!p) return null;
      const pLower = p.toLowerCase();

      // Prefer matching the "point |" marker to avoid false positives.
      let idx = lower.indexOf(`${pLower} |`);
      if (idx === -1) idx = lower.indexOf(`${pLower}|`);
      if (idx === -1) idx = lower.indexOf(pLower);

      return idx === -1 ? null : { point: p, idx };
    })
    .filter(Boolean) as Array<{ point: string; idx: number }>;

  if (matches.length === 0) return [];
  matches.sort((a, b) => a.idx - b.idx);

  const out: SkippedEntry[] = [];
  for (let i = 0; i < matches.length; i++) {
    const { point, idx } = matches[i];
    const pipeIdx = text.indexOf("|", idx);
    if (pipeIdx === -1) continue;

    const start = pipeIdx + 1;
    const end = i + 1 < matches.length ? matches[i + 1].idx : text.length;
    const reason = text
      .slice(start, end)
      .trim()
      .replace(/[.;\s]+$/g, "")
      .trim();

    if (reason) out.push({ point, reason });
  }

  return out;
};

const getSkippedEntries = (note: InspectorRouteNote | null | undefined): Array<{ point: string; reason: string }> => {
  if (!note) return [];

  const directEntries =
    Array.isArray(note.skipped_entries) && note.skipped_entries.length
      ? note.skipped_entries
          .map((e) => ({ point: String(e?.point ?? "").trim(), reason: String(e?.reason ?? "").trim() }))
          .filter((e) => e.point && e.reason)
      : [];
  if (directEntries.length) return directEntries;

  const points = splitSkippedPoints(note.skipped_points || "");
  const reasonsRaw = String(note.skipped_reason || "").trim();

  const reasonsFromLines = reasonsRaw ? parseSkippedReasonLines(reasonsRaw) : [];
  const reasonsFromPoints = reasonsRaw && points.length ? parseSkippedReasonUsingPoints(reasonsRaw, points) : [];
  const reasons = reasonsFromPoints.length > reasonsFromLines.length ? reasonsFromPoints : reasonsFromLines;

  const reasonsByPoint = new Map(reasons.map((r) => [r.point.toLowerCase(), r.reason]));

  if (points.length) {
    return points
      .map((p) => ({ point: p, reason: reasonsByPoint.get(p.toLowerCase()) || "" }))
      .filter((e) => e.point);
  }

  return reasons;
};

export function DailyReportCard({ date, orders, assistantName }: DailyReportCardProps) {
  const { user } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [inspectorFilter, setInspectorFilter] = useState<string>("all");
  const [routeNotes, setRouteNotes] = useState<InspectorRouteNote[]>([]);

  const formattedDate = format(date, "MM.dd.yyyy");
  const todayStr = format(date, "yyyy-MM-dd");

  useEffect(() => {
    if (!user) {
      setRouteNotes([]);
      return;
    }
    setRouteNotes(loadInspectorRouteNotes(user.id, todayStr));
  }, [user, todayStr]);

  // Get unique inspectors
  const availableInspectors = useMemo(() => {
    const inspectorsSet = new Set<string>();
    orders.forEach((order) => {
      if (order.inspectors?.code) {
        inspectorsSet.add(order.inspectors.code);
      }
    });
    return Array.from(inspectorsSet).sort();
  }, [orders]);

  // Filter orders by inspector
  const filteredOrders = useMemo(() => {
    if (inspectorFilter === "all") return orders;
    return orders.filter((o) => o.inspectors?.code === inspectorFilter);
  }, [orders, inspectorFilter]);

  const routeNotesByInspector = useMemo(() => {
    const map = new Map<string, InspectorRouteNote[]>();
    routeNotes.forEach((note) => {
      const code = note.inspector_code || "SEM_INSPETOR";
      const list = map.get(code) || [];
      map.set(code, [...list, note]);
    });
    return map;
  }, [routeNotes]);

  // Group orders by inspector
  const inspectorStatsMap = useMemo(() => {
    const map = new Map<string, InspectorStats>();

    filteredOrders.forEach((order) => {
      const inspectorCode = order.inspectors?.code || "SEM_INSPETOR";
      const inspectorName = order.inspectors?.name || "Sem Inspetor";

      if (!map.has(inspectorCode)) {
        map.set(inspectorCode, {
          code: inspectorCode,
          name: inspectorName,
          categories: { regular: 0, exterior: 0, interior: 0, fint: 0 },
          valid: 0,
          dueDates: 0,
          scheduled: 0,
          notDone: [],
          total: 0,
        });
      }

      const stats = map.get(inspectorCode)!;
      stats.total += 1;

      // Category
      const cat = order.category as string;
      if (cat && categoryConfig[cat]) {
        stats.categories[cat] = (stats.categories[cat] || 0) + 1;
      }

      // Valid orders
      const isCompleted = ["submitted", "followup", "closed"].includes(order.status || "");
      const isDueDateConfirmed = order.due_date_confirmed == null ? true : !!order.due_date_confirmed;
      const createdKey = order.created_at ? getDateKeyInAppTimezone(order.created_at) : null;
      const dueKey = order.due_date ? getDueDateKey(order.due_date) : null;

      if (isCompleted) {
        // Due Date: due date inserida em dias anteriores e feita hoje
        const isDueDateCompletion =
          isDueDateConfirmed &&
          !!dueKey &&
          dueKey <= todayStr &&
          !!createdKey &&
          createdKey < todayStr;

        if (isDueDateCompletion) {
          stats.dueDates += 1;
        } else {
          stats.valid += 1;
        }
      }

      // Not done
      if (order.followup_kind === "pool_exception" || order.status === "canceled") {
        stats.notDone.push(order);
      }

      // Scheduled (Future Due Dates): due date inserida hoje para data futura
      if (order.status === "scheduled" && isDueDateConfirmed && dueKey && dueKey > todayStr) {
        stats.scheduled += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredOrders, todayStr]);

  // Totals
  const totalValid = inspectorStatsMap.reduce((sum, s) => sum + s.valid, 0);
  const totalDueDates = inspectorStatsMap.reduce((sum, s) => sum + s.dueDates, 0);
  const totalScheduled = inspectorStatsMap.reduce((sum, s) => sum + s.scheduled, 0);
  const totalOrders = filteredOrders.length;

  const generateTextReport = () => {
    let report = `📆 *${formattedDate}*\n`;
    report += `👥 ${inspectorStatsMap.length} inspetor(es)\n`;

    inspectorStatsMap.forEach((inspector) => {
      report += `\n=======================\n`;
      report += `👤 *${inspector.code}*\n`;

      report += "\n";

      const categories = ["regular", "exterior", "interior", "fint"];
      categories.forEach((cat) => {
        const count = inspector.categories[cat] || 0;
        if (count > 0) {
          const config = categoryConfig[cat];
          report += `${config.emoji} ${config.label}: ${count}\n`;
        }
      });

      report += `\n✅ Válidas: ${inspector.valid}\n`;

      if (inspector.dueDates > 0) {
        report += `📆 Due Date: ${inspector.dueDates}\n`;
      }
      if (inspector.scheduled > 0) {
        report += `⏳ Agendadas: ${inspector.scheduled}\n`;
      }


      const routeEntries = routeNotesByInspector.get(inspector.code) || [];
      if (routeEntries.length > 0) {
        const latestRouteNote = routeEntries
          .slice()
          .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))[0];

        report += `\n---\n`;

        if (latestRouteNote?.stop_point) {
          report += isRouteComplete(latestRouteNote.stop_point)
            ? `• Rota completa\n`
            : `• Parou em: ${formatStopPointLabel(latestRouteNote.stop_point)}\n`;
        }

        const skippedEntries = getSkippedEntries(latestRouteNote);
        if (skippedEntries.length) {
          report += `• Pulados:\n`;
          skippedEntries.forEach((e) => {
            report += e.reason ? ` └ ${e.point} — ${e.reason}\n` : ` └ ${e.point}\n`;
          });
        }
      }

      if (inspector.notDone.length > 0) {
        report += `\n---\n`; // Divisória visual
        report += `❌ *NÃO FEITAS (${inspector.notDone.length})*\n`;
        inspector.notDone.forEach((order) => {
          // Lógica para mostrar motivo personalizado se existir
          let reasonLabel = getNotDoneReasonText(order);
          if (order.not_done_reason && order.followup_kind !== "pool_exception") {
            // Verifica se o motivo salvo é um dos padrão, se não, assume que é personalizado
            const standardLabel = getNotDoneReasonLabel(order.not_done_reason);
            // Se o getNotDoneReasonLabel retornar o próprio valor (ex: "Portão quebrado"),
            // significa que não achou na lista padrão ou é "outro", então exibimos o texto direto
            reasonLabel = standardLabel === "outro" ? order.audit_reason || "Outro motivo" : standardLabel;

            // Se tiver audit_reason (motivo personalizado) e o motivo for 'outro', usa o audit_reason
            if (order.not_done_reason === "outro" && order.audit_reason) {
              reasonLabel = order.audit_reason;
            }
          } else if (order.audit_reason && order.followup_kind !== "pool_exception") {
            reasonLabel = order.audit_reason;
          }

          report += `• ${order.external_id} - ${order.work_type}\n  └ ${reasonLabel}\n`;
        });
      }
    });

    if (inspectorStatsMap.length > 1) {
      report += `\n=======================\n`;
      report += `*📊 RESUMO GERAL*\n`;
      report += `✅ Total Válidas: ${totalValid}\n`;
      if (totalDueDates > 0) {
        report += `📆 Total Due Dates: ${totalDueDates}\n`;
      }
      if (totalScheduled > 0) {
        report += `⏳ Total Agendadas: ${totalScheduled}\n`;
      }
      report += `📊 Total Ordens: ${totalOrders}\n`;
    }

    return report;
  };

  // ... (Restante do código de Renderização Visual do componente mantém igual ao anterior)
  // Vou omitir o JSX visual para não ficar gigante, mas ele deve ser o mesmo que você já tem
  // Apenas a lógica do generateTextReport e useMemo acima mudaram.

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateTextReport());
      setIsCopied(true);
      toast.success("Relatório copiado para a área de transferência!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar relatório");
    }
  };

  const handleDownload = async () => {
    if (!reportRef.current) return;

    setIsDownloading(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        backgroundColor: "#0f172a",
        pixelRatio: 2,
        style: { margin: "0" },
      });

      const link = document.createElement("a");
      link.download = `relatorio-${format(date, "yyyy-MM-dd")}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Imagem baixada com sucesso!");
    } catch (err) {
      console.error("Error generating image:", err);
      toast.error("Erro ao gerar imagem");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
        {availableInspectors.length > 1 ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select value={inspectorFilter} onValueChange={setInspectorFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                <SelectValue placeholder="Filtrar por inspetor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Inspetores</SelectItem>
                {availableInspectors.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div />
        )}

        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 flex-1 sm:flex-none h-8 text-xs">
            {isCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {isCopied ? "Copiado!" : "Copiar Texto"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="gap-2 flex-1 sm:flex-none h-8 text-xs bg-primary hover:bg-primary/90"
          >
            <Download className="h-3.5 w-3.5" />
            {isDownloading ? "Gerando..." : "Baixar PNG"}
          </Button>
        </div>
      </div>

      {/* Visual Report */}
      <div className="flex justify-center bg-muted/20 p-4 rounded-xl border border-border/50 overflow-auto">
        <div
          ref={reportRef}
          className="p-6 rounded-xl bg-slate-900 text-slate-50 w-full max-w-md shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -mr-10 -mt-10" />
          <div className="relative flex items-center gap-4 mb-6 pb-4 border-b border-slate-700/50">
            <div className="p-3 bg-primary/20 rounded-xl shadow-inner border border-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Relatório Diário</p>
                {assistantName && (
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {assistantName}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{formattedDate}</p>
            </div>
          </div>

          <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
            <Users className="h-4 w-4" />
            <span>{inspectorStatsMap.length} inspetor(es) no relatório</span>
          </div>

          <div className="space-y-6">
            {inspectorStatsMap.map((inspector) => {
              const routeEntries = routeNotesByInspector.get(inspector.code) || [];
              const latestRouteNote = routeEntries
                .slice()
                .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))[0];
              const stopPoint = latestRouteNote?.stop_point || null;
              const skippedEntries = getSkippedEntries(latestRouteNote);
              return (
                <div key={inspector.code} className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-xs font-bold text-slate-300">
                    {getNameInitials(inspector.name)}
                  </div>
                  <span className="font-bold text-lg text-white">{inspector.code}</span>
                  {stopPoint && (
                    <Badge
                      variant="secondary"
                      className={
                        isRouteComplete(stopPoint)
                          ? "bg-emerald-500/25 text-emerald-100 border border-emerald-400/30 shadow-sm"
            : "bg-amber-500/25 text-amber-100 border border-amber-400/30 shadow-sm"
        }
      >
        {isRouteComplete(stopPoint) ? "Rota completa" : `Parou em: ${formatStopPointLabel(stopPoint)}`}
      </Badge>
    )}
                  <span className="ml-auto text-xs py-1 px-2 rounded-full bg-slate-800 text-slate-400 font-medium">
                    {inspector.total} ordens
                  </span>
                </div>

                <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {["regular", "exterior", "interior", "fint"].map((catKey) => {
                      const count = inspector.categories[catKey] || 0;
                      if (count === 0) return null;
                      const config = categoryConfig[catKey];
                      return (
                        <div
                          key={catKey}
                          className="flex items-center justify-between p-2 rounded bg-slate-800/30 border border-slate-700/30"
                        >
                          <span className="text-xs text-slate-300 flex items-center gap-1.5">
                            <span className="text-base">{config.emoji}</span> {config.label}
                          </span>
                          <span className="text-sm font-bold text-white">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <p className="text-[10px] text-emerald-400/80 uppercase font-semibold mb-0.5">Válidas</p>
                      <p className="text-lg font-bold text-emerald-400">{inspector.valid}</p>
                    </div>
                    {inspector.dueDates > 0 && (
                      <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                        <p className="text-[10px] text-blue-400/80 uppercase font-semibold mb-0.5">Due Date</p>
                        <p className="text-lg font-bold text-blue-400">{inspector.dueDates}</p>
                      </div>
                    )}
                    {inspector.scheduled > 0 && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                        <p className="text-[10px] text-amber-400/80 uppercase font-semibold mb-0.5">Agendadas</p>
                        <p className="text-lg font-bold text-amber-400">{inspector.scheduled}</p>
                      </div>
                    )}
                  </div>

                  {skippedEntries.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/50">
                      <p className="text-xs text-slate-300 font-semibold mb-2">Pontos na rota</p>
                      <div className="text-[11px] text-slate-400 mb-2">Pulados:</div>
                      <div className="space-y-2 text-[11px]">
                        {skippedEntries.map((entry, index) => (
                          <div
                            key={`${latestRouteNote?.id || "note"}:${index}:${entry.point}`}
                            className="p-2 rounded bg-slate-800/40 border border-slate-700/40"
                          >
                            <div className="flex items-center gap-2 text-slate-200">
                              <span className="text-slate-400">•</span>
                              <Badge
                                variant="outline"
                                className="bg-slate-950/20 border-slate-600/50 text-slate-200 text-[10px] px-2 py-0.5"
                              >
                                {entry.point}
                              </Badge>
                            </div>
                            <div className="ml-4 text-slate-400 italic">└ {entry.reason || "Sem motivo"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {inspector.notDone.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/50">
                      <p className="text-xs text-rose-400 font-semibold mb-2 flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3" />
                        Não Realizadas ({inspector.notDone.length})
                      </p>
                      <div className="space-y-1.5">
                        {inspector.notDone.map((order) => {
                          let reasonLabel = getNotDoneReasonText(order);
                          // Lógica visual para o card PNG
                          if (order.followup_kind !== "pool_exception" && order.not_done_reason === "outro" && order.audit_reason) {
                            reasonLabel = order.audit_reason;
                          } else if (order.followup_kind !== "pool_exception" && order.not_done_reason) {
                            reasonLabel = getNotDoneReasonLabel(order.not_done_reason);
                          } else if (order.followup_kind !== "pool_exception" && order.audit_reason) {
                            reasonLabel = order.audit_reason;
                          }

                          return (
                            <div
                              key={order.id}
                              className="text-[11px] p-2 bg-rose-950/20 border border-rose-900/30 rounded"
                            >
                              <div className="flex justify-between font-mono text-rose-200 mb-0.5">
                                <span>{order.external_id}</span>
                                <span className="opacity-70">{order.work_type}</span>
                              </div>
                              <div className="text-rose-300/70 italic">└ {reasonLabel}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
            <span>ATA Management Portal</span>
            <span>Gerado em {format(new Date(), "HH:mm")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

