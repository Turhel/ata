import { useRef, useState, useMemo } from 'react';
import { format, eachDayOfInterval, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Copy, Download, CheckCircle2, Calendar, Users, UserCheck } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { Order as BaseOrder } from '@/hooks/useOrders';
import type { FollowupKind } from '@/hooks/useOrderFollowups';
import { getNotDoneReasonLabel } from '@/lib/not-done-reasons';

type Order = BaseOrder & {
  inspectors?: { id: string; name: string; code: string } | null;
  not_done_reason?: string | null;
  followup_kind?: FollowupKind;
  followup_reason?: string | null;
  followup_created_at?: string | null;
};

type WorkCategory = 'regular' | 'exterior' | 'interior' | 'fint';

interface PeriodReportCardProps {
  orders: Order[];
  startDate: Date;
  endDate: Date;
  assistantName?: string;
}

const categoryConfig: Record<WorkCategory, { emoji: string; label: string }> = {
  regular: { emoji: '🪴', label: 'Regular' },
  exterior: { emoji: '🏡', label: 'Exterior' },
  interior: { emoji: '🛋️', label: 'Interior' },
  fint: { emoji: '🏚️', label: 'FINT' },
};

interface InspectorStats {
  code: string;
  name: string;
  categories: Record<WorkCategory, number>;
  valid: number;
  approved: number;
  rejected: number;
  dueDates: number;
  notDone: Order[];
  total: number;
  dailyStats: { day: Date; count: number }[];
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

const getOrderActivityDate = (order: Order): string | null => {
  return order.execution_date || order.followup_created_at || order.updated_at || order.created_at || null;
};

export function PeriodReportCard({ orders, startDate, endDate, assistantName }: PeriodReportCardProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [inspectorFilter, setInspectorFilter] = useState<string>('all');

  const periodStart = startOfDay(startDate);
  const periodEnd = endOfDay(endDate);
  const daysOfPeriod = eachDayOfInterval({ start: periodStart, end: periodEnd });

  // Get unique inspectors from all orders
  const availableInspectors = useMemo(() => {
    const inspectorsSet = new Set<string>();
    orders.forEach(order => {
      if (order.inspectors?.code) {
        inspectorsSet.add(order.inspectors.code);
      }
    });
    return Array.from(inspectorsSet).sort();
  }, [orders]);

  const formattedPeriodRange = `${format(periodStart, 'dd/MM')} - ${format(periodEnd, 'dd/MM/yyyy')}`;
  const periodDays = daysOfPeriod.length;

  // Filter orders for this period and by inspector
  const periodOrders = orders.filter(order => {
    const activityDate = getOrderActivityDate(order);
    if (!activityDate) return false;
    const orderDate = new Date(activityDate);
    const inPeriod = isWithinInterval(orderDate, { start: periodStart, end: periodEnd });
    const matchesInspector = inspectorFilter === 'all' || order.inspectors?.code === inspectorFilter;
    return inPeriod && matchesInspector;
  });

  // Group orders by inspector
  const inspectorStatsMap = new Map<string, InspectorStats>();

  periodOrders.forEach(order => {
    const activityDate = getOrderActivityDate(order);
    const inspectorCode = order.inspectors?.code || 'SEM_INSPETOR';
    const inspectorName = order.inspectors?.name || 'Sem Inspetor';
    
    if (!inspectorStatsMap.has(inspectorCode)) {
      inspectorStatsMap.set(inspectorCode, {
        code: inspectorCode,
        name: inspectorName,
        categories: { regular: 0, exterior: 0, interior: 0, fint: 0 },
        valid: 0,
        approved: 0,
        rejected: 0,
        dueDates: 0,
        notDone: [],
        total: 0,
        dailyStats: daysOfPeriod.map(day => ({ day, count: 0 })),
      });
    }

    const stats = inspectorStatsMap.get(inspectorCode)!;
    stats.total += 1;

    // Category
    const cat = order.category as WorkCategory;
    if (cat && categoryConfig[cat]) {
      stats.categories[cat] += 1;
    }

    // Status counts
    if (['submitted', 'followup', 'closed'].includes(order.status || '')) {
      stats.valid += 1;
    }
    if (order.status === 'closed') {
      stats.approved += 1;
    }
    if (order.status === 'available') {
      stats.rejected += 1;
    }
    if (order.followup_kind === 'pool_exception' || order.status === 'canceled') {
      stats.notDone.push(order);
    }

    // Due dates
    if (order.due_date && order.due_date_confirmed && activityDate) {
      const dueDate = new Date(order.due_date);
      const activityDateObj = new Date(activityDate);
      if (format(dueDate, 'yyyy-MM-dd') === format(activityDateObj, 'yyyy-MM-dd')) {
        stats.dueDates += 1;
      }
    }

    // Daily stats
    if (activityDate) {
      const orderDate = format(new Date(activityDate), 'yyyy-MM-dd');
      const dayIndex = stats.dailyStats.findIndex(d => format(d.day, 'yyyy-MM-dd') === orderDate);
      if (dayIndex >= 0) {
        stats.dailyStats[dayIndex].count += 1;
      }
    }
  });

  const inspectorStats = Array.from(inspectorStatsMap.values()).sort((a, b) => b.total - a.total);

  // Totals
  const totalValid = inspectorStats.reduce((sum, s) => sum + s.valid, 0);
  const totalApproved = inspectorStats.reduce((sum, s) => sum + s.approved, 0);
  const totalRejected = inspectorStats.reduce((sum, s) => sum + s.rejected, 0);
  const totalDueDates = inspectorStats.reduce((sum, s) => sum + s.dueDates, 0);
  const totalOrders = periodOrders.length;

  // Total categories across all inspectors
  const totalCategories: Record<WorkCategory, number> = { regular: 0, exterior: 0, interior: 0, fint: 0 };
  inspectorStats.forEach(inspector => {
    (['regular', 'exterior', 'interior', 'fint'] as WorkCategory[]).forEach(cat => {
      totalCategories[cat] += inspector.categories[cat];
    });
  });

  const generateTextReport = () => {
    let report = `📅 *RELATÓRIO DE PERÍODO*\n`;
    report += `📆 ${formattedPeriodRange} (${periodDays} dias)\n`;
    report += `👥 ${inspectorStats.length} inspetor(es)\n\n`;

    inspectorStats.forEach((inspector) => {
      report += `${'='.repeat(23)}\n`;
      report += `👤 *${inspector.code}*\n\n`;
      
      // Categories for this inspector
      const categories: WorkCategory[] = ['regular', 'exterior', 'interior', 'fint'];
      categories.forEach(cat => {
        const count = inspector.categories[cat] || 0;
        const config = categoryConfig[cat];
        report += `${config.emoji} ${config.label}: ${count}\n`;
      });
      
      report += `\n✅ Válidas: ${inspector.valid}\n`;
      report += `✔️ Aprovadas: ${inspector.approved}\n`;
      report += `❌ Rejeitadas: ${inspector.rejected}\n`;
      report += `📆 Due Dates: ${inspector.dueDates}\n`;
      
      if (inspector.notDone.length > 0) {
        report += `\n*NÃO FEITAS (${inspector.notDone.length})*\n`;
        inspector.notDone.forEach(order => {
          const reason = order.followup_kind === 'pool_exception' && order.followup_reason
            ? getNotDoneReasonLabel(order.followup_reason)
            : order.not_done_reason
              ? getNotDoneReasonLabel(order.not_done_reason)
              : (order.audit_reason || 'Sem motivo');
          report += `❌ ${reason} - ${order.external_id} - ${order.work_type}\n`;
        });
      }
      report += '\n';
    });

    report += `${'='.repeat(23)}\n`;
    report += `*RESUMO GERAL*\n\n`;
    
    // Total categories
    (['regular', 'exterior', 'interior', 'fint'] as WorkCategory[]).forEach(cat => {
      const config = categoryConfig[cat];
      report += `${config.emoji} ${config.label}: ${totalCategories[cat]}\n`;
    });
    
    report += `\n✅ Total Válidas: ${totalValid}\n`;
    report += `✔️ Total Aprovadas: ${totalApproved}\n`;
    report += `❌ Total Rejeitadas: ${totalRejected}\n`;
    report += `📆 Total Due Dates: ${totalDueDates}\n`;
    report += `📊 Total do Período: ${totalOrders}\n`;
    
    return report;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateTextReport());
      setIsCopied(true);
      toast.success('Relatório copiado!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar relatório');
    }
  };

  const handleDownload = async () => {
    if (!reportRef.current) return;
    
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        backgroundColor: '#0f172a',
        pixelRatio: 2,
      });
      
      const link = document.createElement('a');
      link.download = `relatorio-${format(periodStart, 'yyyy-MM-dd')}-${format(periodEnd, 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('Imagem baixada com sucesso!');
    } catch (err) {
      console.error('Error generating image:', err);
      toast.error('Erro ao gerar imagem');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Inspector filter */}
      <div className="flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-muted-foreground" />
        <Select value={inspectorFilter} onValueChange={setInspectorFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por inspetor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Inspetores</SelectItem>
            {availableInspectors.map((code) => (
              <SelectItem key={code} value={code}>{code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
        >
          {isCopied ? (
            <CheckCircle2 className="h-4 w-4 text-chart-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {isCopied ? 'Copiado!' : 'Copiar Texto'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? 'Gerando...' : 'Baixar PNG'}
        </Button>
      </div>

      {/* Visual report card */}
      <div
        ref={reportRef}
        className="p-6 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-700">
          <div className="p-2.5 bg-primary/20 rounded-lg">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-400">Relatório de Período</p>
              {assistantName && (
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {assistantName}
                </span>
              )}
            </div>
            <p className="text-lg font-bold">📅 {formattedPeriodRange}</p>
            <p className="text-xs text-slate-500">{periodDays} dias</p>
          </div>
        </div>

        {/* Inspectors count */}
        <div className="mb-4 p-3 bg-slate-800/50 rounded-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="text-slate-400">Inspetores:</span>
          <span className="font-semibold">{inspectorStats.length}</span>
        </div>

        {/* Per inspector stats */}
        <div className="space-y-4 mb-4">
          {inspectorStats.map((inspector) => (
            <div key={inspector.code} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
                <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-xs font-bold text-slate-300">
                  {getNameInitials(inspector.name)}
                </div>
                <span className="font-bold text-primary">{inspector.code}</span>
                <span className="ml-auto text-slate-400 text-sm">({inspector.total} ordens)</span>
              </div>

              {/* Categories for this inspector */}
              <div className="grid grid-cols-4 gap-1 mb-2">
                {(['regular', 'exterior', 'interior', 'fint'] as WorkCategory[]).map((cat) => {
                  const config = categoryConfig[cat];
                  const count = inspector.categories[cat] || 0;
                  return (
                    <div
                      key={cat}
                      className="p-2 bg-slate-800/50 rounded text-center"
                    >
                      <span className="text-sm">{config.emoji}</span>
                      <p className="font-bold text-sm">{count}</p>
                    </div>
                  );
                })}
              </div>

              {/* Stats for this inspector */}
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="p-2 bg-emerald-500/20 rounded flex justify-between">
                  <span className="text-emerald-400">✅ Válidas</span>
                  <span className="font-bold text-emerald-400">{inspector.valid}</span>
                </div>
                <div className="p-2 bg-blue-500/20 rounded flex justify-between">
                  <span className="text-blue-400">📆 Due Dates</span>
                  <span className="font-bold text-blue-400">{inspector.dueDates}</span>
                </div>
              </div>

              {/* Not done for this inspector */}
              {inspector.notDone.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <p className="text-xs text-red-400 font-semibold mb-1">
                    ❌ Não Feitas ({inspector.notDone.length})
                  </p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {inspector.notDone.map((order) => (
                      <div
                        key={order.id}
                        className="text-[10px] p-1.5 bg-red-500/10 rounded text-red-300"
                      >
                        {(order.followup_kind === 'pool_exception' && order.followup_reason
                          ? getNotDoneReasonLabel(order.followup_reason)
                          : order.not_done_reason
                            ? getNotDoneReasonLabel(order.not_done_reason)
                            : (order.audit_reason || 'Sem motivo'))}{" "}
                        - {order.external_id}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* General Summary */}
        <div className="pt-4 border-t border-slate-700">
          <p className="text-sm text-slate-400 mb-2 font-semibold">📊 RESUMO GERAL</p>
          
          {/* Total categories */}
          <div className="grid grid-cols-4 gap-1 mb-3">
            {(['regular', 'exterior', 'interior', 'fint'] as WorkCategory[]).map((cat) => {
              const config = categoryConfig[cat];
              return (
                <div
                  key={cat}
                  className="p-2 bg-slate-800/50 rounded text-center"
                >
                  <span className="text-sm">{config.emoji}</span>
                  <p className="font-bold text-sm">{totalCategories[cat]}</p>
                </div>
              );
            })}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-emerald-500/20 rounded-lg flex justify-between">
              <span className="text-emerald-400">✅ Válidas</span>
              <span className="font-bold text-emerald-400">{totalValid}</span>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg flex justify-between">
              <span className="text-blue-400">📆 Due Dates</span>
              <span className="font-bold text-blue-400">{totalDueDates}</span>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg flex justify-between">
              <span className="text-green-400">✔️ Aprovadas</span>
              <span className="font-bold text-green-400">{totalApproved}</span>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg flex justify-between">
              <span className="text-red-400">❌ Rejeitadas</span>
              <span className="font-bold text-red-400">{totalRejected}</span>
            </div>
          </div>
          <div className="mt-2 p-3 bg-slate-800/50 rounded-lg flex justify-between">
            <span className="text-slate-400">📊 Total do Período</span>
            <span className="font-bold text-xl">{totalOrders}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-700 text-center">
          <p className="text-xs text-slate-500">Gerado automaticamente</p>
        </div>
      </div>
    </div>
  );
}
