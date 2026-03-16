import { useEffect, useState, useMemo, useCallback } from "react";
import { useOrders } from "@/hooks/useOrders";
import { useOrderFollowups, type FollowupKind } from "@/hooks/useOrderFollowups";
import { useInspectors } from "@/hooks/useInspectors";
import { useWorkTypes } from "@/hooks/useWorkTypes";
import { useProfile } from "@/hooks/useProfiles";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedSkeleton } from "@/components/ui/animated-skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  Check,
  X,
  Calendar,
  CalendarRange,
  Clock,
  ListFilter,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameWeek,
  differenceInCalendarDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getDueDateKey, getDateKeyInAppTimezone } from "@/lib/timezone";
import { clearCacheByPrefix } from "@/lib/cache";
import type { Database } from "@/integrations/supabase/types";
import { OrderHistoryDialog } from "@/components/orders/OrderHistoryDialog";
import { DayOrdersCard } from "@/components/orders/DayOrdersCard";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { WeeklyReportCard } from "@/components/orders/WeeklyReportCard";
import { PeriodReportCard } from "@/components/orders/PeriodReportCard";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  inspectors?: { id: string; name: string; code: string } | null;
  due_date_confirmed?: boolean | null;
};

type OrderWithFollowup = Order & {
  followup_kind?: FollowupKind;
  followup_reason?: string | null;
  followup_created_at?: string | null;
};

interface GroupedOrders {
  date: Date;
  dateKey: string;
  orders: OrderWithFollowup[];
}

export default function OrdersList() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithFollowup | null>(null);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [redoDialogOpen, setRedoDialogOpen] = useState(false);
  const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [weeklyReportOpen, setWeeklyReportOpen] = useState(false);
  const [periodReportOpen, setPeriodReportOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);
  const [dayPage, setDayPage] = useState<Record<string, number>>({});
  const followupsOnly = searchParams.get("followups") === "1";
  const poolExceptionsOnly = searchParams.get("pool") === "1";
  const statusFromUrl = searchParams.get("status");
  const initialFollowupFilter = followupsOnly
    ? "correction"
    : poolExceptionsOnly
      ? "pool_exception"
      : "all";
  const [followupFilter, setFollowupFilter] = useState<"all" | "correction" | "pool_exception">(
    initialFollowupFilter,
  );

  useEffect(() => {
    if (!statusFromUrl) return;
    const allowed = new Set(["available", "scheduled", "submitted", "followup", "canceled", "closed", "all"]);
    if (!allowed.has(statusFromUrl)) return;
    setStatusFilter(statusFromUrl);
  }, [statusFromUrl]);

  // Period filter state
  const now = new Date();
  const defaultStartDate = startOfWeek(now, { weekStartsOn: 0 });
  const defaultEndDate = endOfWeek(now, { weekStartsOn: 0 });
  const [periodStartDate, setPeriodStartDate] = useState<Date>(defaultStartDate);
  const [periodEndDate, setPeriodEndDate] = useState<Date>(defaultEndDate);
  const [groupByDate, setGroupByDate] = useState<"created_at" | "due_date">("created_at");
  const [dueDateWindow, setDueDateWindow] = useState<"all" | "3" | "5" | "7">("all");

  const itemsPerPage = 6;

  const {
    orders,
    isLoading,
    updateOrder,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch: refetchOrders,
  } = useOrders({
    assistantId: user?.id,
    status: statusFilter === "all" ? undefined : statusFilter,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    limit: 6,
  });
  const { followups, refetch: refetchFollowups } = useOrderFollowups({
    status: ["open", "in_review"],
  });
  const { inspectors } = useInspectors();
  const { workTypes } = useWorkTypes();
  const { profile } = useProfile();
  
  const assistantName = profile?.full_name || undefined;
  const applyQuickFilter = (type: "today" | "week" | "pending") => {
    const today = new Date();
    switch (type) {
      case "today":
        setDateFilter(today);
        setStatusFilter("all");
        setFollowupFilter("all");
        setDueDateWindow("all");
        break;
      case "week":
        setDateFilter(undefined);
        setStatusFilter("all");
        toast.info("Mostrando todas as ordens. Use o Relatório Semanal para ver o resumo.");
        setFollowupFilter("all");
        setDueDateWindow("all");
        break;
      case "pending":
        setStatusFilter("available");
        setDateFilter(undefined);
        setFollowupFilter("all");
        setDueDateWindow("all");
        break;
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDateFilter(undefined);
    setStatusFilter("all");
    setCategoryFilter("all");
    setFollowupFilter("all");
    setDueDateWindow("all");
  };

  const handleViewReason = (order: OrderWithFollowup) => {
    setSelectedOrder(order);
    setReasonDialogOpen(true);
  };

  const handleRedoAction = (order: OrderWithFollowup) => {
    setSelectedOrder(order);
    setRedoDialogOpen(true);
  };

  const handleViewHistory = (order: OrderWithFollowup) => {
    setSelectedOrder(order);
    setHistoryDialogOpen(true);
  };

  const handleOpenDueDateDialog = (order: OrderWithFollowup) => {
    setSelectedOrder(order);
    setDueDateDialogOpen(true);
  };

  const handleConfirmRedo = async (canRedo: boolean) => {
    if (!selectedOrder) return;

    setIsSubmitting(true);
    try {
      if (canRedo) {
        await updateOrder(selectedOrder.id, { status: "submitted", audit_flag: false, audit_reason: null });
        toast.success("Ordem marcada como reenviada");
      } else {
        await updateOrder(selectedOrder.id, {
          status: "available",
          audit_flag: false,
          audit_reason: null,
          auto_clear_possession: true,
        });
        toast.info("Ordem devolvida ao pool");
      }
      setRedoDialogOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      toast.error("Erro ao atualizar ordem");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDueDate = async (confirmed: boolean) => {
    if (!selectedOrder) return;

    setIsSubmitting(true);
    try {
      if (confirmed) {
        await updateOrder(selectedOrder.id, { status: "submitted", audit_flag: false, audit_reason: null });
        toast.success("Ordem agendada confirmada como realizada!");
      } else {
        await updateOrder(selectedOrder.id, {
          status: "available",
          audit_flag: false,
          audit_reason: null,
          auto_clear_possession: true,
        });
        toast.info("Ordem devolvida ao pool");
      }
      setDueDateDialogOpen(false);
      setSelectedOrder(null);
      await Promise.allSettled([refetchOrders(), refetchFollowups()]);
    } catch {
      toast.error("Erro ao atualizar ordem");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshData = useCallback(async () => {
    clearCacheByPrefix("orders:");
    clearCacheByPrefix("followups:");
    setOpenDayKey(null);
    setDayPage({});
    await Promise.allSettled([refetchOrders(), refetchFollowups()]);
    toast.success("Dados atualizados");
  }, [refetchOrders, refetchFollowups]);

  const getOrderAddress = (order: Order) => {
    return [order.address1, order.address2].filter(Boolean).join(" ").trim();
  };

  const followupByOrderId = useMemo(() => {
    return new Map(followups.map((followup) => [followup.order_id, followup]));
  }, [followups]);

  const ordersWithFollowups = useMemo(() => {
    return orders.map((order) => {
      const followup = followupByOrderId.get(order.id);
      if (!followup) return order;
      return {
        ...order,
        followup_kind: followup.kind,
        followup_reason: followup.reason,
        followup_created_at: followup.created_at,
      };
    });
  }, [orders, followupByOrderId]);

  const inspectorsById = useMemo(() => {
    return new Map(inspectors.map((inspector) => [inspector.id, inspector]));
  }, [inspectors]);

  const inspectorsByCode = useMemo(() => {
    return new Map(
      inspectors
        .map((inspector) => [String(inspector.code || "").toUpperCase(), inspector] as const)
        .filter(([code]) => !!code),
    );
  }, [inspectors]);

  const categoryByWorkType = useMemo(() => {
    return new Map(
      (workTypes || [])
        .map((wt) => [String(wt.code || "").toUpperCase(), wt.category] as const)
        .filter(([code]) => !!code),
    );
  }, [workTypes]);

  const ordersResolved = useMemo(() => {
    return (ordersWithFollowups as OrderWithFollowup[]).map((order) => {
      const inspector =
        (order.inspector_id && inspectorsById.get(order.inspector_id)) ||
        (order.inspector_code && inspectorsByCode.get(String(order.inspector_code).toUpperCase())) ||
        null;

      const resolvedCategory =
        order.category ||
        (order.work_type ? categoryByWorkType.get(String(order.work_type).toUpperCase()) || null : null);

      return {
        ...order,
        category: resolvedCategory,
        inspectors: inspector ? { id: inspector.id, name: inspector.name, code: inspector.code } : null,
      };
    });
  }, [ordersWithFollowups, inspectorsById, inspectorsByCode, categoryByWorkType]);

  const getOrderActivityDate = useCallback((order: OrderWithFollowup): string | null => {
    return order.execution_date || order.followup_created_at || order.updated_at || order.created_at || null;
  }, []);

  // Filter orders by search and date (base, without due date window)
  const baseFilteredOrders = useMemo(() => {
    if (!ordersResolved) return [];

    return (ordersResolved as OrderWithFollowup[]).filter((order) => {
      const followupKind = order.followup_kind;
      if (followupFilter !== "all" && followupKind !== followupFilter) return false;
      if (categoryFilter !== "all" && order.category !== categoryFilter) return false;
      // Text search: WOrder, address, city, inspector name/code
      const searchLower = search.toLowerCase();
      const address = getOrderAddress(order);
      const matchesSearch =
        !search ||
        order.external_id.toLowerCase().includes(searchLower) ||
        (address ? address.toLowerCase().includes(searchLower) : false) ||
        false ||
        order.city?.toLowerCase().includes(searchLower) ||
        false ||
        order.inspectors?.name?.toLowerCase().includes(searchLower) ||
        false ||
        order.inspectors?.code?.toLowerCase().includes(searchLower) ||
        false ||
        order.work_type?.toLowerCase().includes(searchLower) ||
        false;

      // Date filter
      let matchesDate = true;
      if (dateFilter) {
        const filterDateStr = format(dateFilter, "yyyy-MM-dd");
        // Check created, due, or execution
        const datesToCheck = [
          order.created_at,
          order.updated_at,
          order.due_date,
          order.execution_date,
          order.followup_created_at,
        ].filter(Boolean) as string[];

        matchesDate = datesToCheck.some((d) => d.startsWith(filterDateStr));
      }

      return matchesSearch && matchesDate;
    });
  }, [ordersResolved, search, dateFilter, followupFilter, categoryFilter]);

  const filteredOrders = useMemo(() => {
    if (dueDateWindow === "all") return baseFilteredOrders;
    const todayKey = getDateKeyInAppTimezone(new Date());
    const windowDays = Number(dueDateWindow);
    return (baseFilteredOrders as OrderWithFollowup[]).filter((order) => {
      const isDueDateConfirmed = order.due_date_confirmed == null ? true : !!order.due_date_confirmed;
      if (!order.due_date || !isDueDateConfirmed) return false;
      const dueKey = getDueDateKey(order.due_date);
      const diff = differenceInCalendarDays(parseISO(dueKey), parseISO(todayKey));
      return diff >= 0 && diff <= windowDays - 1;
    });
  }, [baseFilteredOrders, dueDateWindow]);

  const followupCounts = useMemo(() => {
    const counts = { correction: 0, pool_exception: 0 };
    (ordersResolved as OrderWithFollowup[]).forEach((order) => {
      if (order.followup_kind === "correction") counts.correction += 1;
      if (order.followup_kind === "pool_exception") counts.pool_exception += 1;
    });
    return counts;
  }, [ordersResolved]);

  const dueDateWindowCounts = useMemo(() => {
    const todayKey = getDateKeyInAppTimezone(new Date());
    const counts = { "3": 0, "5": 0, "7": 0 };
    (baseFilteredOrders as OrderWithFollowup[]).forEach((order) => {
      const isDueDateConfirmed = order.due_date_confirmed == null ? true : !!order.due_date_confirmed;
      if (!order.due_date || !isDueDateConfirmed) return;
      const dueKey = getDueDateKey(order.due_date);
      const diff = differenceInCalendarDays(parseISO(dueKey), parseISO(todayKey));
      if (diff < 0) return;
      if (diff <= 2) counts["3"] += 1;
      if (diff <= 4) counts["5"] += 1;
      if (diff <= 6) counts["7"] += 1;
    });
    return counts;
  }, [baseFilteredOrders]);

  // Group orders by day (using app timezone)
  const groupedOrders = useMemo((): GroupedOrders[] => {
    const groups: Record<string, OrderWithFollowup[]> = {};
    const useDueDate = groupByDate === "due_date";
    const toMs = (value: string | null | undefined) => {
      if (!value) return 0;
      const ms = Date.parse(value);
      return Number.isFinite(ms) ? ms : 0;
    };

    filteredOrders.forEach((order) => {
      const isDueDateConfirmed = order.due_date_confirmed == null ? true : !!order.due_date_confirmed;
      const dateValue = useDueDate ? (isDueDateConfirmed ? order.due_date : null) : getOrderActivityDate(order);
      const dateKey = dateValue ? (useDueDate ? getDueDateKey(dateValue) : getDateKeyInAppTimezone(dateValue)) : "no_due_date";

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(order);
    });

    const sorted = Object.entries(groups)
      .map(([dateKey, orders]) => ({
        dateKey,
        date: dateKey === "no_due_date" ? new Date(0) : parseISO(dateKey),
        orders: orders.sort((a, b) =>
          useDueDate
            ? toMs(b.created_at) - toMs(a.created_at)
            : toMs(getOrderActivityDate(b)) - toMs(getOrderActivityDate(a))
        ),
      }))
      .sort((a, b) => {
        if (a.dateKey === "no_due_date") return 1;
        if (b.dateKey === "no_due_date") return -1;
        return useDueDate ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime();
      });

    return sorted;
  }, [filteredOrders, groupByDate, getOrderActivityDate]);

  // Anti-egress/UX: não abrir automaticamente o primeiro dia.
  // O usuário escolhe qual grupo expandir.
  const effectiveOpenKey = openDayKey;

  const handleToggleDay = (dateKey: string) => {
    setOpenDayKey((prev) => (prev === dateKey ? null : dateKey));
  };

  const getPageForDay = (dateKey: string) => dayPage[dateKey] || 1;

  const setPageForDay = (dateKey: string, page: number) => {
    setDayPage((prev) => ({ ...prev, [dateKey]: page }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Ordens</h1>
          <p className="text-muted-foreground">Gerencie e acompanhe suas ordens de serviço</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setWeeklyReportOpen(true)} className="gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Relatório Semanal</span>
          </Button>
          <Button variant="outline" onClick={() => setPeriodReportOpen(true)} className="gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Período Customizado</span>
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            <Link to="/dashboard/orders/new">Inserir Ordens</Link>
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            {/* Top Row: Search and Date */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por WOrder, endereço, cidade, inspetor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                <Button
                  variant={dateFilter && isToday(dateFilter) ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyQuickFilter("today")}
                  className="whitespace-nowrap"
                >
                  Hoje
                </Button>
                <Button
                  variant={statusFilter === "available" ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyQuickFilter("pending")}
                  className="whitespace-nowrap"
                >
                  Pendentes
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[40px] px-0 lg:w-auto lg:px-4 justify-center lg:justify-start text-left font-normal",
                        !dateFilter && "text-muted-foreground",
                      )}
                      title="Selecionar data específica"
                    >
                      <Calendar className="h-4 w-4 lg:mr-2" />
                      <span className="hidden lg:inline">
                        {dateFilter ? format(dateFilter, "dd/MM/yyyy", { locale: ptBR }) : "Data"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    {/* CALENDÁRIO CORRIGIDO */}
                    <CalendarComponent
                      mode="single"
                      selected={dateFilter}
                      onSelect={setDateFilter}
                      initialFocus
                      classNames={{
                        day_selected:
                          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        day_today: "bg-accent text-accent-foreground font-bold",
                        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                      }}
                      className="p-3 pointer-events-auto bg-card border-none shadow-none"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Bottom Row: Detailed Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground mr-1" />

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="submitted">Enviada</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                  <SelectItem value="closed">Fechada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
                  <SelectItem value="interior">Interior</SelectItem>
                  <SelectItem value="fint">FINT</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={groupByDate}
                onValueChange={(value) => {
                  const next = value as "created_at" | "due_date";
                  setGroupByDate(next);
                  if (next === "created_at") {
                    setDueDateWindow("all");
                  }
                }}
              >
                <SelectTrigger className="w-[170px] h-8 text-xs">
                  <SelectValue placeholder="Agrupar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Data de atividade</SelectItem>
                  <SelectItem value="due_date">Due date</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={dueDateWindow}
                onValueChange={(value) => {
                  const next = value as "all" | "3" | "5" | "7";
                  setDueDateWindow(next);
                  if (next !== "all") {
                    setGroupByDate("due_date");
                    setDateFilter(undefined);
                    setStatusFilter("all");
                    setFollowupFilter("all");
                  }
                }}
              >
                <SelectTrigger className="w-[170px] h-8 text-xs">
                  <SelectValue placeholder="Due Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Due Date: Tudo</SelectItem>
                  <SelectItem value="3">
                    Próximos 3 dias
                    {dueDateWindowCounts["3"] > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                        {dueDateWindowCounts["3"]}
                      </Badge>
                    )}
                  </SelectItem>
                  <SelectItem value="5">
                    Próximos 5 dias
                    {dueDateWindowCounts["5"] > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                        {dueDateWindowCounts["5"]}
                      </Badge>
                    )}
                  </SelectItem>
                  <SelectItem value="7">
                    Próximos 7 dias
                    {dueDateWindowCounts["7"] > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                        {dueDateWindowCounts["7"]}
                      </Badge>
                    )}
                  </SelectItem>
                </SelectContent>
              </Select>

              {(groupByDate === "due_date" || dueDateWindow !== "all") && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setDueDateWindow("all");
                          setGroupByDate("created_at");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setDueDateWindow("all");
                            setGroupByDate("created_at");
                          }
                        }}
                        variant="outline"
                        className="h-8 px-2 text-xs cursor-pointer hover:bg-accent"
                      >
                        {`Due Date ${
                          dueDateWindow === "all" ? "ativo" : `${dueDateWindow} dias`
                        } ✕`}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Remover filtro de due date</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <Button
                variant={followupFilter === "correction" ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setFollowupFilter((prev) => (prev === "correction" ? "all" : "correction"))
                }
                className="whitespace-nowrap"
              >
                Pendência de correção
                {followupCounts.correction > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                    {followupCounts.correction}
                  </Badge>
                )}
              </Button>

              <Button
                variant={followupFilter === "pool_exception" ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setFollowupFilter((prev) => (prev === "pool_exception" ? "all" : "pool_exception"))
                }
                className="whitespace-nowrap"
              >
                Fora do pool
                {followupCounts.pool_exception > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                    {followupCounts.pool_exception}
                  </Badge>
                )}
              </Button>

              <div className="ml-auto flex items-center gap-2">
                {(search ||
                  dateFilter ||
                  statusFilter !== "all" ||
                  categoryFilter !== "all" ||
                  followupFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleRefreshData}
                  title="Atualizar dados"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const headers = [
                      "ID Externo",
                      "Status",
                      "Categoria",
                      "Inspetor",
                      "Endereço",
                      "Cidade",
                      "Data Criação",
                    ];
                    const rows = filteredOrders.map((order) => [
                      order.external_id,
                      order.status || "",
                      order.category || "",
                      order.inspectors?.code || "",
                      getOrderAddress(order) || "",
                      order.city || "",
                      order.created_at ? format(parseISO(order.created_at), "dd/MM/yyyy HH:mm") : "",
                    ]);

                    const csvContent = [
                      headers.join(","),
                      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
                    ].join("\n");

                    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = `ordens-${format(new Date(), "yyyy-MM-dd")}.csv`;
                    link.click();
                    toast.success("Ordens exportadas com sucesso!");
                  }}
                  title="Exportar CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <AnimatedSkeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : groupedOrders.length === 0 ? (
        <Card className="bg-muted/20 border-dashed border-2">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-1">Nenhuma ordem encontrada</h3>
            <p className="text-sm opacity-80">Tente ajustar os filtros ou inserir novas ordens.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedOrders.map(({ dateKey, date, orders: dayOrders }) => {
            const isOpen = effectiveOpenKey === dateKey;
            const currentPage = getPageForDay(dateKey);
            const totalPages = Math.ceil(dayOrders.length / itemsPerPage);
            const paginatedOrders = dayOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            const dateLabel =
              dateKey === "no_due_date" ? (groupByDate === "due_date" ? "Sem prazo" : "Sem data") : undefined;
            let dateBadge: { label: string; variant?: "secondary" | "destructive" | "outline" } | undefined;
            if (groupByDate === "due_date" && dateKey !== "no_due_date") {
              const todayKey = getDateKeyInAppTimezone(new Date());
              const diff = differenceInCalendarDays(parseISO(dateKey), parseISO(todayKey));
              if (diff < 0) {
                dateBadge = { label: "Vencida", variant: "destructive" };
              } else if (diff === 0) {
                dateBadge = { label: "Vence hoje", variant: "destructive" };
              } else if (diff === 1) {
                dateBadge = { label: "Vence amanhã", variant: "secondary" };
              } else if (diff <= 3) {
                dateBadge = { label: `Em ${diff} dias`, variant: "outline" };
              }
            }

            return (
              <DayOrdersCard
                key={dateKey}
                date={date}
                orders={dayOrders}
                dateLabel={dateLabel}
                dateBadge={dateBadge}
                isOpen={isOpen}
                onToggle={() => handleToggleDay(dateKey)}
                assistantName={assistantName}
              >
                <OrdersTable
                  orders={paginatedOrders}
                  inspectors={inspectors}
                  onViewReason={handleViewReason}
                  onRedoAction={handleRedoAction}
                  onViewHistory={handleViewHistory}
                  onConfirmDueDate={handleOpenDueDateDialog}
                />

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      Mostrando {(currentPage - 1) * itemsPerPage + 1}-
                      {Math.min(currentPage * itemsPerPage, dayOrders.length)} de {dayOrders.length} ordens
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPageForDay(dateKey, Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPageForDay(dateKey, Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </DayOrdersCard>
            );
          })}
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
          </Button>
        </div>
      )}

      {/* Reason Dialog */}
      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {selectedOrder?.followup_kind === "pool_exception"
                ? "Exceção do Pool"
                : selectedOrder?.followup_kind === "correction"
                  ? "Motivo do Retorno"
                  : "Motivo da Rejeição"}
            </DialogTitle>
            <DialogDescription>Ordem: {selectedOrder?.external_id}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground">
              <p className="text-sm font-medium">
                {selectedOrder?.followup_reason ||
                  selectedOrder?.audit_reason ||
                  "Nenhum motivo especificado."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-md">
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Tipo</span>
                <p className="font-medium">{selectedOrder?.work_type}</p>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Categoria</span>
                <p className="font-medium">{selectedOrder?.category || "-"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-xs mb-1">Endereço</span>
                <p className="font-medium truncate">
                  {[selectedOrder?.address1, selectedOrder?.address2].filter(Boolean).join(" ").trim() || "-"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialogOpen(false)}>
              Fechar
            </Button>
            {selectedOrder?.followup_kind === "correction" && (
              <Button
                onClick={() => {
                  setReasonDialogOpen(false);
                  handleRedoAction(selectedOrder);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Refazer Ordem
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redo Confirmation Dialog */}
      <Dialog open={redoDialogOpen} onOpenChange={setRedoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Confirmar Refazer Ordem
            </DialogTitle>
            <DialogDescription>Ordem: {selectedOrder?.external_id}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Motivo do retorno</p>
              <div className="mt-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive-foreground">
                {selectedOrder?.followup_reason ||
                  selectedOrder?.audit_reason ||
                  "Sem motivo especificado."}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Você conseguiu refazer e reenviar esta ordem?
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-md">
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Tipo</span>
                <p className="font-medium">{selectedOrder?.work_type || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Categoria</span>
                <p className="font-medium">{selectedOrder?.category || "-"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-xs mb-1">Endereço</span>
                <p className="font-medium truncate">
                  {[selectedOrder?.address1, selectedOrder?.address2].filter(Boolean).join(" ").trim() || "-"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleConfirmRedo(false)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none border-destructive text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4 mr-2" />
              Não Realizei
            </Button>
            <Button onClick={() => handleConfirmRedo(true)} disabled={isSubmitting} className="flex-1 sm:flex-none">
              <Check className="h-4 w-4 mr-2" />
              Sim, Enviei
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Due Date Confirmation Dialog */}
      <Dialog open={dueDateDialogOpen} onOpenChange={setDueDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-chart-1" />
              Confirmar Ordem Agendada
            </DialogTitle>
            <DialogDescription>Ordem: {selectedOrder?.external_id}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Você realizou esta ordem agendada?</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleConfirmDueDate(false)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none border-destructive text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4 mr-2" />
              Não Realizei
            </Button>
            <Button onClick={() => handleConfirmDueDate(true)} disabled={isSubmitting} className="flex-1 sm:flex-none">
              <Check className="h-4 w-4 mr-2" />
              Sim, Realizei
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order History Dialog */}
      <OrderHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        orderId={selectedOrder?.id || null}
        orderExternalId={selectedOrder?.external_id}
      />

      {/* Reports Dialogs */}
      <Dialog open={weeklyReportOpen} onOpenChange={setWeeklyReportOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-primary" />
              Relatório Semanal
            </DialogTitle>
            <DialogDescription>Resumo de todas as ordens da semana (Domingo a Sábado)</DialogDescription>
          </DialogHeader>
          <WeeklyReportCard orders={ordersResolved || []} assistantName={assistantName} />
        </DialogContent>
      </Dialog>

      <Dialog open={periodReportOpen} onOpenChange={setPeriodReportOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Relatório de Período
            </DialogTitle>
            <DialogDescription>Selecione o intervalo de datas</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !periodStartDate && "text-muted-foreground",
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {periodStartDate ? format(periodStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  {/* CALENDÁRIO 1 CORRIGIDO */}
                  <CalendarComponent
                    mode="single"
                    selected={periodStartDate}
                    onSelect={(date) => date && setPeriodStartDate(date)}
                    initialFocus
                    classNames={{
                      day_selected:
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground font-bold",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                    }}
                    className="p-3 pointer-events-auto bg-card border-none shadow-none"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !periodEndDate && "text-muted-foreground",
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {periodEndDate ? format(periodEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  {/* CALENDÁRIO 2 CORRIGIDO */}
                  <CalendarComponent
                    mode="single"
                    selected={periodEndDate}
                    onSelect={(date) => date && setPeriodEndDate(date)}
                    initialFocus
                    classNames={{
                      day_selected:
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground font-bold",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                    }}
                    className="p-3 pointer-events-auto bg-card border-none shadow-none"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <PeriodReportCard orders={ordersResolved || []} startDate={periodStartDate} endDate={periodEndDate} assistantName={assistantName} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
