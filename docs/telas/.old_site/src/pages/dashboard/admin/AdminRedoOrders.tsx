import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  Eye,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Bell,
  BarChart3,
  User,
  SearchX,
  History,
  RotateCcw,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRedoOrders, RedoOrder, SeverityLevel } from "@/hooks/useRedoOrders";
import { apiFetch } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { RejectionReasonsReport } from "@/components/orders/RejectionReasonsReport";

const ITEMS_PER_PAGE = 10;

type GlobalOrder = {
  id: string;
  external_id: string;
  status: string;
  audit_flag?: boolean | null;
  audit_reason?: string | null;
  work_type?: string | null;
  address?: string | null;
  assistant_id?: string | null;
  assistant_name?: string;
  created_at: string;
  is_follow_up?: boolean;
};

const isPoolException = (order: { followupKind?: string }) => order.followupKind === "pool_exception";

function toLegacyStatusForUi(order: any): string {
  const auditFlag = order?.followup_suspected ?? null;
  if (auditFlag) return "enviada";
  const s = String(order?.app_status || "").toLowerCase();
  if (s === "closed") return "aprovada";
  if (s === "canceled") return "cancelada";
  if (s === "available") return "rejeitada";
  if (s === "scheduled") return "agendada";
  return "enviada";
}

function toPatchFromLegacyStatus(status: string): { app_status: string; auto_clear_possession?: boolean } {
  const s = String(status || "").toLowerCase();
  if (s === "enviada") return { app_status: "submitted" };
  if (s === "aprovada") return { app_status: "closed" };
  if (s === "rejeitada") return { app_status: "available", auto_clear_possession: true };
  if (s === "cancelada") return { app_status: "canceled", auto_clear_possession: true };
  if (s === "nao_realizada") return { app_status: "canceled", auto_clear_possession: true };
  if (s === "paga") return { app_status: "closed" };
  return { app_status: "submitted" };
}

export default function AdminRedoOrders() {
  const { toast } = useToast();
  const { user, getToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "pool_exceptions" | "search">("pending");
  const [selectedOrder, setSelectedOrder] = useState<RedoOrder | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [reportOpen, setReportOpen] = useState(false);
  const [assistantFilter, setAssistantFilter] = useState<string>("all");
  const [selectedExceptionIds, setSelectedExceptionIds] = useState<Set<string>>(new Set());

  // Estado para busca global
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalOrder[]>([]);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTargetOrder, setStatusTargetOrder] = useState<GlobalOrder | null>(null);
  const [forcedStatus, setForcedStatus] = useState<string>("enviada");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpTargetOrder, setFollowUpTargetOrder] = useState<GlobalOrder | null>(null);
  const [isApplyingFollowUp, setIsApplyingFollowUp] = useState(false);
  const [exceptionConfirmOpen, setExceptionConfirmOpen] = useState(false);
  const [exceptionConfirmIds, setExceptionConfirmIds] = useState<Array<{ followupId: string; orderId: string }>>(
    [],
  );
  const [exceptionConfirmLabel, setExceptionConfirmLabel] = useState("");

  // Estado para histórico na busca global
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const { orders, isLoading, refetch } = useRedoOrders({
    searchTerm: activeTab === "search" ? "" : searchTerm,
  });

  const followupIdToOrderId = useMemo(
    () => new Map(orders.map((order) => [order.followupId, order.id])),
    [orders],
  );

  const uniqueAssistants = useMemo(() => {
    const assistantsMap = new Map<string, string>();
    orders.forEach((order) => {
      if (order.assistantId && !assistantsMap.has(order.assistantId)) {
        assistantsMap.set(order.assistantId, order.assistantName);
      }
    });
    return Array.from(assistantsMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const ordersFilteredByAssistant = useMemo(() => {
    if (assistantFilter === "all" || activeTab !== "pending") return orders;
    return orders.filter((o) => o.assistantId === assistantFilter);
  }, [orders, assistantFilter, activeTab]);

  // Busca global de ordens (histórico completo)
  const handleGlobalSearch = async () => {
    if (!globalSearchTerm.trim()) return;

    setIsSearchingGlobal(true);
    try {
      // 1. Busca Ordens (API nova)
      const ordersRes = await apiFetch<{ ok: true; items: any[] }>(
        { getToken },
        `/api/orders?search=${encodeURIComponent(globalSearchTerm)}&limit=50&archived=false`
      );
      const ordersData = ordersRes.items || [];

      if (!ordersData || ordersData.length === 0) {
        setGlobalSearchResults([]);
        setIsSearchingGlobal(false);
        return;
      }

      // 2. Busca nomes dos assistentes (CORREÇÃO: Mapeamento duplo ID/User_ID)
      const assistantIds = Array.from(new Set(ordersData.map((o) => o.assistant_id).filter(Boolean)));

      const profilesMap = new Map();
      if (assistantIds.length > 0) {
        // Tenta buscar perfis que correspondam a esses IDs
        // Como não sabemos se é PK ou user_id na tabela orders, buscamos ambos no profiles e mapeamos
        const profilesRes = await apiFetch<{ ok: true; profiles: any[] }>(
          { getToken },
          `/api/users/profiles?user_ids=${assistantIds.join(",")}`
        );
        (profilesRes.profiles || []).forEach((p) => {
          if (p.id) profilesMap.set(p.id, p.full_name);
          if (p.user_id) profilesMap.set(p.user_id, p.full_name);
        });
      }

      const orderIds = ordersData.map((o) => o.id);
      let followupOrderIds = new Set<string>();
      if (orderIds.length > 0) {
        const followupsRes = await apiFetch<{ ok: true; followups: { order_id: string }[] }>(
          { getToken },
          `/api/orders/followups?order_ids=${orderIds.join(",")}`
        );
        const followupCounts = new Map<string, number>();
        (followupsRes.followups || []).forEach((f) => {
          const count = followupCounts.get(f.order_id) ?? 0;
          followupCounts.set(f.order_id, count + 1);
        });
        followupOrderIds = new Set(
          Array.from(followupCounts.entries())
            .filter(([, count]) => count > 1)
            .map(([orderId]) => orderId)
        );
      }

      // 3. Monta resultado final
      const formattedResults: GlobalOrder[] = ordersData.map((order: any) => ({
        id: order.id,
        external_id: order.external_id,
        status: toLegacyStatusForUi(order),
        audit_flag: order.followup_suspected ?? null,
        audit_reason: order.followup_suspected_reason ?? null,
        work_type: order.otype ?? null,
        assistant_id: order.assistant_id ?? null,
        assistant_name: profilesMap.get(order.assistant_id) || "Desconhecido",
        created_at: order.created_at ?? order.updated_at ?? new Date().toISOString(),
        address: [order.address1, order.address2].filter(Boolean).join(" ").trim() || null,
        // Follow-up é apenas se existir mais de uma vez no banco (reincidência)
        // Removida a verificação de audit_flag aqui, pois erro de pool não é follow-up
        is_follow_up: followupOrderIds.has(order.id),
      }));

      setGlobalSearchResults(formattedResults);
    } catch (error) {
      console.error("Erro na busca global:", error);
      toast({ title: "Erro na busca", variant: "destructive" });
    } finally {
      setIsSearchingGlobal(false);
    }
  };

  const handleViewHistory = async (orderId: string) => {
    setHistoryOpen(true);
    setIsLoadingHistory(true);
    try {
      const historyRes = await apiFetch<{ ok: true; history: any[] }>(
        { getToken },
        `/api/orders/history?order_id=${encodeURIComponent(orderId)}`
      );
      setSelectedHistory(historyRes.history || []);
    } catch (error) {
      toast({ title: "Erro ao carregar histórico", variant: "destructive" });
      setSelectedHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const openExceptionConfirm = (targets: Array<{ followupId: string; orderId: string }>, label: string) => {
    setExceptionConfirmIds(targets);
    setExceptionConfirmLabel(label);
    setExceptionConfirmOpen(true);
  };

  const handleApproveException = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    openExceptionConfirm([{ followupId: order.followupId, orderId: order.id }], "Aprovar exce????o de pool");
  };

  const confirmApproveExceptions = async () => {
    const targets = exceptionConfirmIds;
    if (targets.length === 0) return;
    const followupIds = targets.map((t) => t.followupId);
    try {
      await apiFetch<{ ok: true; followups: any[] }>(
        { getToken },
        "/api/orders/followups",
        {
          method: "PATCH",
          body: JSON.stringify({
            ids: followupIds,
            status: "resolved",
            resolved_at: new Date().toISOString(),
            resolved_by: user?.id || null,
          }),
        }
      );

      if (targets.length === 1) {
        try {
          await apiFetch<{ ok: true; log: any }>(
            { getToken },
            "/api/audit-logs",
            {
              method: "POST",
              body: JSON.stringify({
                action: "pool_exception_approved",
                resource_type: "orders",
                resource_id: targets[0].orderId,
                user_id: user?.id || null,
                details: { source: "admin_redo_orders" },
              }),
            }
          );
        } catch (auditError) {
          console.warn("Erro ao registrar audit log:", auditError);
        }
      }

      toast({
        title: targets.length > 1 ? "Exce????es aprovadas" : "Exce????o aprovada",
        description:
          targets.length > 1 ? `${targets.length} ordens normalizadas.` : "Ordem normalizada no sistema.",
      });
      refetch();
      setSelectedExceptionIds(new Set());

      if (activeTab === "search") {
        setGlobalSearchResults((prev) => prev);
      }
      setExceptionConfirmOpen(false);
    } catch (error) {
      toast({ title: "Erro ao aprovar", variant: "destructive" });
    }
  };

  const handleApproveSelectedExceptions = async () => {
    const ids = Array.from(selectedExceptionIds);
    if (ids.length === 0) return;

    const targets = ids
      .map((id) => ({ followupId: id, orderId: followupIdToOrderId.get(id) || id }))
      .filter((target) => !!target.orderId);

    openExceptionConfirm(targets, "Aprovar exce????es em massa");
  };

  const handleToggleException = (followupId: string, checked: boolean) => {
    setSelectedExceptionIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(followupId);
      } else {
        next.delete(followupId);
      }
      return next;
    });
  };

  const handleToggleAssistantExceptions = (assistantId: string, checked: boolean) => {
    const assistantOrders = poolExceptionsByAssistant.find((group) => group.assistantId === assistantId)?.orders || [];
    setSelectedExceptionIds((prev) => {
      const next = new Set(prev);
      assistantOrders.forEach((order) => {
        if (checked) {
          next.add(order.followupId);
        } else {
          next.delete(order.followupId);
        }
      });
      return next;
    });
  };

  const handleOpenStatusDialog = (order: GlobalOrder) => {
    setStatusTargetOrder(order);
    setForcedStatus(order.status);
    setStatusDialogOpen(true);
  };

  const handleForceStatusChange = async () => {
    if (!statusTargetOrder) return;
    setIsUpdatingStatus(true);
    try {
      const patch = toPatchFromLegacyStatus(forcedStatus);
      await apiFetch<{ ok: true; order: any }>(
        { getToken },
        `/api/orders/${statusTargetOrder.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch),
        }
      );

      await apiFetch<{ ok: true; history: any[] }>(
        { getToken },
        "/api/orders/history",
        {
          method: "POST",
          body: JSON.stringify({
            items: [
              {
                order_id: statusTargetOrder.id,
                previous_status: statusTargetOrder.status,
                new_status: forcedStatus,
                changed_by: user?.id ?? null,
                change_reason: "Status forcado",
              },
            ],
          }),
        }
      );

      toast({ title: "Status atualizado", description: "A ordem foi atualizada com sucesso." });
      setGlobalSearchResults((prev) =>
        prev.map((order) => (order.id === statusTargetOrder.id ? { ...order, status: forcedStatus } : order)),
      );
      setStatusDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOpenFollowUpDialog = (order: GlobalOrder) => {
    setFollowUpTargetOrder(order);
    setFollowUpDialogOpen(true);
  };

  const handleApplyFollowUp = async () => {
    if (!followUpTargetOrder) return;
    setIsApplyingFollowUp(true);
    try {
      await apiFetch<{ ok: true; order: any }>(
        { getToken },
        `/api/orders/${followUpTargetOrder.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            app_status: "submitted",
            followup_suspected: true,
            followup_suspected_reason: "Follow-up tardio",
          }),
        }
      );

      await apiFetch<{ ok: true; history: any[] }>(
        { getToken },
        "/api/orders/history",
        {
          method: "POST",
          body: JSON.stringify({
            items: [
              {
                order_id: followUpTargetOrder.id,
                previous_status: followUpTargetOrder.status,
                new_status: "enviada",
                changed_by: user?.id ?? null,
                change_reason: "Follow-up tardio",
              },
            ],
          }),
        }
      );

      toast({ title: "Follow-up aplicado", description: "A ordem voltou para retrabalho." });
      setGlobalSearchResults((prev) =>
        prev.map((order) =>
          order.id === followUpTargetOrder.id
            ? { ...order, status: "enviada", audit_flag: true, is_follow_up: true }
            : order,
        ),
      );
      setFollowUpDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro ao aplicar follow-up", variant: "destructive" });
    } finally {
      setIsApplyingFollowUp(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as any);
    setCurrentPage(1);
    setSearchTerm("");
    setSelectedExceptionIds(new Set());
    if (value !== "search") {
      setGlobalSearchResults([]);
      setGlobalSearchTerm("");
    }
  };

  const filteredOrders = useMemo(() => {
    let filtered = ordersFilteredByAssistant;

    if (activeTab === "pending") {
      filtered = ordersFilteredByAssistant.filter((o) => o.followupKind === "correction");
      const severityOrder: Record<SeverityLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      filtered = [...filtered].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    } else if (activeTab === "pool_exceptions") {
      // Filtrar ordens com flag de auditoria
      filtered = ordersFilteredByAssistant.filter((o) => o.followupKind === "pool_exception");
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (o) =>
          o.externalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.assistantName.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return filtered;
  }, [ordersFilteredByAssistant, activeTab, searchTerm]);

  const poolExceptionsByAssistant = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const grouped = new Map<string, { assistantName: string; orders: RedoOrder[] }>();
    orders
      .filter((order) => {
        if (order.followupKind !== "pool_exception") return false;
        if (!normalizedSearch) return true;
        return (
          order.externalId.toLowerCase().includes(normalizedSearch) ||
          order.assistantName.toLowerCase().includes(normalizedSearch)
        );
      })
      .forEach((order) => {
        const assistantId = order.assistantId || "unknown";
        const assistantName = order.assistantName || "Sem assistente";
        if (!grouped.has(assistantId)) {
          grouped.set(assistantId, { assistantName, orders: [] });
        }
        grouped.get(assistantId)?.orders.push(order);
      });

    return Array.from(grouped.entries()).map(([assistantId, data]) => ({
      assistantId,
      assistantName: data.assistantName,
      orders: data.orders,
    }));
  }, [orders, searchTerm]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getStatusBadge = (status: string) => {
    const config: Record<string, string> = {
      rejeitada: "bg-destructive/20 text-destructive border-destructive/30",
      enviada: "bg-chart-2/20 text-chart-2 border-chart-2/30",
      aprovada: "bg-chart-4/20 text-chart-4 border-chart-4/30",
      paga: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
    return (
      <Badge variant="outline" className={config[status] || "bg-muted"}>
        {status}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: SeverityLevel, days: number) => {
    const config = {
      low: { label: "Baixa", class: "bg-chart-4/20 text-chart-4 border-chart-4/30", icon: Clock },
      medium: { label: "Média", class: "bg-chart-2/20 text-chart-2 border-chart-2/30", icon: Clock },
      high: { label: "Alta", class: "bg-chart-3/20 text-chart-3 border-chart-3/30", icon: AlertTriangle },
      critical: {
        label: "Crítica",
        class: "bg-destructive/20 text-destructive border-destructive/30",
        icon: AlertCircle,
      },
    };
    const { label, class: className, icon: Icon } = config[severity];
    return (
      <Badge variant="outline" className={className} title={`${days} dia(s) desde a rejeição`}>
        <Icon className="h-3 w-3 mr-1" />
        {label} ({days}d)
      </Badge>
    );
  };

  const handleViewDetails = (order: RedoOrder) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const highSeverityByAssistant = useMemo(() => {
    // Recriando lógica simples para evitar erro de undefined se a função não existir
    return [];
  }, []);

  const poolExceptionCount = useMemo(() => {
    return orders.filter((o) => o.followupKind === "pool_exception").length;
  }, [orders]);

  const pendingCount = useMemo(() => {
    return orders.filter((o) => o.followupKind === "correction").length;
  }, [orders]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Retrabalho e Exceções</h1>
          <p className="text-muted-foreground">Gerencie ordens rejeitadas, exceções de pool e pesquise histórico.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setReportOpen(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Relatório
          </Button>
          <Button variant="outline" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="pending">
            Pendentes
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pool_exceptions">
            Exceções de Pool
            {poolExceptionCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {poolExceptionCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-2" />
            Pesquisa Global
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {/* SEARCH TAB CONTENT */}
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pesquisa Global de Ordens</CardTitle>
                <CardDescription>Busque qualquer ordem no sistema para ver seu histórico completo.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por ID ou endereço..."
                      value={globalSearchTerm}
                      onChange={(e) => setGlobalSearchTerm(e.target.value)}
                      className="pl-9"
                      onKeyDown={(e) => e.key === "Enter" && handleGlobalSearch()}
                    />
                  </div>
                  <Button onClick={handleGlobalSearch} disabled={isSearchingGlobal}>
                    {isSearchingGlobal ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                  </Button>
                </div>

                {globalSearchResults.length > 0 ? (
                  <div className="space-y-4">
                    {globalSearchResults.map((order) => (
                      <div key={order.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-lg">{order.external_id}</span>
                              {getStatusBadge(order.status)}
                              {isPoolException(order) && (
                                <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                                  Exceção de Pool
                                </Badge>
                              )}
                              {order.is_follow_up && (
                                <Badge
                                  variant="outline"
                                  className="border-blue-200 text-blue-700 bg-blue-50 flex items-center gap-1"
                                >
                                  <RotateCcw className="h-3 w-3" /> Follow-up
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-2 space-y-1">
                              <p>
                                <span className="font-medium">Assistente:</span> {order.assistant_name}
                              </p>
                              <p>
                                <span className="font-medium">Tipo:</span> {order.work_type}
                              </p>
                              <p>
                                <span className="font-medium">Endereço:</span>{" "}
                                {order.address || <span className="italic opacity-50">Não informado</span>}
                              </p>
                              <p>
                                <span className="font-medium">Criado em:</span>{" "}
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            <Button variant="outline" size="sm" onClick={() => handleViewHistory(order.id)}>
                              <History className="h-4 w-4 mr-2" />
                              Histórico
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleOpenStatusDialog(order)}>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Forçar status
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleOpenFollowUpDialog(order)}>
                              <Bell className="h-4 w-4 mr-2" />
                              Follow-up tardio
                            </Button>
                            {isPoolException(order) && (
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleApproveException(order.id)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Aprovar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !isSearchingGlobal &&
                  globalSearchTerm && (
                    <div className="text-center py-8 text-muted-foreground">Nenhuma ordem encontrada.</div>
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PENDING & EXCEPTIONS CONTENT */}
          {(activeTab === "pending" || activeTab === "pool_exceptions") && (
            <>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar na lista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {activeTab === "pending" && (
                  <Select value={assistantFilter} onValueChange={setAssistantFilter}>
                    <SelectTrigger className="w-[200px]">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Todos assistentes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos assistentes</SelectItem>
                      {uniqueAssistants.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {activeTab === "pool_exceptions" && selectedExceptionIds.size > 0 && (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleApproveSelectedExceptions}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Aprovar selecionadas ({selectedExceptionIds.size})
                  </Button>
                )}
              </div>

              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : activeTab === "pending" && paginatedOrders.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <>
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>Tudo em dia! Nenhuma ordem pendente de refazer.</p>
                      </>
                    </div>
                  ) : activeTab === "pool_exceptions" && poolExceptionsByAssistant.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <SearchX className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhuma exceção de pool pendente.</p>
                    </div>
                  ) : (
                    <>
                      {activeTab === "pending" && (
                        <div className="divide-y">
                          {paginatedOrders.map((order) => (
                            <div
                              key={order.id}
                              className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg mt-1 bg-blue-100 text-blue-700">
                                  <RefreshCw className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg">{order.externalId}</span>
                                    {getSeverityBadge(order.severity, order.daysSinceRejection)}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {order.assistantName} • {order.workType} • {order.rejectionDate}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(order)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Detalhes
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === "pool_exceptions" && (
                        <div className="space-y-4 p-4">
                          {poolExceptionsByAssistant.map((group) => {
                            const groupSelectedCount = group.orders.filter((order) =>
                              selectedExceptionIds.has(order.followupId),
                            ).length;
                            const isGroupSelected =
                              groupSelectedCount === group.orders.length && group.orders.length > 0;
                            const isGroupIndeterminate =
                              groupSelectedCount > 0 && groupSelectedCount < group.orders.length;

                            return (
                              <Card key={group.assistantId} className="border-border/60 shadow-sm">
                                <CardHeader className="py-4">
                                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-3">
                                      <Checkbox
                                        checked={isGroupSelected ? true : isGroupIndeterminate ? "indeterminate" : false}
                                        onCheckedChange={(checked) =>
                                          handleToggleAssistantExceptions(group.assistantId, checked as boolean)
                                        }
                                      />
                                      <div>
                                        <CardTitle className="text-base">{group.assistantName}</CardTitle>
                                        <CardDescription>
                                          {group.orders.length} exceção(ões) pendente(s)
                                        </CardDescription>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleToggleAssistantExceptions(group.assistantId, true)}
                                    >
                                      Selecionar todas
                                    </Button>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="divide-y">
                                    {group.orders.map((order) => (
                                      <div
                                        key={order.id}
                                        className="py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                                      >
                                        <div className="flex items-start gap-3">
                                          <Checkbox
                                            checked={selectedExceptionIds.has(order.followupId)}
                                            onCheckedChange={(checked) =>
                                              handleToggleException(order.followupId, checked as boolean)
                                            }
                                          />
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-bold text-lg">{order.externalId}</span>
                                              <Badge variant="outline" className="border-amber-500 text-amber-700">
                                                Fora do Pool
                                              </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                              {order.workType} • {order.rejectionDate}
                                            </p>
                                            {order.rejectionReason && (
                                              <p className="text-sm text-amber-600 mt-1 font-medium">
                                                {order.rejectionReason}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <Button
                                          size="sm"
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                          onClick={() => handleApproveException(order.id)}
                                        >
                                          <CheckCircle2 className="h-4 w-4 mr-2" />
                                          Aprovar Exceção
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Ordem</DialogTitle>
            <DialogDescription>ID: {selectedOrder?.externalId}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Motivo da Rejeição</p>
                <p className="text-base mt-1">{selectedOrder.rejectionReason}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Histórico Completo</DialogTitle>
            <DialogDescription>Eventos registrados para esta ordem.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto pr-2">
            {isLoadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : selectedHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhum histórico disponível.</p>
            ) : (
              <div className="relative border-l ml-4 my-2 space-y-6">
                {selectedHistory.map((item, i) => (
                  <div key={item.id || i} className="ml-6 relative">
                    <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border bg-background" />
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                      <span className="font-medium text-sm">
                        Status alterado para: <Badge variant="outline">{item.new_status}</Badge>
                      </span>
                      {item.change_reason && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded mt-1">
                          {item.change_reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forçar mudança de status</DialogTitle>
            <DialogDescription>
              Atualize manualmente o status da ordem {statusTargetOrder?.external_id}. Essa ação ignora o fluxo normal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Status atual: <strong>{statusTargetOrder?.status}</strong> - Novo status:{" "}
              <strong>{forcedStatus}</strong>
            </div>
            <Select value={forcedStatus} onValueChange={setForcedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enviada">Enviada</SelectItem>
                <SelectItem value="aprovada">Aprovada</SelectItem>
                <SelectItem value="rejeitada">Rejeitada</SelectItem>
                <SelectItem value="nao_realizada">Não realizada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="paga">Paga</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleForceStatusChange} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transformar em follow-up tardio</DialogTitle>
            <DialogDescription>
              A ordem {followUpTargetOrder?.external_id} será marcada como follow-up (enviada + audit flag).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyFollowUp} disabled={isApplyingFollowUp}>
              {isApplyingFollowUp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <RejectionReasonsReport
        open={reportOpen}
        onOpenChange={setReportOpen}
        rejectionData={orders.map((o) => ({
          reason: o.rejectionReason,
          orderId: o.id,
          externalId: o.externalId,
          assistantName: o.assistantName,
          date: o.rejectionDate,
        }))}
      />

      <Dialog open={exceptionConfirmOpen} onOpenChange={setExceptionConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{exceptionConfirmLabel || "Aprovar exceção"}</DialogTitle>
            <DialogDescription>
              Isso remove a flag de auditoria e libera a ordem como válida. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Total selecionado: <strong>{exceptionConfirmIds.length}</strong>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExceptionConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmApproveExceptions}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
