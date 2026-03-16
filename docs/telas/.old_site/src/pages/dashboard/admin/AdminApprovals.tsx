import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AnimatedSkeleton } from "@/components/ui/animated-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search,
  CheckCircle2,
  XCircle,
  FileX,
  RefreshCw,
  Eye,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CalendarDays,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useTeamOrders } from "@/hooks/useTeamOrders";
import { useDuplicateRequests } from "@/hooks/useDuplicateRequests";
import { format, differenceInHours, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { FOLLOW_UP_REASONS, REJECTION_REASONS } from "@/lib/rejection-reasons";
import { DuplicateRequestsSection } from "@/components/orders/DuplicateRequestsSection";
import { OrderDetailsDrawer } from "@/components/orders/OrderDetailsDrawer";
import type { Database } from "@/integrations/supabase/types";
import { useSearchParams } from "react-router-dom";

type OrderWithDetails = Database["public"]["Tables"]["orders"]["Row"] & {
  profiles?: {
    full_name: string;
  } | null;
  inspectors?: {
    name: string;
    code: string;
  } | null;
};

export default function AdminApprovals() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const [openAssistants, setOpenAssistants] = useState<Record<string, boolean>>({});
  const [openDates, setOpenDates] = useState<Record<string, boolean>>({});
  // Dialog States
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpReasonSelect, setFollowUpReasonSelect] = useState("");
  const [followUpReasonCustom, setFollowUpReasonCustom] = useState("");
  const [followUpIlisCorrectPercent, setFollowUpIlisCorrectPercent] = useState("");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReasonSelect, setRejectReasonSelect] = useState("");
  const [rejectReasonCustom, setRejectReasonCustom] = useState("");

  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);

  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<OrderWithDetails | null>(null);

  const { pendingRequests } = useDuplicateRequests();
  const { orders, isLoading, updateOrderStatus, confirmAuditVerification, refetch, followupCounts } = useTeamOrders();

  useEffect(() => {
    const assistantId = searchParams.get("assistant");
    if (assistantId) {
      setSearchTerm(assistantId);
    }
  }, [searchParams]);

  const filteredOrders = useMemo(() => {
    // Filtro inicial - EXCLUIR ordens sem assistente
    return orders.filter((order) => {
      if (!order.assistant_id) return false;
      const assistantName = order.profiles?.full_name || "Desconhecido";

      const matchesSearch =
        order.external_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assistantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.assistant_id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [orders, searchTerm]);

  // Agrupamento por Assistente -> Data
  const groupedOrders = useMemo(() => {
    const grouped: Record<
      string,
      {
        name: string;
        dates: Record<string, OrderWithDetails[]>;
      }
    > = {};

    // Agrupamento
    filteredOrders.forEach((order) => {
      const assistantId = order.assistant_id!;
      const assistantName = order.profiles?.full_name || "Desconhecido";
      const dateKey = order.created_at ? format(parseISO(order.created_at), "yyyy-MM-dd") : "unknown";

      if (!grouped[assistantId]) {
        grouped[assistantId] = { name: assistantName, dates: {} };
      }

      if (!grouped[assistantId].dates[dateKey]) {
        grouped[assistantId].dates[dateKey] = [];
      }

      grouped[assistantId].dates[dateKey].push(order);
    });

    return grouped;
  }, [filteredOrders]);

  // Expandir/Recolher Card do Assistente
  const toggleAssistantCard = (assistantId: string) => {
    setOpenAssistants((prev) => ({
      ...prev,
      [assistantId]: !prev[assistantId],
    }));
  };

  // Expandir/Recolher Grupo de Data
  const toggleDateGroup = (dateKey: string) => {
    setOpenDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };
  const handleViewOrderDetails = (order: OrderWithDetails, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrderForDetails(order);
    setDetailsDrawerOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Seleciona todas as ordens visíveis
      const allIds: string[] = [];
      Object.values(groupedOrders).forEach((group) => {
        Object.values(group.dates).forEach((dateOrders) => {
          dateOrders.forEach((o) => allIds.push(o.id));
        });
      });
      setSelectedOrders(new Set(allIds));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectAssistantGroup = (assistantId: string, checked: boolean) => {
    const groupDates = groupedOrders[assistantId]?.dates || {};
    const newSelected = new Set(selectedOrders);

    Object.values(groupDates)
      .flat()
      .forEach((order) => {
        if (checked) {
          newSelected.add(order.id);
        } else {
          newSelected.delete(order.id);
        }
      });

    setSelectedOrders(newSelected);
  };

  const handleSelectDateGroup = (ordersInDate: OrderWithDetails[], checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    ordersInDate.forEach((order) => {
      if (checked) newSelected.add(order.id);
      else newSelected.delete(order.id);
    });
    setSelectedOrders(newSelected);
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleBatchApprove = async () => {
    try {
      await updateOrderStatus([...selectedOrders], "aprovada");
      toast({
        title: "Ordens aprovadas",
        description: `${selectedOrders.size} ordens foram aprovadas com sucesso.`,
      });
      setSelectedOrders(new Set());
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao aprovar.", variant: "destructive" });
    }
  };

  const handleBatchFollowUp = () => setFollowUpDialogOpen(true);

  const confirmFollowUp = async () => {
    const normalizePercent = (raw: string) => String(raw || "").trim().replace(",", ".");

    const baseReason =
      followUpReasonSelect === "outro"
        ? followUpReasonCustom
        : FOLLOW_UP_REASONS.find((r) => r.value === followUpReasonSelect)?.label || followUpReasonSelect;
    if (!baseReason.trim()) {
      toast({ title: "Motivo obrigatório", description: "Informe o motivo.", variant: "destructive" });
      return;
    }

    if (followUpReasonSelect === "ilis_incorreta") {
      const normalized = normalizePercent(followUpIlisCorrectPercent);
      const n = Number(normalized);
      if (!normalized || !Number.isFinite(n)) {
        toast({
          title: "ILIS invÃ¡lido",
          description: "Informe a porcentagem ILIS correta (ex: 35 ou 35.5).",
          variant: "destructive",
        });
        return;
      }
      if (n < 0 || n > 100) {
        toast({
          title: "ILIS invÃ¡lido",
          description: "A porcentagem ILIS deve estar entre 0 e 100.",
          variant: "destructive",
        });
        return;
      }
    }

    const finalReason =
      followUpReasonSelect === "ilis_incorreta"
        ? `${baseReason} (correto: ${normalizePercent(followUpIlisCorrectPercent)}%)`
        : baseReason;

    try {
      await updateOrderStatus([...selectedOrders], "enviada", { reason: finalReason, auditFlag: true });
      toast({ title: "Follow-up enviado", description: "Ordens marcadas para retrabalho." });
      setSelectedOrders(new Set());
      setFollowUpDialogOpen(false);
      setFollowUpReasonSelect("");
      setFollowUpReasonCustom("");
      setFollowUpIlisCorrectPercent("");
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao enviar follow-up.", variant: "destructive" });
    }
  };

  const handleBatchReject = () => setRejectDialogOpen(true);

  const confirmReject = async () => {
    const reason =
      rejectReasonSelect === "outro"
        ? rejectReasonCustom
        : REJECTION_REASONS.find((r) => r.value === rejectReasonSelect)?.label || rejectReasonSelect;
    if (!reason.trim()) {
      toast({ title: "Motivo obrigatório", description: "Informe o motivo.", variant: "destructive" });
      return;
    }
    try {
      await updateOrderStatus([...selectedOrders], "rejeitada", { reason, returnToPool: true });
      toast({ title: "Ordens rejeitadas", description: "Retornaram ao pool.", variant: "destructive" });
      setSelectedOrders(new Set());
      setRejectDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao rejeitar.", variant: "destructive" });
    }
  };

  const handleCorrection = () => setCorrectionDialogOpen(true);

  const confirmCorrection = async () => {
    try {
      await updateOrderStatus([...selectedOrders], "enviada");
      toast({ title: "Correção aplicada", description: "Status revertido para Enviada." });
      setSelectedOrders(new Set());
      setCorrectionDialogOpen(false);
    } catch (error) {
      toast({ title: "Erro", description: "Falha na correção.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      aprovada: "bg-emerald-100 text-emerald-700 border-emerald-200",
      enviada: "bg-sky-100 text-sky-700 border-sky-200",
      pendente: "bg-slate-100 text-slate-700 border-slate-200",
      em_analise: "bg-amber-100 text-amber-700 border-amber-200",
      rejeitada: "bg-rose-100 text-rose-700 border-rose-200",
      cancelada: "bg-slate-100 text-slate-500 border-slate-200",
      nao_realizada: "bg-orange-100 text-orange-700 border-orange-200",
    };
    const labels: Record<string, string> = {
      aprovada: "Aprovada",
      enviada: "Enviada",
      pendente: "Pendente",
      em_analise: "Em Análise",
      rejeitada: "Rejeitada",
      cancelada: "Cancelada",
      nao_realizada: "Não Realizada",
    };
    return (
      <Badge variant="outline" className={styles[status || "pendente"]}>
        {labels[status || "pendente"] || status}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string | null) => {
    const styles: Record<string, string> = {
      regular: "bg-blue-50 text-blue-700 border-blue-200",
      exterior: "bg-green-50 text-green-700 border-green-200",
      interior: "bg-purple-50 text-purple-700 border-purple-200",
      fint: "bg-amber-50 text-amber-700 border-amber-200",
    };
    return (
      <Badge variant="outline" className={`font-normal ${styles[category?.toLowerCase() || "regular"]}`}>
        {category || "Regular"}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(parseISO(dateString), "dd/MM/yyyy");
    } catch {
      return dateString;
    }
  };

  const isOrderLate = (dateString: string | null) => {
    if (!dateString) return false;
    try {
      const hours = differenceInHours(new Date(), new Date(dateString));
      return hours > 24;
    } catch {
      return false;
    }
  };

  const selectedCount = selectedOrders.size;
  const hasApprovedSelected = [...selectedOrders].some((id) => orders.find((o) => o.id === id)?.status === "aprovada");

  const statusCounts = useMemo(() => {
    const counts = {
      enviada: 0,
      em_analise: 0,
      follow_up: 0,
      total: filteredOrders.length,
    };
    filteredOrders.forEach((order) => {
      if (order.status === "enviada") counts.enviada += 1;
      if (order.status === "em_analise") counts.em_analise += 1;
      if (order.status === "enviada") counts.follow_up += 0;
    });
    counts.follow_up = followupCounts.correction;
    return counts;
  }, [filteredOrders, followupCounts]);

  const handleConfirmVerification = async () => {
    try {
      await confirmAuditVerification([...selectedOrders]);
      toast({ title: "Verificação confirmada", description: "Marcadores de auditoria removidos." });
      setSelectedOrders(new Set());
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao verificar.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Aprovação de Ordens</h1>
        <p className="text-muted-foreground">Aprove ou rejeite ordens agrupadas por assistente e data.</p>
      </div>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">Ordens</TabsTrigger>
          <TabsTrigger value="duplicates" className="relative">
            Duplicatas
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          {/* Filters & Actions Header */}
          <div className="flex flex-col gap-4 sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 -mx-4 px-4 border-b">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex gap-4 flex-1 w-full md:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Global Actions */}
              {selectedCount > 0 && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-right-5">
                  <Button
                    size="sm"
                    onClick={handleBatchApprove}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Aprovar ({selectedCount})
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleBatchFollowUp}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Follow-up
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleBatchReject}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                Enviadas: {statusCounts.enviada}
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Em analise: {statusCounts.em_analise}
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Follow-up: {statusCounts.follow_up}
              </Badge>
              <Badge variant="outline">Total: {statusCounts.total}</Badge>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <AnimatedSkeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          )}

          {/* Assistant Groups */}
          {!isLoading && Object.keys(groupedOrders).length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileX className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">Tudo limpo!</p>
              <p className="text-sm">Nenhuma ordem encontrada com os filtros atuais.</p>
            </div>
          )}

          {!isLoading &&
            Object.entries(groupedOrders).map(([assistantId, group], index) => {
              // Count total orders for assistant
              const totalAssistantOrders = Object.values(group.dates).flat().length;
              const assistantSelectedCount = Object.values(group.dates)
                .flat()
                .filter((o) => selectedOrders.has(o.id)).length;

              const isGroupSelected = assistantSelectedCount === totalAssistantOrders && totalAssistantOrders > 0;
              const isGroupIndeterminate = assistantSelectedCount > 0 && !isGroupSelected;

              // Cards iniciam FECHADOS por padrão
              const isOpen = openAssistants[assistantId] ?? false;

              // Cores diferentes para cada assistente
              const cardColors = [
                "border-l-sky-500 bg-sky-500/5",
                "border-l-emerald-500 bg-emerald-500/5",
                "border-l-violet-500 bg-violet-500/5",
                "border-l-amber-500 bg-amber-500/5",
                "border-l-rose-500 bg-rose-500/5",
                "border-l-teal-500 bg-teal-500/5",
                "border-l-indigo-500 bg-indigo-500/5",
                "border-l-orange-500 bg-orange-500/5",
              ];
              const cardColor = cardColors[index % cardColors.length];

              return (
                <Collapsible key={assistantId} open={isOpen} onOpenChange={() => toggleAssistantCard(assistantId)}>
                  <Card className={`border-l-4 shadow-sm hover:shadow-md transition-all mb-4 ${cardColor}`}>
                    <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={isGroupSelected || isGroupIndeterminate}
                          onCheckedChange={(checked) => handleSelectAssistantGroup(assistantId, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-3 cursor-pointer select-none">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {group.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-medium text-sm text-foreground">{group.name}</h3>
                              <p className="text-xs text-muted-foreground">{totalAssistantOrders} ordens totais</p>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent>
                      <CardContent className="p-0">
                        {/* DATE GROUPS */}
                        {Object.entries(group.dates)
                          .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()) // Sort dates desc
                          .map(([dateKey, dateOrders]) => {
                            const isDateSelected = dateOrders.every((o) => selectedOrders.has(o.id));
                            const isDateIndeterminate =
                              dateOrders.some((o) => selectedOrders.has(o.id)) && !isDateSelected;
                            
                            // Datas também iniciam fechadas
                            const dateGroupKey = `${assistantId}_${dateKey}`;
                            const isDateOpen = openDates[dateGroupKey] ?? false;

                            return (
                              <Collapsible key={dateKey} open={isDateOpen} onOpenChange={() => toggleDateGroup(dateGroupKey)}>
                                <div className="border-b last:border-0">
                                  {/* Date Header */}
                                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-900/30">
                                    <Checkbox
                                      checked={isDateSelected || isDateIndeterminate}
                                      onCheckedChange={(checked) => handleSelectDateGroup(dateOrders, checked as boolean)}
                                      className="h-3.5 w-3.5"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <CollapsibleTrigger asChild>
                                      <div className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 -my-1 py-1 -mx-2 px-2 rounded transition-colors">
                                        <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                          {dateKey === "unknown"
                                            ? "Data desconhecida"
                                            : format(parseISO(dateKey), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                        </span>
                                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                                          {dateOrders.length}
                                        </span>
                                        {isDateOpen ? (
                                          <ChevronUp className="h-3 w-3 text-slate-400 ml-auto" />
                                        ) : (
                                          <ChevronDown className="h-3 w-3 text-slate-400 ml-auto" />
                                        )}
                                      </div>
                                    </CollapsibleTrigger>
                                  </div>

                                  {/* Orders Rows */}
                                  <CollapsibleContent>
                                    <div className="divide-y">
                                      {dateOrders.map((order) => {
                                        const isLate = order.status === "enviada" && isOrderLate(order.created_at);

                                        return (
                                          <div
                                            key={order.id}
                                            className={`flex items-center gap-4 p-3 pl-8 hover:bg-muted/40 transition-colors min-w-[700px] cursor-pointer ${
                                              selectedOrders.has(order.id) ? "bg-primary/5" : ""
                                            }`}
                                            onClick={() => handleSelectOrder(order.id, !selectedOrders.has(order.id))}
                                          >
                                            <div className="w-8 flex justify-center">
                                              <Checkbox
                                                checked={selectedOrders.has(order.id)}
                                                onCheckedChange={(checked) =>
                                                  handleSelectOrder(order.id, checked as boolean)
                                                }
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                            </div>

                                            <div className="w-24 font-mono text-sm font-medium flex items-center gap-1">
                                              {order.external_id}
                                              {isLate && <Clock className="h-3 w-3 text-rose-500 animate-pulse" />}
                                            </div>

                                            <div className="w-20 text-xs">{order.work_type}</div>
                                            <div className="w-24">{getCategoryBadge(order.category)}</div>

                                            <div className="w-28 text-xs text-muted-foreground truncate">
                                              {order.inspectors?.code || "-"}
                                            </div>

                                            <div className="w-32 flex items-center gap-1 ml-auto mr-4">
                                              {getStatusBadge(order.status)}
                                              {(order.status === "rejeitada" || order.status === "nao_realizada") && (
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger>
                                                      <MessageSquare className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <p className="text-xs">
                                                        {order.not_done_reason || order.audit_reason}
                                                      </p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              )}
                                            </div>

                                            <div className="flex-shrink-0">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                onClick={(e) => handleViewOrderDetails(order as OrderWithDetails, e)}
                                              >
                                                <Eye className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            );
                          })}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
        </TabsContent>

        <TabsContent value="duplicates">
          <DuplicateRequestsSection />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Follow-up (Retorno)</DialogTitle>
            <DialogDescription>A ordem voltará para correção.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={followUpReasonSelect} onValueChange={setFollowUpReasonSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {followUpReasonSelect === "ilis_incorreta" && (
              <div className="space-y-2">
                <Label>ILIS correto (%)</Label>
                <Input
                  value={followUpIlisCorrectPercent}
                  onChange={(e) => setFollowUpIlisCorrectPercent(e.target.value)}
                  placeholder="Ex: 35"
                  inputMode="decimal"
                />
                <p className="text-xs text-muted-foreground">
                  Esse valor aparece para o assistente junto do motivo do follow-up.
                </p>
              </div>
            )}
            {followUpReasonSelect === "outro" && (
              <Textarea
                placeholder="Descreva..."
                value={followUpReasonCustom}
                onChange={(e) => setFollowUpReasonCustom(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmFollowUp}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Rejeitar</DialogTitle>
            <DialogDescription>A ordem será cancelada e liberada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={rejectReasonSelect} onValueChange={setRejectReasonSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {rejectReasonSelect === "outro" && (
              <Textarea
                placeholder="Descreva..."
                value={rejectReasonCustom}
                onChange={(e) => setRejectReasonCustom(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={correctionDialogOpen} onOpenChange={setCorrectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corrigir Status</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmCorrection}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrderDetailsDrawer
        open={detailsDrawerOpen}
        onOpenChange={setDetailsDrawerOpen}
        order={selectedOrderForDetails}
      />
    </div>
  );
}
