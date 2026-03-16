import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatedSkeleton } from "@/components/ui/animated-skeleton";
import { useTeamAssignments } from "@/hooks/useTeamAssignments";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { apiFetch } from "@/lib/apiClient";
import { endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { AlertTriangle, CheckCircle2, ClipboardCheck, History, Lock, RefreshCw, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OpenOrder = Pick<
  Order,
  "id" | "assistant_id" | "external_id" | "work_type" | "category" | "created_at" | "status"
>;
type Batch = Database["public"]["Tables"]["payment_batches"]["Row"];
type BatchWithMeta = Batch & {
  raw_status?: "partial" | "closed" | "paid" | string;
  order_count?: number;
  total_assistant_value?: number;
  total_inspector_value?: number;
  closed_at?: string | null;
  closed_by?: string | null;
};

export default function AdminPayments() {
  const { user, getToken } = useAuth();
  const { toast } = useToast();
  const { teams, isLoading: teamsLoading } = useTeamAssignments();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [openOrders, setOpenOrders] = useState<(OpenOrder & { amount?: number | null })[]>([]);
  const [blockers, setBlockers] = useState<{ id: string; assistant_id: string | null; external_id: string; status: string }[]>([]);
  const [existingBatch, setExistingBatch] = useState<BatchWithMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"all" | "selected">("all");
  const [selectedAssistants, setSelectedAssistants] = useState<Set<string>>(new Set());

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 0 }), [selectedDate]);
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 0 }), [selectedDate]);

  const assistantList = useMemo(
    () => teams.flatMap((team) => team.assistants.map((assistant) => ({ id: assistant.id, name: assistant.name }))),
    [teams],
  );

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        const assistantIds = assistantList.map((assistant) => assistant.id);
        if (assistantIds.length === 0) {
          setOpenOrders([]);
          setBlockers([]);
          setExistingBatch(null);
          return;
        }

        const batchRes = await apiFetch<{ ok: true; batches: BatchWithMeta[] }>(
          { getToken },
          `/api/payments/batches?period_start=${format(weekStart, "yyyy-MM-dd")}&period_end=${format(weekEnd, "yyyy-MM-dd")}`,
          { bypassFreeze: true }
        );
        const batchData = batchRes.batches?.[0] ?? null;

        setExistingBatch(batchData || null);

        const weekQs = new URLSearchParams();
        weekQs.set("assistant_ids", assistantIds.join(","));
        weekQs.set("created_from", format(weekStart, "yyyy-MM-dd"));
        weekQs.set("created_to", format(weekEnd, "yyyy-MM-dd") + "T23:59:59");
        const summaryRes = await apiFetch<{
          ok: true;
          approvedOrders: (OpenOrder & { amount?: number | null })[];
          blockers: { id: string; assistant_id: string | null; external_id: string; status: string }[];
        }>({ getToken }, `/api/payments/week-summary?${weekQs.toString()}`, { bypassFreeze: true });

        const approvedOrders = summaryRes.approvedOrders || [];

        const orderIds = (approvedOrders || []).map((order) => order.id);
        let batchedIds = new Set<string>();
        if (orderIds.length > 0) {
          const itemsRes = await apiFetch<{ ok: true; items: { order_id: string }[] }>(
            { getToken },
            `/api/payments/batch-items?order_ids=${orderIds.join(",")}`,
            { bypassFreeze: true }
          );
          const batchItems = itemsRes.items;
          batchedIds = new Set((batchItems || []).map((item) => item.order_id));
        }

        const remainingOrders = (approvedOrders || []).filter((order) => !batchedIds.has(order.id));
        setOpenOrders(remainingOrders);

        setBlockers(summaryRes.blockers || []);
      } catch (error) {
        console.error("Error loading payment data:", error);
        toast({ title: "Erro", description: "Falha ao carregar dados de pagamento.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
  }, [user, getToken, assistantList, weekStart, weekEnd, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const assistantSummary = useMemo(() => {
    const summary = new Map<string, { name: string; total: number; count: number }>();
    assistantList.forEach((assistant) => {
      summary.set(assistant.id, { name: assistant.name, total: 0, count: 0 });
    });

    openOrders.forEach((order) => {
      if (!order.assistant_id) return;
      const value = Number(order.amount ?? 0) || 0;
      const entry = summary.get(order.assistant_id) || { name: "Assistente", total: 0, count: 0 };
      entry.total += value;
      entry.count += 1;
      summary.set(order.assistant_id, entry);
    });

    return Array.from(summary.entries()).map(([id, data]) => ({
      assistantId: id,
      ...data,
    }));
  }, [assistantList, openOrders]);

  const activeAssistantIds = useMemo(() => {
    if (selectionMode === "all") {
      return assistantList.map((assistant) => assistant.id);
    }
    return Array.from(selectedAssistants);
  }, [assistantList, selectedAssistants, selectionMode]);

  const activeOpenOrders = useMemo(
    () => openOrders.filter((order) => order.assistant_id && activeAssistantIds.includes(order.assistant_id)),
    [openOrders, activeAssistantIds],
  );

  const activeBlockers = useMemo(
    () => blockers.filter((order) => order.assistant_id && activeAssistantIds.includes(order.assistant_id)),
    [blockers, activeAssistantIds],
  );

  const activeSummary = useMemo(() => {
    const summary = new Map<string, { name: string; total: number; count: number }>();
    assistantList.forEach((assistant) => {
      summary.set(assistant.id, { name: assistant.name, total: 0, count: 0 });
    });

    activeOpenOrders.forEach((order) => {
      if (!order.assistant_id) return;
      const value = Number(order.amount ?? 0) || 0;
      const entry = summary.get(order.assistant_id) || { name: "Assistente", total: 0, count: 0 };
      entry.total += value;
      entry.count += 1;
      summary.set(order.assistant_id, entry);
    });

    return Array.from(summary.entries()).map(([id, data]) => ({
      assistantId: id,
      ...data,
    }));
  }, [assistantList, activeOpenOrders]);

  const openTotals = useMemo(() => {
    const totalValue = activeSummary.reduce((acc, item) => acc + item.total, 0);
    const totalOrders = activeSummary.reduce((acc, item) => acc + item.count, 0);
    return { totalValue, totalOrders };
  }, [activeSummary]);

  const handleCloseBatch = async () => {
    if (!user) return;
    setIsClosing(true);
    try {
      const batchLocked =
        !!existingBatch &&
        (existingBatch.status === "paid" ||
          existingBatch.raw_status === "paid" ||
          existingBatch.raw_status === "closed" ||
          !!existingBatch.closed_at);

      if (batchLocked) {
        toast({
          title: "Lote bloqueado",
          description: "Este lote já foi fechado/pago e não pode ser modificado.",
          variant: "destructive",
        });
        return;
      }

      const batchRes = await apiFetch<{ ok: true; batch: BatchWithMeta }>(
        { getToken },
        "/api/payments/batches",
        {
          method: "POST",
          body: JSON.stringify({
            period_start: format(weekStart, "yyyy-MM-dd"),
            period_end: format(weekEnd, "yyyy-MM-dd"),
            status: "processing",
            total_value: openTotals.totalValue,
          }),
        }
      );
      const batch = batchRes.batch;
      const isUpdating = !!existingBatch && existingBatch.id === batch.id;

      if (activeOpenOrders.length > 0) {
        const itemsPayload = activeOpenOrders.map((order) => {
          return {
            batch_id: batch.id,
            order_id: order.id,
            assistant_id: order.assistant_id,
            amount: Number(order.amount ?? 0) || 0,
            category: order.category,
            work_type: order.work_type,
            external_id: order.external_id,
          };
        });

        await apiFetch<{ ok: true; items: any[] }>(
          { getToken },
          "/api/payments/batch-items",
          { method: "POST", body: JSON.stringify({ items: itemsPayload }) }
        );
      }

      toast({
        title: isUpdating ? "Lote atualizado" : "Lote criado",
        description:
          activeOpenOrders.length > 0
            ? "As ordens aprovadas foram adicionadas ao lote semanal."
            : "Nenhuma ordem nova para adicionar ao lote.",
      });

      setConfirmOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error closing batch:", error);
      toast({ title: "Erro", description: "Falha ao fechar lote.", variant: "destructive" });
    } finally {
      setIsClosing(false);
    }
  };

  const blockersCount = activeBlockers.length;
  const noSelection = selectionMode === "selected" && activeAssistantIds.length === 0;
  const batchLocked =
    !!existingBatch &&
    (existingBatch.status === "paid" ||
      existingBatch.raw_status === "paid" ||
      existingBatch.raw_status === "closed" ||
      !!existingBatch.closed_at);
  const noOrdersToClose = activeOpenOrders.length === 0;
  const closeDisabled =
    blockersCount > 0 || isLoading || teamsLoading || batchLocked || isClosing || noSelection || noOrdersToClose;
  const selectedCount = selectionMode === "selected" ? activeAssistantIds.length : assistantList.length;
  const disabledReason = (() => {
    if (isLoading || teamsLoading) return "Carregando dados";
    if (batchLocked) {
      return existingBatch?.status === "paid" || existingBatch?.raw_status === "paid"
        ? "Lote já pago"
        : "Lote já fechado";
    }
    if (blockersCount > 0) return `${blockersCount} ordens em enviada/em_analise`;
    if (noSelection) return "Selecione pelo menos um assistente";
    if (noOrdersToClose) return "Nenhuma ordem aprovada para fechar";
    return "";
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-emerald-600" />
            Pagamentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Feche lotes semanais e acompanhe o saldo aberto da equipe.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/payments/history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </Link>
          </Button>
          <Input
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              setSelectedDate(parseISO(value));
            }}
            className="w-[160px]"
          />
          <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Semana Selecionada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {format(weekStart, "dd/MM")} - {format(weekEnd, "dd/MM/yyyy")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Domingo a Sabado</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo em Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || teamsLoading ? (
              <AnimatedSkeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(openTotals.totalValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">{openTotals.totalOrders} ordens aprovadas</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Checklist de Bloqueios</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || teamsLoading ? (
              <AnimatedSkeleton className="h-8 w-24" />
            ) : blockersCount > 0 ? (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{blockersCount} ordens ainda em enviada/em_analise</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Tudo pronto para fechar</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {existingBatch && (
        <Card className={batchLocked ? "border-rose-200 bg-rose-50/50" : "border-sky-200 bg-sky-50/50"}>
          <CardHeader className="pb-2">
            <CardTitle className={batchLocked ? "text-sm text-rose-800" : "text-sm text-sky-800"}>
              {batchLocked ? "Lote bloqueado" : "Lote existente"}
            </CardTitle>
            <CardDescription>
              {format(parseISO(existingBatch.period_start), "dd/MM")} - {format(parseISO(existingBatch.period_end), "dd/MM/yyyy")}
              {existingBatch.order_count != null ? ` • ${existingBatch.order_count} ordens` : ""}
              {!batchLocked && !noOrdersToClose ? " • você pode adicionar ordens restantes." : ""}
              {!batchLocked && noOrdersToClose ? " • nenhuma ordem restante para adicionar." : ""}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="bg-card/50 backdrop-blur-sm border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Assistentes</CardTitle>
            <CardDescription>Resumo do aberto por assistente na semana.</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant={selectionMode === "all" ? "default" : "outline"}
                onClick={() => {
                  setSelectionMode("all");
                  setSelectedAssistants(new Set());
                }}
              >
                Todos
              </Button>
              <Button
                variant={selectionMode === "selected" ? "default" : "outline"}
                onClick={() => setSelectionMode("selected")}
              >
                Selecionados
              </Button>
              <Badge variant="outline" className="text-xs">
                {selectedCount} selecionado(s)
              </Badge>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setConfirmOpen(true)}
                disabled={closeDisabled}
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                {existingBatch ? "Atualizar Lote da Semana" : "Fechar Lote da Semana"}
              </Button>
            </div>
            {noSelection && (
              <span className="text-xs text-amber-600">Selecione pelo menos um assistente para fechar.</span>
            )}
            {closeDisabled && !noSelection && disabledReason && (
              <span className="text-xs text-muted-foreground">Bloqueado: {disabledReason}</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || teamsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <AnimatedSkeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : assistantSummary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum assistente na equipe.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {selectionMode === "selected" && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedAssistants.size === assistantSummary.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAssistants(new Set(assistantSummary.map((item) => item.assistantId)));
                          } else {
                            setSelectedAssistants(new Set());
                          }
                        }}
                      />
                    </TableHead>
                  )}
                  <TableHead>Assistente</TableHead>
                  <TableHead className="text-right">Ordens</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assistantSummary.map((row) => (
                  <TableRow key={row.assistantId}>
                    {selectionMode === "selected" && (
                      <TableCell>
                        <Checkbox
                          checked={selectedAssistants.has(row.assistantId)}
                          onCheckedChange={(checked) => {
                            setSelectedAssistants((prev) => {
                              const next = new Set(prev);
                              if (checked) {
                                next.add(row.assistantId);
                              } else {
                                next.delete(row.assistantId);
                              }
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{existingBatch ? "Confirmar Atualização" : "Confirmar Fechamento"}</DialogTitle>
            <DialogDescription>
              Semana: {format(weekStart, "dd/MM")} - {format(weekEnd, "dd/MM/yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total de ordens</span>
              <span className="font-medium">{openTotals.totalOrders}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total do lote</span>
              <span className="font-bold text-emerald-600">{formatCurrency(openTotals.totalValue)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCloseBatch} disabled={closeDisabled}>
              <Lock className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
