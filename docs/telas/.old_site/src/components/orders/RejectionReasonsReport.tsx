import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart3, TrendingUp, AlertTriangle, FileText } from 'lucide-react';
import { getReasonLabel } from '@/lib/rejection-reasons';

interface RejectionData {
  reason: string;
  orderId: string;
  externalId: string;
  assistantName: string;
  date: string;
}

interface RejectionReasonsReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectionData: RejectionData[];
}

interface ReasonStat {
  reason: string;
  label: string;
  count: number;
  percentage: number;
  orders: RejectionData[];
}

export function RejectionReasonsReport({
  open,
  onOpenChange,
  rejectionData,
}: RejectionReasonsReportProps) {
  const [expandedReason, setExpandedReason] = useState<string | null>(null);

  const stats = useMemo(() => {
    const reasonCounts = new Map<string, RejectionData[]>();

    for (const data of rejectionData) {
      if (!data.reason) continue;
      const existing = reasonCounts.get(data.reason) || [];
      existing.push(data);
      reasonCounts.set(data.reason, existing);
    }

    const total = rejectionData.filter(d => d.reason).length;
    const result: ReasonStat[] = [];

    for (const [reason, orders] of reasonCounts) {
      result.push({
        reason,
        label: getReasonLabel(reason, 'followup'),
        count: orders.length,
        percentage: total > 0 ? (orders.length / total) * 100 : 0,
        orders,
      });
    }

    // Sort by count descending
    return result.sort((a, b) => b.count - a.count);
  }, [rejectionData]);

  const totalRejections = rejectionData.filter(d => d.reason).length;
  const topReason = stats[0];
  const uniqueAssistants = new Set(rejectionData.map(d => d.assistantName)).size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Relatório de Motivos de Rejeição
          </DialogTitle>
          <DialogDescription>
            Análise dos motivos mais comuns de rejeição para identificar padrões e oportunidades de melhoria.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{totalRejections}</p>
                  <p className="text-xs text-muted-foreground">rejeições registradas</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-chart-3" />
                    <span className="text-sm text-muted-foreground">Principal</span>
                  </div>
                  <p className="text-lg font-bold mt-1 truncate" title={topReason?.label}>
                    {topReason?.label || 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {topReason ? `${topReason.percentage.toFixed(0)}% dos casos` : 'Sem dados'}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-chart-2" />
                    <span className="text-sm text-muted-foreground">Assistentes</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{uniqueAssistants}</p>
                  <p className="text-xs text-muted-foreground">com rejeições</p>
                </CardContent>
              </Card>
            </div>

            {/* Reasons Breakdown */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Distribuição por Motivo</h3>
              
              {stats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum motivo de rejeição registrado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.map((stat, index) => (
                    <div key={stat.reason} className="space-y-2">
                      <button
                        onClick={() => setExpandedReason(
                          expandedReason === stat.reason ? null : stat.reason
                        )}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`
                                ${index === 0 ? 'bg-chart-3/20 text-chart-3 border-chart-3/30' : ''}
                                ${index === 1 ? 'bg-chart-2/20 text-chart-2 border-chart-2/30' : ''}
                                ${index === 2 ? 'bg-chart-4/20 text-chart-4 border-chart-4/30' : ''}
                              `}
                            >
                              #{index + 1}
                            </Badge>
                            <span className="font-medium text-sm">{stat.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{stat.count}</span>
                            <span className="text-xs text-muted-foreground">
                              ({stat.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <Progress 
                          value={stat.percentage} 
                          className="h-2 mt-2" 
                        />
                      </button>
                      
                      {/* Expanded details */}
                      {expandedReason === stat.reason && (
                        <div className="ml-4 pl-4 border-l-2 border-border/50 space-y-2 mt-2">
                          <p className="text-xs text-muted-foreground mb-2">
                            Ordens afetadas:
                          </p>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {stat.orders.slice(0, 10).map((order) => (
                              <div 
                                key={order.orderId} 
                                className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1"
                              >
                                <span className="font-mono">{order.externalId}</span>
                                <span className="text-muted-foreground">{order.assistantName}</span>
                                <span className="text-muted-foreground">{order.date}</span>
                              </div>
                            ))}
                            {stat.orders.length > 10 && (
                              <p className="text-xs text-muted-foreground text-center py-1">
                                ... e mais {stat.orders.length - 10} ordem(ns)
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Insights */}
            {stats.length >= 3 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Insights</h3>
                <Card className="bg-chart-4/10 border-chart-4/30">
                  <CardContent className="p-4">
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Top 3 motivos</strong> representam{' '}
                        <strong>
                          {(stats.slice(0, 3).reduce((sum, s) => sum + s.percentage, 0)).toFixed(0)}%
                        </strong>{' '}
                        de todas as rejeições.
                      </p>
                      <p className="text-muted-foreground">
                        Focando em melhorias para esses motivos pode reduzir significativamente 
                        o número de ordens rejeitadas.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
