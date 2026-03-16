import { useState, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Calendar, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DailyReportCard } from './DailyReportCard';
import type { Order as BaseOrder } from '@/hooks/useOrders';
import type { FollowupKind } from '@/hooks/useOrderFollowups';

type Order = BaseOrder & {
  inspectors?: { id: string; name: string; code: string } | null;
  followup_kind?: FollowupKind;
};

interface DayOrdersCardProps {
  date: Date;
  orders: Order[];
  reportOrders?: Order[];
  dateLabel?: string;
  dateBadge?: { label: string; variant?: "secondary" | "destructive" | "outline" };
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  assistantName?: string;
}

export function DayOrdersCard({
  date,
  orders,
  reportOrders,
  dateLabel,
  dateBadge,
  isOpen,
  onToggle,
  children,
  assistantName,
}: DayOrdersCardProps) {
  const reportOrdersResolved = reportOrders ?? orders;
  const stats = useMemo(() => {
    const needsAction = orders.filter(
      (o) => o.status === 'followup' || o.followup_kind === 'correction',
    ).length;
    const poolExceptions = orders.filter((o) => o.followup_kind === 'pool_exception').length;
    const sent = orders.filter((o) => o.status === 'submitted' || o.status === 'followup').length;
    const approved = orders.filter((o) => o.status === 'closed').length;
    const pending = orders.filter((o) => o.status === 'available' || o.status === 'scheduled').length;
    
    return { needsAction, poolExceptions, sent, approved, pending, total: orders.length };
  }, [orders]);


  const isToday = !dateLabel && isSameDay(date, new Date());
  const formattedDate = format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  const capitalizedDate = dateLabel || formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className={`bg-card/50 backdrop-blur-sm border-border/50 transition-all ${isOpen ? 'ring-2 ring-primary/20' : 'hover:bg-accent/5'}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isToday ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Calendar className={`h-5 w-5 ${isToday ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {capitalizedDate}
                    {isToday && (
                      <Badge variant="secondary" className="text-xs">Hoje</Badge>
                    )}
                    {dateBadge && (
                      <Badge variant={dateBadge.variant || "secondary"} className="text-xs">
                        {dateBadge.label}
                      </Badge>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.total} {stats.total === 1 ? 'ordem' : 'ordens'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Quick stats */}
                <div className="hidden sm:flex items-center gap-2">
                  {stats.needsAction > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {stats.needsAction} ação
                    </Badge>
                  )}
                  {stats.poolExceptions > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-600 hover:bg-amber-500/30">
                      {stats.poolExceptions} fora do pool
                    </Badge>
                  )}
                  {stats.approved > 0 && (
                    <Badge className="bg-chart-4/20 text-chart-4 hover:bg-chart-4/30">
                      {stats.approved} aprovadas
                    </Badge>
                  )}
                  {stats.sent > 0 && (
                    <Badge className="bg-chart-2/20 text-chart-2 hover:bg-chart-2/30">
                      {stats.sent} enviadas
                    </Badge>
                  )}
                  {stats.pending > 0 && (
                    <Badge variant="secondary">
                      {stats.pending} pendentes
                    </Badge>
                  )}
                </div>

                {/* Report button */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1.5 hidden sm:flex"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileText className="h-4 w-4" />
                      Relatório
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Relatório do Dia</DialogTitle>
                    </DialogHeader>
                    <DailyReportCard
                      date={date}
                      orders={reportOrdersResolved}
                      assistantName={assistantName}
                    />
                  </DialogContent>
                </Dialog>

                <Button variant="ghost" size="icon" className="shrink-0">
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
