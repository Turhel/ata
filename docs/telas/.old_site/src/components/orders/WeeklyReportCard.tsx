import { useRef, useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks, addWeeks, isSameWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Copy, Download, CheckCircle2, Calendar, Users, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';
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

interface WeeklyReportCardProps {
  orders: Order[];
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
  scheduled: number;
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

export function WeeklyReportCard({ orders, assistantName }: WeeklyReportCardProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [inspectorFilter, setInspectorFilter] = useState<string>('all');

  // Calculate week range (Sunday to Saturday)
  const weekStartDate = startOfWeek(selectedWeek, { weekStartsOn: 0 }); // Sunday
  const weekEndDate = endOfWeek(selectedWeek, { weekStartsOn: 0 }); // Saturday
  const daysOfWeek = eachDayOfInterval({ start: weekStartDate, end: weekEndDate });

  const isCurrentWeek = isSameWeek(selectedWeek, new Date(), { weekStartsOn: 0 });

  const handlePreviousWeek = () => setSelectedWeek(subWeeks(selectedWeek, 1));
  const handleNextWeek = () => setSelectedWeek(addWeeks(selectedWeek, 1));

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

  const formattedWeekRange = `${format(weekStartDate, 'dd/MM')} - ${format(weekEndDate, 'dd/MM/yyyy')}`;

  // Filter orders for this week and by inspector
  const weekOrders = orders.filter(order => {
    const activityDate = getOrderActivityDate(order);
    if (!activityDate) return false;
    const orderDate = new Date(activityDate);
    const inWeek = orderDate >= weekStartDate && orderDate <= weekEndDate;
    const matchesInspector = inspectorFilter === 'all' || order.inspectors?.code === inspectorFilter;
    return inWeek && matchesInspector;
  });

  // Group orders by inspector
  const inspectorStatsMap = new Map<string, InspectorStats>();

  weekOrders.forEach(order => {
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
        scheduled: 0,
        notDone: [],
        total: 0,
        dailyStats: daysOfWeek.map(day => ({ day, count: 0 })),
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
    if (order.due_date && order.due_date_confirmed && activityDate && order.status === 'submitted') {
      const dueDate = new Date(order.due_date);
      const activityDateObj = new Date(activityDate);
      if (format(dueDate, 'yyyy-MM-dd') === format(activityDateObj, 'yyyy-MM-dd')) {
        stats.dueDates += 1;
      }
    }

    // Scheduled for future
    if (order.due_date && order.due_date_confirmed && order.status === 'scheduled') {
      stats.scheduled += 1;
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
  const totalScheduled = inspectorStats.reduce((sum, s) => sum + s.scheduled, 0);
  const totalOrders = weekOrders.length;

  const generateTextReport = () => {
    let report = `📅 *RELATÓRIO SEMANAL*\n`;
    report += `📆 ${formattedWeekRange}\n`;
    report += `👥 ${inspectorStats.length} inspetor(es)\n\n`;

    inspectorStats.forEach((inspector, idx) => {
      report += `${'='.repeat(23)}\n`;
      report += `👤 *${inspector.code}*\n`;
      
      report += '\n';

      // Daily breakdown for this inspector
      report += `📊 Por Dia:\n`;
      daysOfWeek.forEach((day, dayIdx) => {
        const dayName = format(day, 'EEE', { locale: ptBR }).toUpperCase();
        const count = inspector.dailyStats[dayIdx].count;
        report += `${dayName}: ${count} | `;
      });
      report = report.slice(0, -3) + '\n\n';
      
      // Categories - only show non-zero
      const categories: WorkCategory[] = ['regular', 'exterior', 'interior', 'fint'];
      categories.forEach(cat => {
        const count = inspector.categories[cat] || 0;
        if (count > 0) {
          const config = categoryConfig[cat];
          report += `${config.emoji} ${config.label}: ${count}\n`;
        }
      });
      
      report += `\n✅ Válidas: ${inspector.valid}\n`;
      report += `✔️ Aprovadas: ${inspector.approved}\n`;
      if (inspector.rejected > 0) {
        report += `❌ Rejeitadas: ${inspector.rejected}\n`;
      }
      if (inspector.dueDates > 0) {
        report += `📆 Due Dates: ${inspector.dueDates}\n`;
      }
      if (inspector.scheduled > 0) {
        report += `⏳ Agendadas: ${inspector.scheduled}\n`;
      }
      
      // Not done section with reasons
      if (inspector.notDone.length > 0) {
        report += `\n---\n`;
        report += `❌ *NÃO FEITAS (${inspector.notDone.length})*\n`;
        inspector.notDone.forEach(order => {
          const reason = order.followup_kind === 'pool_exception' && order.followup_reason
            ? getNotDoneReasonLabel(order.followup_reason)
            : order.not_done_reason
              ? getNotDoneReasonLabel(order.not_done_reason)
              : (order.audit_reason || 'Sem motivo');
          report += `• ${order.external_id} - ${order.work_type}\n  └ ${reason}\n`;
        });
      }
      report += '\n';
    });

    report += `${'='.repeat(23)}\n`;
    report += `*📊 RESUMO GERAL*\n`;
    report += `✅ Total Válidas: ${totalValid}\n`;
    report += `✔️ Total Aprovadas: ${totalApproved}\n`;
    if (totalRejected > 0) {
      report += `❌ Total Rejeitadas: ${totalRejected}\n`;
    }
    if (totalDueDates > 0) {
      report += `📆 Total Due Dates: ${totalDueDates}\n`;
    }
    if (totalScheduled > 0) {
      report += `⏳ Total Agendadas: ${totalScheduled}\n`;
    }
    report += `📊 Total da Semana: ${totalOrders}\n`;
    
    return report;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateTextReport());
      setIsCopied(true);
      toast.success('Relatório semanal copiado!');
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
      link.download = `relatorio-semanal-${format(weekStartDate, 'yyyy-MM-dd')}.png`;
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
      {/* Week navigation */}
      <div className="flex items-center justify-center gap-4 mb-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousWeek}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center min-w-[180px]">
          <p className="text-sm text-muted-foreground">Semana</p>
          <p className="font-semibold">{formattedWeekRange}</p>
          {isCurrentWeek && (
            <span className="text-xs text-primary">(Semana atual)</span>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextWeek}
          disabled={isCurrentWeek}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Inspector filter */}
      <div className="flex items-center justify-center gap-2">
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
      <div className="flex gap-2 justify-center">
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
              <p className="text-sm text-slate-400">Relatório Semanal</p>
              {assistantName && (
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {assistantName}
                </span>
              )}
            </div>
            <p className="text-lg font-bold">📅 {formattedWeekRange}</p>
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
          {inspectorStats.map((inspector, idx) => (
            <div key={inspector.code}>
              <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
                  <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-xs font-bold text-slate-300">
                    {getNameInitials(inspector.name)}
                  </div>
                  <span className="font-bold text-primary">{inspector.code}</span>
                  <span className="ml-auto text-slate-400 text-sm">({inspector.total} ordens)</span>
                </div>

                {/* Daily breakdown for inspector */}
                <div className="mb-3">
                  <div className="grid grid-cols-7 gap-1">
                    {daysOfWeek.map((day, dayIdx) => {
                      const count = inspector.dailyStats[dayIdx].count;
                      const hasOrders = count > 0;
                      return (
                        <div
                          key={dayIdx}
                          className={`p-1.5 rounded text-center ${hasOrders ? 'bg-primary/20' : 'bg-slate-800/50'}`}
                        >
                          <p className="text-[10px] text-slate-400">
                            {format(day, 'EEE', { locale: ptBR }).slice(0, 3)}
                          </p>
                          <p className={`text-sm font-bold ${hasOrders ? 'text-primary' : 'text-slate-500'}`}>
                            {count}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Categories for this inspector - only non-zero */}
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {(['regular', 'exterior', 'interior', 'fint'] as WorkCategory[]).map((cat) => {
                    const config = categoryConfig[cat];
                    const count = inspector.categories[cat] || 0;
                    if (count === 0) return null;
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
                  {inspector.dueDates > 0 && (
                    <div className="p-2 bg-blue-500/20 rounded flex justify-between">
                      <span className="text-blue-400">📆 Due Dates</span>
                      <span className="font-bold text-blue-400">{inspector.dueDates}</span>
                    </div>
                  )}
                  {inspector.scheduled > 0 && (
                    <div className="p-2 bg-amber-500/20 rounded flex justify-between">
                      <span className="text-amber-400">⏳ Agendadas</span>
                      <span className="font-bold text-amber-400">{inspector.scheduled}</span>
                    </div>
                  )}
                </div>

                {/* Not done for this inspector */}
                {inspector.notDone.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dashed border-slate-600">
                    <p className="text-xs text-red-400 font-semibold mb-2">
                      ❌ NÃO FEITAS ({inspector.notDone.length})
                    </p>
                    <div className="space-y-2 max-h-24 overflow-y-auto">
                      {inspector.notDone.map((order) => {
                        const reason = order.followup_kind === 'pool_exception' && order.followup_reason
                          ? getNotDoneReasonLabel(order.followup_reason)
                          : order.not_done_reason
                            ? getNotDoneReasonLabel(order.not_done_reason)
                            : (order.audit_reason || 'Sem motivo');
                        return (
                          <div
                            key={order.id}
                            className="text-[10px] p-2 bg-red-500/10 rounded border border-red-500/20"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-mono text-red-300">{order.external_id}</span>
                              <span className="text-red-400">{order.work_type}</span>
                            </div>
                            <div className="text-red-300/80">└ {reason}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Divider between inspectors */}
              {idx < inspectorStats.length - 1 && (
                <div className="my-3 flex items-center gap-2">
                  <div className="flex-1 border-t border-slate-600"></div>
                  <span className="text-slate-500 text-xs">•</span>
                  <div className="flex-1 border-t border-slate-600"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* General Summary */}
        <div className="pt-4 border-t-2 border-slate-600">
          <p className="text-sm text-slate-400 mb-2 font-semibold">📊 RESUMO GERAL</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-emerald-500/20 rounded-lg flex justify-between">
              <span className="text-emerald-400">✅ Válidas</span>
              <span className="font-bold text-emerald-400">{totalValid}</span>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg flex justify-between">
              <span className="text-green-400">✔️ Aprovadas</span>
              <span className="font-bold text-green-400">{totalApproved}</span>
            </div>
            {totalDueDates > 0 && (
              <div className="p-3 bg-blue-500/20 rounded-lg flex justify-between">
                <span className="text-blue-400">📆 Due Dates</span>
                <span className="font-bold text-blue-400">{totalDueDates}</span>
              </div>
            )}
            {totalScheduled > 0 && (
              <div className="p-3 bg-amber-500/20 rounded-lg flex justify-between">
                <span className="text-amber-400">⏳ Agendadas</span>
                <span className="font-bold text-amber-400">{totalScheduled}</span>
              </div>
            )}
            {totalRejected > 0 && (
              <div className="p-3 bg-red-500/20 rounded-lg flex justify-between">
                <span className="text-red-400">❌ Rejeitadas</span>
                <span className="font-bold text-red-400">{totalRejected}</span>
              </div>
            )}
          </div>
          <div className="mt-2 p-3 bg-slate-800/50 rounded-lg flex justify-between">
            <span className="text-slate-400">📊 Total da Semana</span>
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
