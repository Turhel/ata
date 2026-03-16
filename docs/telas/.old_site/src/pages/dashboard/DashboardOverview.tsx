import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfiles";
import { useOrders, useOrderStats, type Order } from "@/hooks/useOrders";
import { useSystemNotifications } from "@/hooks/useSystemNotifications";
import { usePendingOrders } from "@/hooks/usePendingOrders";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedSkeleton } from "@/components/ui/animated-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CalendarClock,
  RotateCcw,
  Check,
  X,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  format,
  parseISO,
  startOfDay,
  startOfWeek,
  endOfWeek,
  isSameWeek,
  isSameDay,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { DueDateCalendar } from "@/components/dashboard/DueDateCalendar";
import { AttentionRequiredSection } from "@/components/dashboard/AttentionRequiredSection";

export default function DashboardOverview() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { stats, isLoading: statsLoading } = useOrderStats();
  const safeStats = stats ?? {
    today: 0,
    approved: 0,
    pending: 0,
    inReview: 0,
    rejected: 0,
    total: 0,
  };
  // Always filter by current user's orders for the assistant dashboard
  const { orders, isLoading: ordersLoading, updateOrder, refetch } = useOrders({ assistantId: user?.id });
  const safeOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);
  const { sendSystemNotification, permission } = useSystemNotifications();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"duedate" | "redo">("duedate");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calendar state
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const today = startOfDay(new Date());

  const { dueDateOrders, returnedOrders, ordersDueToday, pendingCount } = usePendingOrders(!!user);

  // --- CÁLCULO MANUAL "EM ANÁLISE" ---
  // Conta ordens 'enviada' + 'em_analise' diretamente da lista carregada
  const manualInReviewCount = useMemo(() => {
    return safeOrders.filter((o) => o.status === "submitted").length;
  }, [safeOrders]);

  // --- LÓGICA DE MÉTRICAS SEMANAIS ---
  const weeklyMetrics = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });

    const thisWeekOrders = safeOrders.filter((order) => {
      if (!order.created_at) return false;
      const createdDate = parseISO(order.created_at);
      return isSameWeek(createdDate, now, { weekStartsOn: 0 });
    });

    const lastWeekOrders = safeOrders.filter((order) => {
      if (!order.created_at) return false;
      const createdDate = parseISO(order.created_at);
      return isSameWeek(createdDate, lastWeekStart, { weekStartsOn: 0 });
    });

    const thisWeekApproved = thisWeekOrders.filter((o) => o.status === "closed").length;
    const lastWeekCount = lastWeekOrders.length;
    const thisWeekCount = thisWeekOrders.length;

    const categoryBreakdown = {
      regular: thisWeekOrders.filter((o) => o.category === "regular").length,
      exterior: thisWeekOrders.filter((o) => o.category === "exterior").length,
      interior: thisWeekOrders.filter((o) => o.category === "interior").length,
      fint: thisWeekOrders.filter((o) => o.category === "fint").length,
    };

    const weekChange = lastWeekCount > 0 ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100) : 0;
    const daysInWeek = Math.min(7, Math.max(1, now.getDay() + 1));
    const dailyAverage = thisWeekCount / daysInWeek;
    return {
      thisWeekCount,
      thisWeekApproved,
      lastWeekCount,
      weekChange,
      dailyAverage,
      categoryBreakdown,
      weekLabel: `${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM")}`,
    };
  }, [safeOrders]);

  useEffect(() => {
    if (ordersDueToday.length > 0 && permission === "granted") {
      sendSystemNotification(
        `⏰ ${ordersDueToday.length} ordem${ordersDueToday.length > 1 ? "s" : ""} vence${
          ordersDueToday.length > 1 ? "m" : ""
        } hoje!`,
        {
          body: 'Verifique a seção "Atenção Necessária" na Visão Geral.',
          tag: "due-date-reminder",
        },
      );
    }
  }, [ordersDueToday.length, permission, sendSystemNotification]);

  const handleOpenConfirmDialog = (order: Order, type: "duedate" | "redo") => {
    setSelectedOrder(order);
    setDialogType(type);
    setConfirmDialogOpen(true);
  };

  const handleConfirm = async (confirmed: boolean) => {
    if (!selectedOrder) return;
    setIsSubmitting(true);
    try {
      if (confirmed) {
        await updateOrder(selectedOrder.id, {
          status: "submitted",
          audit_flag: false,
          audit_reason: null,
        });
        toast.success(dialogType === "duedate" ? "Ordem confirmada como realizada!" : "Ordem marcada como reenviada!");
      } else {
        await updateOrder(selectedOrder.id, {
          // "Não realizada" => volta para o pool (available), não é cancelamento.
          status: "available",
          audit_flag: false,
          audit_reason: null,
          // Limpa posse quando voltar pra available (server/api/orders/[id].ts suporta isso)
          auto_clear_possession: true,
        });
        toast.info("Ordem devolvida ao pool");
      }
      setConfirmDialogOpen(false);
      setSelectedOrder(null);
      refetch();
    } catch (error) {
      toast.error("Erro ao atualizar ordem");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- CARDS PRINCIPAIS COM CORES PADRONIZADAS ---
  const statCards = [
    {
      title: "Ordens Hoje",
      value: safeStats.today.toString(),
      description: "Inseridas hoje",
      icon: ClipboardList,
      color: "text-sky-700 dark:text-sky-400",
      bgColor: "bg-sky-100 dark:bg-sky-500/20",
      trendColor: "text-sky-600 dark:text-sky-400",
    },
    {
      title: "Aprovadas (Semana)",
      value: weeklyMetrics.thisWeekApproved.toString(),
      description: `${weeklyMetrics.thisWeekCount > 0 ? Math.round((weeklyMetrics.thisWeekApproved / weeklyMetrics.thisWeekCount) * 100) : 0}% taxa semanal`,
      icon: CheckCircle2,
      color: "text-emerald-700 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-500/20",
      trendColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Em Análise",
      // CORREÇÃO: Usa o contador manual que soma 'enviada' + 'em_analise'
      value: manualInReviewCount.toString(),
      description: "Aguardando validação",
      icon: Clock,
      color: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-500/20",
      trendColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Pendentes",
      value: pendingCount.toString(),
      description: "Requer atenção",
      icon: AlertTriangle,
      color: "text-rose-700 dark:text-rose-400",
      bgColor: "bg-rose-100 dark:bg-rose-500/20",
      trendColor: "text-rose-600 dark:text-rose-400",
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      closed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200/50",
      submitted: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400 border-sky-200/50",
      followup: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200/50",
      canceled: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200/50",
      available: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200/50",
      scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200/50",
    };
    const labels: Record<string, string> = {
      closed: "Fechada",
      submitted: "Enviada",
      followup: "Follow-up",
      canceled: "Cancelada",
      available: "Disponível",
      scheduled: "Agendada",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.available}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const emailPrefix = user?.email?.split("@")[0];
  const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  const profileName = profile?.full_name;
  const displayName =
    (profileName && profileName !== emailPrefix ? profileName : metadataName) || "Assistente";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Olá, {displayName}!</h1>
        <p className="text-muted-foreground">Aqui está o resumo das suas atividades de hoje.</p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent border-sky-200/50 dark:border-sky-800/40">
          <CardContent className="p-4">
            <Link to="/dashboard/orders/new" className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Inserir ordens</p>
                <p className="text-xs text-muted-foreground">Registrar novas atividades</p>
              </div>
              <div className="p-2 rounded-lg bg-sky-600 text-white">
                <ClipboardList className="h-4 w-4" />
              </div>
            </Link>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/60 hover:border-border transition-colors">
          <CardContent className="p-4">
            <Link to="/dashboard/orders" className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Minhas ordens</p>
                <p className="text-xs text-muted-foreground">Histórico e filtros</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-card/50 border-border/60 hover:border-border transition-colors">
                <CardContent className="p-4">
                  <Link to="/dashboard/orders?followups=1" className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">Follow-ups</p>
                      <p className="text-xs text-muted-foreground">Pendências de correção</p>
                    </div>
                    <div className="relative p-2 rounded-lg bg-orange-100 dark:bg-orange-500/20">
                      <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      {returnedOrders.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-[10px] justify-center bg-rose-600 text-white border-0"
                        >
                          {returnedOrders.length}
                        </Badge>
                      )}
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px] text-xs">
              <p>Ordens com pendência de correção registradas em follow-ups.</p>
              <Button variant="link" size="sm" asChild className="px-0 h-auto text-xs">
                <Link to="/dashboard/orders?followups=1">Ver pendências</Link>
              </Button>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid gap-4">
        {/* Due Date Calendar */}
        {!ordersLoading && (
          <DueDateCalendar
            orders={safeOrders}
            selectedDate={selectedCalendarDate}
            onSelectDate={setSelectedCalendarDate}
            currentMonth={calendarMonth}
            onMonthChange={setCalendarMonth}
          />
        )}
      </div>

      {/* Stats Grid - Com Cores Corrigidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className="bg-card/50 backdrop-blur-sm border-border/60 hover:border-border/80 transition-all"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <AnimatedSkeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className={`h-3 w-3 ${stat.trendColor}`} />
                    <p className={`text-xs ${stat.trendColor} font-medium`}>{stat.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attention Required Section */}
      <AttentionRequiredSection
        dueDateOrders={dueDateOrders}
        returnedOrders={returnedOrders}
        onConfirmOrder={handleOpenConfirmDialog}
      />

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogType === "duedate" ? (
                <>
                  <CalendarClock className="h-5 w-5 text-amber-500" />
                  Confirmar Ordem Due Date
                </>
              ) : (
                <>
                  <RotateCcw className="h-5 w-5 text-rose-500" />
                  Confirmar Refazer Ordem
                </>
              )}
            </DialogTitle>
            <DialogDescription>Ordem: {selectedOrder?.external_id}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dialogType === "duedate" ? (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Esta ordem tinha uma due date de <strong>{formatDate(selectedOrder?.due_date)}</strong>.
                </p>
                <p className="text-sm mt-2 text-amber-700 dark:text-amber-400">
                  Você realizou e enviou esta ordem no sistema da seguradora?
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Motivo do retorno</p>
                  <div className="mt-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive-foreground">
                    {selectedOrder?.audit_reason || "Nenhum motivo especificado."}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Você conseguiu refazer e reenviar esta ordem?
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-md">
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium text-foreground">{selectedOrder?.work_type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Categoria:</span>
                <p className="font-medium text-foreground">{selectedOrder?.category || "-"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Endereço:</span>
                <p className="font-medium text-foreground">
                  {[selectedOrder?.address1, selectedOrder?.address2].filter(Boolean).join(" ").trim() || "-"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => handleConfirm(false)} disabled={isSubmitting} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Não Realizei
            </Button>
            <Button
              onClick={() => handleConfirm(true)}
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Sim, Enviei
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
