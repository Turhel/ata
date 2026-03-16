import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  formatInAppTimezone,
  getDateKeyInAppTimezone,
  getDueDateKey,
  getTodayInAppTimezone,
  msUntilNextDayInAppTimezone,
  startOfDayInAppTimezone,
} from "@/lib/timezone";
import {
  format,
  parseISO,
  isSameDay,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  isToday,
  isPast,
  addDays,
  isBefore,
  isAfter,
  differenceInCalendarDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, CheckCircle2, AlertTriangle, ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { Order } from "@/hooks/useOrders";

interface DueDateCalendarProps {
  orders: Order[];
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

interface DayData {
  hasDueDate: boolean;
  hasDueToday: boolean;
  hasExecution: boolean;
  isPastDue: boolean;
  isCompleted: boolean;
  dueDateCount: number;
  executionCount: number;
  totalCount: number;
}

type ViewMode = "calendar" | "upcoming";

export function DueDateCalendar({
  orders,
  selectedDate,
  onSelectDate,
  currentMonth,
  onMonthChange,
}: DueDateCalendarProps) {
  const safeOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);
  const [todayKey, setTodayKey] = useState(() => getTodayInAppTimezone());
  const now = useMemo(() => new Date(`${todayKey}T12:00:00.000Z`), [todayKey]);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const handleTodayClick = () => {
    const now = new Date();
    onSelectDate(now);
    onMonthChange(now);
  };

  useEffect(() => {
    let timer: number | null = null;
    const schedule = () => {
      const ms = msUntilNextDayInAppTimezone(new Date());
      timer = window.setTimeout(() => {
        setTodayKey(getTodayInAppTimezone());
        schedule();
      }, Math.max(1000, ms + 50));
    };
    schedule();
    return () => {
      if (timer != null) window.clearTimeout(timer);
    };
  }, []);

  // Create a map of dates with orders
  const ordersByDate = useMemo(() => {
    const map = new Map<string, DayData>();

    safeOrders.forEach((order) => {
      const isDueDateConfirmed = order.due_date_confirmed == null ? true : !!order.due_date_confirmed;
      // 1. Due Date (Laranja)
      if (order.due_date && isDueDateConfirmed) {
        const dateKey = getDueDateKey(order.due_date);
        const existing = map.get(dateKey) || createEmptyDayData();

        const isFinished = ["submitted", "followup", "closed", "canceled"].includes(order.status || "");

        // Para o calendário de prazos, só faz sentido marcar "due" quando ainda está pendente.
        // Quando finaliza, a data relevante vira `execution_date`.
        if (!isFinished) {
          existing.hasDueDate = true;
          existing.dueDateCount++;

          if (dateKey < todayKey) existing.isPastDue = true;
          if (dateKey === todayKey) existing.hasDueToday = true;
        }

        existing.totalCount = existing.dueDateCount + existing.executionCount;
        map.set(dateKey, existing);
      }

      // 3. Execution Date (Verde)
      if (order.execution_date) {
        const dateKey = getDateKeyInAppTimezone(order.execution_date);
        const existing = map.get(dateKey) || createEmptyDayData();
        existing.hasExecution = true;
        existing.executionCount++;
        existing.totalCount = existing.dueDateCount + existing.executionCount;
        map.set(dateKey, existing);
      }
    });

    return map;
  }, [safeOrders, todayKey]);

  function createEmptyDayData(): DayData {
    return {
      hasDueDate: false,
      hasDueToday: false,
      hasExecution: false,
      isPastDue: false,
      isCompleted: false,
      dueDateCount: 0,
      executionCount: 0,
      totalCount: 0,
    };
  }

  // Monthly stats
  const monthlyStats = useMemo(() => {
    let dueDateCount = 0;
    let executionCount = 0;
    let overdueCount = 0;

    ordersByDate.forEach((data, dateStr) => {
      const date = parseISO(dateStr);
      if (isSameMonth(date, currentMonth)) {
        dueDateCount += data.dueDateCount;
        executionCount += data.executionCount;
        if (data.isPastDue) overdueCount += data.dueDateCount;
      }
    });

    return { dueDateCount, executionCount, overdueCount };
  }, [ordersByDate, currentMonth]);

  // Get orders for selected date
  const selectedDateOrders = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = getDateKeyInAppTimezone(selectedDate);

    return safeOrders.filter(
      (order) =>
        (order.execution_date && getDateKeyInAppTimezone(order.execution_date) === dateStr) ||
        ((order.due_date_confirmed == null ? true : !!order.due_date_confirmed) &&
          order.due_date &&
          getDueDateKey(order.due_date) === dateStr),
    );
  }, [safeOrders, selectedDate]);

  // Upcoming due dates (next 14 days)
  const upcomingDueDates = useMemo(() => {
    const today = startOfDayInAppTimezone(now);
    const futureDate = addDays(today, 14);
    const todayKey = getDateKeyInAppTimezone(today);
    const futureKey = getDateKeyInAppTimezone(futureDate);

    return safeOrders
      .filter((order) => {
        const isDueDateConfirmed = order.due_date_confirmed == null ? true : !!order.due_date_confirmed;
        if (!order.due_date || !isDueDateConfirmed) return false;
        if (["submitted", "followup", "closed", "canceled"].includes(order.status || "")) return false;
        const dueKey = getDueDateKey(order.due_date);
        return dueKey >= todayKey && dueKey <= futureKey;
      })
      .sort((a, b) => getDueDateKey(a.due_date!).localeCompare(getDueDateKey(b.due_date!)))
      .slice(0, 10);
  }, [safeOrders, now]);

  // Overdue orders
  const overdueOrders = useMemo(() => {
    const today = startOfDayInAppTimezone(new Date());
    return safeOrders
      .filter((order) => {
        const isDueDateConfirmed = order.due_date_confirmed == null ? true : !!order.due_date_confirmed;
        if (!isDueDateConfirmed) return false;
        if (
          !order.due_date ||
          ["submitted", "followup", "closed", "canceled"].includes(order.status || "")
        )
          return false;
        const dueKey = getDueDateKey(order.due_date);
        return dueKey < todayKey;
      })
      .sort(
        (a, b) => getDueDateKey(a.due_date!).localeCompare(getDueDateKey(b.due_date!)),
      );
  }, [safeOrders, todayKey]);

  const getStatusBadge = (status: string) => {
    // Usando cores com opacidade para funcionar bem no Dark Mode
    const styles: Record<string, string> = {
      closed: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20",
      submitted: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
      followup: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
      canceled: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
      available: "bg-muted text-muted-foreground border-border",
      scheduled: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20",
    };
    const labels: Record<string, string> = {
      closed: "Fechada",
      submitted: "Enviada",
      followup: "Follow-up",
      canceled: "Cancelada",
      available: "Disponível",
      scheduled: "Agendada",
      aprovada: "Aprovada",
      enviada: "Enviada",
      em_analise: "Em Análise",
      rejeitada: "Rejeitada",
      pendente: "Pendente",
      agendada: "Agendada",
      nao_realizada: "Não Realizada",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.available}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getDaysUntil = (dateStr: string) => {
    const dueKey = getDueDateKey(dateStr);
    const days = differenceInCalendarDays(parseISO(dueKey), parseISO(todayKey));

    if (days === 0) return "Hoje";
    if (days === 1) return "Amanhã";
    if (days < 0) return `${Math.abs(days)} dias atrasado`;
    return `Em ${days} dias`;
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Calendário de Ordens
            </CardTitle>
            <CardDescription>{format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-auto">
              <TabsList className="h-8 bg-muted">
                <TabsTrigger value="calendar" className="text-xs px-3 h-7 data-[state=active]:bg-background">
                  Calendário
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="text-xs px-3 h-7 data-[state=active]:bg-background">
                  Próximas
                  {upcomingDueDates.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1.5 h-4 w-4 p-0 text-[10px] justify-center bg-orange-500/15 text-orange-600 dark:text-orange-400"
                    >
                      {upcomingDueDates.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={handleTodayClick}>
              Hoje
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monthly Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-xs text-muted-foreground">Prazo (Due)</p>
              <p className="font-semibold text-sm text-orange-700 dark:text-orange-400">{monthlyStats.dueDateCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">Executadas</p>
              <p className="font-semibold text-sm text-green-700 dark:text-green-400">{monthlyStats.executionCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-xs text-muted-foreground">Vencidas</p>
              <p className="font-semibold text-sm text-red-700 dark:text-red-400">{monthlyStats.overdueCount}</p>
            </div>
          </div>
        </div>

        {viewMode === "calendar" ? (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Calendar */}
            <div className="flex-shrink-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onSelectDate}
                month={currentMonth}
                onMonthChange={onMonthChange}
                locale={ptBR}
                // CORREÇÃO DO BUG VISUAL: Removendo estilos conflitantes e usando variáveis CSS
                classNames={{
                  day_selected:
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground font-bold",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                  head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                }}
                className={cn("p-3 pointer-events-auto rounded-lg border border-border/50 bg-card")}
                components={{
                  DayContent: ({ date }) => {
                    const dateStr = getDateKeyInAppTimezone(date);
                    const data = ordersByDate.get(dateStr);

                    return (
                      <div className="relative w-full h-full flex items-center justify-center p-1">
                        <span>{date.getDate()}</span>

                        {/* Indicadores (Bolinhas) */}
                        {data && data.totalCount > 0 && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {/* Vencida (Vermelho piscante) */}
                            {data.isPastDue && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                            {/* Prazo Final (Laranja piscante) */}
                            {data.hasDueToday && !data.isPastDue && (
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                            )}
                            {/* Due Date Futuro (Laranja) */}
                            {data.hasDueDate && !data.isPastDue && !data.hasDueToday && (
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            )}
                            {/* Executada (Verde) */}
                            {data.hasExecution && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                          </div>
                        )}
                      </div>
                    );
                  },
                }}
              />

              {/* Legenda */}
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-2.5">Legenda</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center w-2.5 h-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    </div>
                    <span className="text-xs text-muted-foreground">Vencida</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Prazo Final</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">Executada</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected date orders */}
            <div className="flex-1 min-w-0">
              {selectedDate ? (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2 text-foreground">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </h4>
                  {selectedDateOrders.length > 0 ? (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                      {selectedDateOrders.map((order) => (
                        <div
                          key={order.id}
                          className="p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm text-foreground">{order.external_id}</p>
                                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                                  {order.work_type}
                                </Badge>
                              </div>
                              {(order.address1 || order.address2) && (
                                <p className="text-xs text-muted-foreground mt-1 truncate flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {[order.address1, order.address2].filter(Boolean).join(" ").trim()}
                                </p>
                              )}

                              {/* Tags de Data na Ordem */}
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {order.due_date && getDueDateKey(order.due_date) === format(selectedDate, "yyyy-MM-dd") && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] h-5 bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/25"
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    Prazo
                                  </Badge>
                                )}
                                {order.execution_date &&
                                  getDateKeyInAppTimezone(order.execution_date) === format(selectedDate, "yyyy-MM-dd") && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] h-5 bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/25"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Feita
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {getStatusBadge(order.status || "available")}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <CalendarDays className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm">Nada agendado para hoje</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                  <CalendarDays className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Clique em um dia para ver detalhes</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Upcoming View */
          <div className="space-y-4">
            {/* Overdue Alert */}
            {overdueOrders.length > 0 && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <h4 className="font-medium text-sm flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Atenção: {overdueOrders.length} Ordens Vencidas
                </h4>
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {overdueOrders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-2 rounded bg-card border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{order.external_id}</p>
                        <Badge
                          variant="outline"
                          className="text-xs border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5"
                        >
                          {order.work_type}
                        </Badge>
                      </div>
                      <span className="text-xs text-red-600 dark:text-red-400 font-bold">
                        {getDaysUntil(order.due_date!)}
                      </span>
                    </div>
                  ))}
                </div>
                {overdueOrders.length > 5 && (
                  <Button variant="link" asChild className="p-0 h-auto mt-2 text-red-600 dark:text-red-400">
                    <Link to="/dashboard/orders?status=scheduled">
                      Ver todas ({overdueOrders.length})
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {/* Upcoming Due Dates */}
            <div>
              <h4 className="font-medium text-sm flex items-center gap-2 mb-3 text-muted-foreground">
                <Clock className="h-4 w-4 text-orange-500" />
                Próximos Vencimentos (14 dias)
              </h4>
              {upcomingDueDates.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {upcomingDueDates.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-orange-500/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-foreground">{order.external_id}</p>
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {order.work_type}
                          </Badge>
                        </div>
                        {(order.address1 || order.address2) && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {[order.address1, order.address2].filter(Boolean).join(" ").trim()}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                          {getDaysUntil(order.due_date!)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(parseISO(getDueDateKey(order.due_date!)), "dd/MM", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Tudo em dia! Sem vencimentos próximos.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
