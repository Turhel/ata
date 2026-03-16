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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedSkeleton } from "@/components/ui/animated-skeleton";
import { useTeamAssignments } from "@/hooks/useTeamAssignments";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { format, parseISO } from "date-fns";
import { Check, History, RefreshCw, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/apiClient";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

type Batch = Database["public"]["Tables"]["payment_batches"]["Row"];
type BatchItem = Database["public"]["Tables"]["payment_batch_items"]["Row"];

export default function AdminPaymentsHistory() {
  const { user, getToken } = useAuth();
  const { isMaster } = useUserRole();
  const { toast } = useToast();
  const { teams, isLoading: teamsLoading } = useTeamAssignments();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "processing" | "paid">("all");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const assistantIds = useMemo(
    () => teams.flatMap((team) => team.assistants.map((assistant) => assistant.id)),
    [teams],
  );

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let batchItems: BatchItem[] = [];
      let batchList: Batch[] = [];

      if (isMaster) {
        const itemsRes = await apiFetch<{ ok: true; items: BatchItem[] }>(
          { getToken },
          "/api/payments/batch-items"
        );
        batchItems = itemsRes.items || [];

        const batchesRes = await apiFetch<{ ok: true; batches: Batch[] }>(
          { getToken },
          "/api/payments/batches"
        );
        batchList = batchesRes.batches || [];
      } else {
        if (assistantIds.length === 0) {
          setBatches([]);
          setItems([]);
          return;
        }

        const itemsRes = await apiFetch<{ ok: true; items: BatchItem[] }>(
          { getToken },
          `/api/payments/batch-items?assistant_ids=${assistantIds.join(',')}`
        );
        batchItems = itemsRes.items || [];
        const batchIds = Array.from(new Set(batchItems.map((item) => item.batch_id)));

        if (batchIds.length > 0) {
          const batchesRes = await apiFetch<{ ok: true; batches: Batch[] }>(
            { getToken },
            `/api/payments/batches?ids=${batchIds.join(',')}`
          );
          batchList = batchesRes.batches || [];
        }
      }

      setItems(batchItems);
      setBatches(batchList);
    } catch (error) {
      console.error("Error loading batch history:", error);
      toast({ title: "Erro", description: "Falha ao carregar historico.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, isMaster, assistantIds, getToken, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const batchSummaries = useMemo(() => {
    const grouped: Record<string, { total: number; count: number }> = {};
    items.forEach((item) => {
      if (!grouped[item.batch_id]) grouped[item.batch_id] = { total: 0, count: 0 };
      grouped[item.batch_id].total += Number(item.amount) || 0;
      grouped[item.batch_id].count += 1;
    });
    return grouped;
  }, [items]);

  const filteredBatches = useMemo(() => {
    if (statusFilter === "all") return batches;
    return batches.filter((batch) => batch.status === statusFilter);
  }, [batches, statusFilter]);

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) || null,
    [batches, selectedBatchId],
  );

  const selectedItems = useMemo(
    () => items.filter((item) => item.batch_id === selectedBatchId),
    [items, selectedBatchId],
  );

  const handleMarkPaid = async (batchId: string) => {
    if (!user) return;
    try {
      await apiFetch<{ ok: true; batch: Batch }>(
        { getToken },
        `/api/payments/batches/${batchId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "paid",
            paid_at: new Date().toISOString(),
            paid_by: user.id,
          }),
        }
      );

      toast({ title: "Lote marcado como pago" });
      loadData();
    } catch (error) {
      console.error("Error updating batch:", error);
      toast({ title: "Erro", description: "Nao foi possivel atualizar o lote.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <Button variant="link" size="sm" asChild className="px-0 text-muted-foreground hover:text-primary mb-1 h-auto">
            <Link to="/admin/payments" className="flex items-center gap-1">
              Voltar para pagamentos
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-slate-500" />
            Historico de Lotes
          </h1>
          <p className="text-muted-foreground">Visualize e marque lotes como pagos.</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-border/60">
        <CardHeader>
          <CardTitle>Lotes</CardTitle>
          <CardDescription>Lista de lotes fechados pela administracao.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || teamsLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <AnimatedSkeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">Historico vazio</p>
              <p className="text-sm">Os lotes fechados aparecerao aqui.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ordens</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                    <TableHead className="text-right">Acao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch) => {
                    const summary = batchSummaries[batch.id] || { total: 0, count: 0 };
                    return (
                      <TableRow key={batch.id}>
                        <TableCell>
                          {format(parseISO(batch.period_start), "dd/MM")} - {format(parseISO(batch.period_end), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={batch.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}
                          >
                            {batch.status === "paid" ? "Pago" : "Processando"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{summary.count}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(summary.total)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedBatchId(batch.id)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          {batch.status !== "paid" && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkPaid(batch.id)}>
                              <Check className="h-4 w-4 mr-1" />
                              Marcar Pago
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedBatchId} onOpenChange={() => setSelectedBatchId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Lote</DialogTitle>
            <DialogDescription>
              {selectedBatch
                ? `${format(parseISO(selectedBatch.period_start), "dd/MM")} - ${format(parseISO(selectedBatch.period_end), "dd/MM/yyyy")}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordem</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.external_id || "-"}</TableCell>
                  <TableCell>{item.work_type || "-"}</TableCell>
                  <TableCell>{item.category || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.amount) || 0)}</TableCell>
                </TableRow>
              ))}
              {selectedItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma ordem registrada neste lote.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-bold text-emerald-600">
              {formatCurrency(selectedItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0))}
            </span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBatchId(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
