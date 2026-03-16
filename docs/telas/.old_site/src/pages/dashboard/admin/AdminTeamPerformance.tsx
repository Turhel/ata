import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
  ArrowLeft,
  CalendarRange,
  Filter,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTeamPerformance } from "@/hooks/useTeamPerformance";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts";
import { apiFetch } from "@/lib/apiClient";
import { useInspectors } from "@/hooks/useInspectors";
import { useWorkTypes } from "@/hooks/useWorkTypes";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";

type Period = "week" | "month" | "all";

export default function AdminTeamPerformance() {
  const { getToken } = useAuth();
  const [searchParams] = useSearchParams();
  const assistantIdFromUrl = searchParams.get("assistant");

  const [period, setPeriod] = useState<Period>("week");
  const [assistantFilter, setAssistantFilter] = useState<string>("all");
  const [inspectorFilter, setInspectorFilter] = useState<string>("all");
  const [workTypeFilter, setWorkTypeFilter] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [comparison, setComparison] = useState<{ totalOrders: number; approvalRate: number } | null>(null);
  const { metrics, orders, isLoading, refetch } = useTeamPerformance(period, assistantIdFromUrl);
  const { inspectors } = useInspectors();
  const { activeWorkTypes } = useWorkTypes();
  const { toast } = useToast();

  useEffect(() => {
    if (assistantIdFromUrl) {
      setAssistantFilter(assistantIdFromUrl);
    }
  }, [assistantIdFromUrl]);

  const assistantNameMap = useMemo(() => {
    const map = new Map<string, string>();
    metrics?.assistants.forEach((assistant) => {
      map.set(assistant.assistantId, assistant.assistantName);
    });
    return map;
  }, [metrics]);

  const filteredOrders = useMemo(() => {
    let next = orders || [];

    if (assistantFilter !== "all") {
      next = next.filter((o) => o.assistant_id === assistantFilter);
    }

    if (inspectorFilter !== "all") {
      next = next.filter((o) => o.inspector_id === inspectorFilter);
    }

    if (workTypeFilter !== "all") {
      next = next.filter((o) => (o.work_type || o.otype) === workTypeFilter);
    }

    return next;
  }, [orders, assistantFilter, inspectorFilter, workTypeFilter]);

  const ordersLoading = isLoading;

  const buildMetricsFromOrders = useCallback((orders: any[]) => {
    const assistants = new Map<string, any>();
    let totalOrders = 0;
    let approvedOrders = 0;
    let rejectedOrders = 0;
    let pendingOrders = 0;
    let followUpOrders = 0;
    const categoryBreakdown = { regular: 0, exterior: 0, interior: 0, fint: 0 };

    orders.forEach((order) => {
      const assistantId = order.assistant_id || "unknown";
      const assistantName = assistantNameMap.get(assistantId) || "Desconhecido";
      if (!assistants.has(assistantId)) {
        assistants.set(assistantId, {
          assistantId,
          assistantName,
          totalOrders: 0,
          approvedOrders: 0,
          rejectedOrders: 0,
          pendingOrders: 0,
          followUpOrders: 0,
          approvalRate: 0,
          categoryBreakdown: { regular: 0, exterior: 0, interior: 0, fint: 0 },
          followUpReasons: [],
          rejectionReasons: [],
          needsAlert: false,
        });
      }

      const metricsRef = assistants.get(assistantId);
      metricsRef.totalOrders += 1;
      totalOrders += 1;

      if (order.audit_flag && order.status === "enviada") {
        metricsRef.followUpOrders += 1;
        followUpOrders += 1;
      } else if (order.status === "aprovada" || order.status === "paga") {
        metricsRef.approvedOrders += 1;
        approvedOrders += 1;
      } else if (order.status === "rejeitada" && !order.audit_flag) {
        metricsRef.rejectedOrders += 1;
        rejectedOrders += 1;
      } else if (!order.audit_flag && ["pendente", "enviada", "em_analise", "agendada"].includes(order.status || "")) {
        metricsRef.pendingOrders += 1;
        pendingOrders += 1;
      }

      const category = order.category;
      if (category && Object.prototype.hasOwnProperty.call(categoryBreakdown, category)) {
        metricsRef.categoryBreakdown[category] += 1;
        categoryBreakdown[category] += 1;
      }
    });

    let alertCount = 0;
    assistants.forEach((metricsRef) => {
      const completed = metricsRef.approvedOrders + metricsRef.rejectedOrders;
      metricsRef.approvalRate = completed > 0 ? (metricsRef.approvedOrders / completed) * 100 : 0;
      metricsRef.needsAlert = completed >= 5 && metricsRef.approvalRate < 70;
      if (metricsRef.needsAlert) alertCount += 1;
    });

    const totalCompleted = approvedOrders + rejectedOrders;
    return {
      totalOrders,
      approvedOrders,
      rejectedOrders,
      pendingOrders,
      followUpOrders,
      approvalRate: totalCompleted > 0 ? (approvedOrders / totalCompleted) * 100 : 0,
      categoryBreakdown,
      assistants: Array.from(assistants.values()).sort((a, b) => b.totalOrders - a.totalOrders),
      alertCount,
    };
  }, [assistantNameMap]);

  const displayedMetrics = useMemo(() => {
    if (!metrics) return null;
    const hasFilters = assistantFilter !== "all" || inspectorFilter !== "all" || workTypeFilter !== "all";
    if (!hasFilters && !assistantIdFromUrl) return metrics;
    if (filteredOrders.length === 0) return { ...metrics, totalOrders: 0, approvedOrders: 0, rejectedOrders: 0, pendingOrders: 0, followUpOrders: 0, approvalRate: 0, assistants: [] };
    return buildMetricsFromOrders(filteredOrders);
  }, [metrics, assistantFilter, inspectorFilter, workTypeFilter, assistantIdFromUrl, filteredOrders, buildMetricsFromOrders]);

  const assistantName = displayedMetrics?.assistants[0]?.assistantName;

  useEffect(() => {
    setSelectedDay(null);
  }, [period, assistantFilter, inspectorFilter, workTypeFilter]);

  useEffect(() => {
    const fetchComparison = async () => {
      if (period !== "week" && period !== "month") {
        setComparison(null);
        return;
      }
      if (!metrics || metrics.assistants.length === 0) {
        setComparison(null);
        return;
      }

      const baseDate = new Date();
      const previousDate = period === "week" ? subWeeks(baseDate, 1) : subMonths(baseDate, 1);
      const start =
        period === "week"
          ? format(startOfWeek(previousDate, { weekStartsOn: 0 }), "yyyy-MM-dd")
          : format(startOfMonth(previousDate), "yyyy-MM-dd");
      const end =
        period === "week"
          ? format(endOfWeek(previousDate, { weekStartsOn: 0 }), "yyyy-MM-dd")
          : format(endOfMonth(previousDate), "yyyy-MM-dd");

      try {
        const assistantIds = metrics.assistants.map((assistant) => assistant.assistantId);
        const qs = new URLSearchParams();
        qs.set("assistant_ids", assistantIds.join(","));
        qs.set("submitted_from", start);
        qs.set("submitted_to", end + "T23:59:59");
        qs.set("archived", "false");

        if (assistantFilter !== "all") qs.set("assistant_id", assistantFilter);
        if (inspectorFilter !== "all") qs.set("inspector_id", inspectorFilter);
        if (workTypeFilter !== "all") qs.set("work_type", workTypeFilter);

        const res = await apiFetch<{
          ok: true;
          stats: { total: number; approved: number; rejected: number };
        }>({ getToken }, `/api/orders/stats?${qs.toString()}`, { bypassFreeze: true });

        const total = Number(res.stats?.total ?? 0) || 0;
        const approved = Number(res.stats?.approved ?? 0) || 0;
        const rejected = Number(res.stats?.rejected ?? 0) || 0;
        const approvalRate = approved + rejected > 0 ? (approved / (approved + rejected)) * 100 : 0;
        setComparison({ totalOrders: total, approvalRate });
      } catch (error) {
        console.error("Erro ao carregar comparativo:", error);
        setComparison(null);
      }
    };

    fetchComparison();
  }, [period, metrics, assistantFilter, inspectorFilter, workTypeFilter, getToken]);

  const getApprovalRateTrend = (rate: number) => {
    if (rate >= 90)
      return { icon: TrendingUp, color: "text-emerald-600 bg-emerald-100 border-emerald-200", label: "Excelente" };
    if (rate >= 70) return { icon: Minus, color: "text-blue-600 bg-blue-100 border-blue-200", label: "Bom" };
    return { icon: TrendingDown, color: "text-rose-600 bg-rose-100 border-rose-200", label: "Atenção" };
  };

  const getPeriodLabel = (p: Period) => {
    switch (p) {
      case "week":
        return "Esta Semana";
      case "month":
        return "Este Mês";
      case "all":
        return "Todo o Período";
    }
  };

  // Dados para o gráfico simples
  const chartData = useMemo(() => {
    if (!displayedMetrics) return [];
    return [
      { name: "Aprovadas", value: displayedMetrics.approvedOrders, color: "#10b981" }, // Emerald-500
      { name: "Pendentes", value: displayedMetrics.pendingOrders, color: "#f59e0b" }, // Amber-500
      { name: "Follow-up", value: displayedMetrics.followUpOrders, color: "#3b82f6" }, // Blue-500
      { name: "Rejeitadas", value: displayedMetrics.rejectedOrders, color: "#ef4444" }, // Red-500
    ].filter((item) => item.value > 0);
  }, [displayedMetrics]);

  const dailyCounts = useMemo(() => {
    if (!filteredOrders.length) return [];
    const map = new Map<string, number>();
    filteredOrders.forEach((order) => {
      const dateStr = order.execution_date || order.created_at;
      if (!dateStr) return;
      const key = format(parseISO(dateStr), "dd/MM");
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredOrders]);

  const selectedDayOrders = useMemo(() => {
    if (!selectedDay) return [];
    return filteredOrders.filter((order) => {
      const dateStr = order.execution_date || order.created_at;
      if (!dateStr) return false;
      return format(parseISO(dateStr), "dd/MM") === selectedDay;
    });
  }, [filteredOrders, selectedDay]);

  const bottlenecks = useMemo(() => {
    if (!displayedMetrics) return [];
    return [...displayedMetrics.assistants]
      .map((assistant) => ({
        ...assistant,
        riskScore: (assistant.followUpOrders || 0) + (assistant.pendingOrders || 0),
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);
  }, [displayedMetrics]);

  const inspectorMap = useMemo(() => {
    const map = new Map<string, string>();
    inspectors.forEach((inspector) => {
      map.set(inspector.id, inspector.code || inspector.name);
    });
    return map;
  }, [inspectors]);

  const deltaOrders = useMemo(() => {
    if (!comparison || !displayedMetrics) return null;
    return displayedMetrics.totalOrders - comparison.totalOrders;
  }, [comparison, displayedMetrics]);

  const deltaApproval = useMemo(() => {
    if (!comparison || !displayedMetrics) return null;
    return displayedMetrics.approvalRate - comparison.approvalRate;
  }, [comparison, displayedMetrics]);

  const handleExport = async (type: "excel" | "pdf") => {
    if (filteredOrders.length === 0) {
      toast({ title: "Sem dados", description: "Nenhuma ordem para exportar.", variant: "destructive" });
      return;
    }

    if (type === "excel") {
      const xlsxModule: any = await import("xlsx");
      const XLSX: any = xlsxModule?.utils ? xlsxModule : xlsxModule?.default ?? xlsxModule;

      const ws = XLSX.utils.json_to_sheet(
        filteredOrders.map((order) => ({
          Data: order.execution_date || order.created_at ? format(new Date(order.execution_date || order.created_at), "dd/MM/yyyy") : "",
          Ordem: order.external_id,
          Tipo: order.work_type,
          Categoria: order.category,
          Status: order.status,
          Inspetor: inspectorMap.get(order.inspector_id) || order.inspector_id,
        })),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Performance");
      XLSX.writeFile(wb, "Admin_Performance.xlsx");
      return;
    }

    const [{ default: JsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable: any = autoTableModule?.default ?? autoTableModule;

    const doc = new JsPDF();
    doc.setFontSize(16);
    doc.text("Relatorio de Performance - Admin", 14, 18);
    autoTable(doc, {
      startY: 26,
      head: [["Data", "Ordem", "Tipo", "Categoria", "Status"]],
      body: filteredOrders.map((order) => [
        order.execution_date || order.created_at ? format(new Date(order.execution_date || order.created_at), "dd/MM/yyyy") : "",
        order.external_id || "-",
        order.work_type || "-",
        order.category || "-",
        order.status || "-",
      ]),
      theme: "grid",
      styles: { fontSize: 8 },
    });
    doc.save("Admin_Performance.pdf");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
        <div className="space-y-1">
          {assistantIdFromUrl && (
            <Button
              variant="link"
              size="sm"
              asChild
              className="px-0 text-muted-foreground hover:text-primary mb-1 h-auto"
            >
              <Link to="/admin/team" className="flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para lista de equipe
              </Link>
            </Button>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {assistantIdFromUrl ? `Relatório: ${assistantName}` : "Desempenho da Equipe"}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            {assistantIdFromUrl
              ? "Análise detalhada de produtividade e qualidade."
              : "Visão geral agregada de todos os assistentes."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-muted/50 p-1 rounded-lg border">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[160px] border-0 bg-transparent focus:ring-0 shadow-none h-9">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="all">Todo o Período</SelectItem>
            </SelectContent>
          </Select>
          <div className="w-px h-6 bg-border mx-1" />
          <Select value={assistantFilter} onValueChange={setAssistantFilter}>
            <SelectTrigger className="w-[180px] border-0 bg-transparent focus:ring-0 shadow-none h-9">
              <SelectValue placeholder="Assistente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos assistentes</SelectItem>
              {metrics?.assistants.map((assistant) => (
                <SelectItem key={assistant.assistantId} value={assistant.assistantId}>
                  {assistant.assistantName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={inspectorFilter} onValueChange={setInspectorFilter}>
            <SelectTrigger className="w-[180px] border-0 bg-transparent focus:ring-0 shadow-none h-9">
              <SelectValue placeholder="Inspetor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos inspetores</SelectItem>
              {inspectors.map((inspector) => (
                <SelectItem key={inspector.id} value={inspector.id}>
                  {inspector.code} - {inspector.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
            <SelectTrigger className="w-[160px] border-0 bg-transparent focus:ring-0 shadow-none h-9">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              {activeWorkTypes.map((workType) => (
                <SelectItem key={workType.id} value={workType.code}>
                  {workType.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setAssistantFilter("all");
              setInspectorFilter("all");
              setWorkTypeFilter("all");
            }}
            className="h-8 w-8 hover:bg-white dark:hover:bg-slate-800 rounded-md"
          >
            <Filter className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="h-8 w-8 hover:bg-white dark:hover:bg-slate-800 rounded-md"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {!isLoading && displayedMetrics && displayedMetrics.alertCount > 0 && !assistantIdFromUrl && (
        <Alert
          variant="destructive"
          className="border-rose-200 bg-rose-50 text-rose-900 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-900"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção Requerida</AlertTitle>
          <AlertDescription className="text-rose-800 dark:text-rose-300">
            {displayedMetrics.alertCount} assistente(s) estão com taxa de aprovação abaixo de 70%.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-slate-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
              Total
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="space-y-1">
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-200">
                  {displayedMetrics?.totalOrders || 0}
                </div>
                {deltaOrders !== null && (
                  <div
                    className={`text-xs font-medium ${deltaOrders >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {deltaOrders >= 0 ? "+" : ""}
                    {deltaOrders} vs período anterior
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ordens processadas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600/80 flex justify-between">
              Aprovadas
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                {displayedMetrics?.approvedOrders || 0}
              </div>
            )}
            <p className="text-xs text-emerald-600/60 dark:text-emerald-400/60">Finalizadas com sucesso</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600/80 flex justify-between">
              Pendentes
              <Clock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                {displayedMetrics?.pendingOrders || 0}
              </div>
            )}
            <p className="text-xs text-amber-600/60 dark:text-amber-400/60">Em análise ou enviadas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600/80 flex justify-between">
              Follow-up
              <RefreshCw className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {displayedMetrics?.followUpOrders || 0}
              </div>
            )}
            <p className="text-xs text-blue-600/60 dark:text-blue-400/60">Retornaram para ajuste</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-600/80 flex justify-between">
              Rejeitadas
              <XCircle className="h-4 w-4 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-rose-700 dark:text-rose-400">
                {displayedMetrics?.rejectedOrders || 0}
              </div>
            )}
            <p className="text-xs text-rose-600/60 dark:text-rose-400/60">Canceladas definitivamente</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Main Chart & Breakdown */}
        <Card className="md:col-span-4 shadow-sm border-border/60">
          <CardHeader>
            <CardTitle>Qualidade e Categorias</CardTitle>
            <CardDescription>Análise da taxa de aprovação e distribuição de tipos de trabalho</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="space-y-8">
                {/* Approval Rate */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground font-medium">Taxa de Aprovação</span>
                      <div className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                        {displayedMetrics?.approvalRate.toFixed(1)}%
                      </div>
                      {deltaApproval !== null && (
                        <div
                          className={`text-xs font-medium ${deltaApproval >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          {deltaApproval >= 0 ? "+" : ""}
                          {deltaApproval.toFixed(1)} p.p. vs período anterior
                        </div>
                      )}
                    </div>
                    {displayedMetrics &&
                      (() => {
                        const trend = getApprovalRateTrend(displayedMetrics.approvalRate);
                        return (
                          <Badge variant="outline" className={`${trend.color} px-3 py-1 text-sm h-8`}>
                            <trend.icon className="h-4 w-4 mr-1.5" />
                            {trend.label}
                          </Badge>
                        );
                      })()}
                  </div>
                  <Progress
                    value={displayedMetrics?.approvalRate || 0}
                    className="h-3 rounded-full"
                    //indicatorClassName={displayedMetrics?.approvalRate >= 90 ? "bg-emerald-500" : displayedMetrics?.approvalRate >= 70 ? "bg-blue-500" : "bg-rose-500"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* Categories */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground">Por Categoria</h4>
                    <div className="space-y-3">
                      {[
                        { key: "regular", label: "Regular", color: "bg-slate-800 dark:bg-slate-200" },
                        { key: "exterior", label: "Exterior", color: "bg-emerald-500" },
                        { key: "interior", label: "Interior", color: "bg-blue-500" },
                        { key: "fint", label: "FINT", color: "bg-amber-500" },
                      ].map(({ key, label, color }) => {
                        const value =
                          displayedMetrics?.categoryBreakdown[key as keyof typeof displayedMetrics.categoryBreakdown] ||
                          0;
                        const total = displayedMetrics?.totalOrders || 1;
                        const percentage = (value / total) * 100;

                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
                              <span className="text-muted-foreground">
                                {value} ({percentage.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mini Chart */}
                  <div className="h-[180px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          cursor={{ fill: "transparent" }}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assistants List */}
        <Card className="md:col-span-3 shadow-sm border-border/60 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-500" />
              {assistantIdFromUrl ? "Detalhes" : "Ranking da Equipe"}
            </CardTitle>
            <CardDescription>
              {assistantIdFromUrl ? "Métricas específicas selecionadas." : "Ordenado por volume de aprovação."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Assistente</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Taxa</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : displayedMetrics?.assistants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum dado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedMetrics?.assistants.map((assistant) => (
                      <TableRow
                        key={assistant.assistantId}
                        className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                              {assistant.assistantName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                {assistant.assistantName}
                              </p>
                              {assistant.needsAlert && (
                                <span className="flex items-center gap-1 text-[10px] text-rose-600 font-medium animate-pulse">
                                  <AlertTriangle className="h-3 w-3" /> Atenção
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{assistant.totalOrders}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              assistant.approvalRate >= 90
                                ? "default"
                                : assistant.approvalRate >= 70
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="h-5 text-[10px]"
                          >
                            {assistant.approvalRate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Info className="h-4 w-4 text-slate-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="w-48 p-3">
                                <div className="text-xs space-y-1">
                                  <p className="font-bold border-b pb-1 mb-1">Detalhes</p>
                                  <div className="flex justify-between">
                                    <span>Aprovadas:</span>{" "}
                                    <span className="text-emerald-500">{assistant.approvedOrders}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Follow-up:</span>{" "}
                                    <span className="text-blue-500">{assistant.followUpOrders}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Rejeitadas:</span>{" "}
                                    <span className="text-rose-500">{assistant.rejectedOrders}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 shadow-sm border-border/60">
          <CardHeader>
            <CardTitle>Produção por dia</CardTitle>
            <CardDescription>Clique no gráfico para ver os detalhes do dia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ordersLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : dailyCounts.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma ordem para o período selecionado.</div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyCounts} onClick={(data: any) => setSelectedDay(data?.activeLabel || null)}>
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {selectedDay && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Ordens em {selectedDay}</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ordem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Inspetor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDayOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.external_id || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.status}</Badge>
                        </TableCell>
                        <TableCell>{order.work_type || "-"}</TableCell>
                        <TableCell>{inspectorMap.get(order.inspector_id) || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {selectedDayOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhuma ordem encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 shadow-sm border-border/60">
          <CardHeader>
            <CardTitle>Top 5 gargalos</CardTitle>
            <CardDescription>Assistentes com maior volume de pendências ou follow-up.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : bottlenecks.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum gargalo identificado.</div>
            ) : (
              <div className="space-y-3">
                {bottlenecks.map((assistant) => (
                  <div key={assistant.assistantId} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="font-medium text-sm">{assistant.assistantName}</p>
                      <p className="text-xs text-muted-foreground">
                        Follow-up: {assistant.followUpOrders} • Pendentes: {assistant.pendingOrders}
                      </p>
                    </div>
                    <Badge variant={assistant.needsAlert ? "destructive" : "secondary"}>
                      {assistant.approvalRate.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
