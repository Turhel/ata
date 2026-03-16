import { useEffect, useMemo, useState } from "react";
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
import { AnimatedSkeleton } from "@/components/ui/animated-skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfiles";
import { usePaymentsInvoiceExport } from "@/hooks/usePaymentsInvoiceExport";
import { useToast } from "@/hooks/use-toast";
import { useWorkTypes } from "@/hooks/useWorkTypes";
import { format, parseISO } from "date-fns";
import { Download, History, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { useQuery } from "@tanstack/react-query";

type Batch = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  total_value: number | string | null;
  order_count?: number | string | null;
  created_at?: string | null;
  paid_at?: string | null;
};

type BatchItem = {
  id: string;
  batch_id: string;
  order_id: string;
  external_id: string | null;
  work_type: string | null;
  category?: string | null;
  amount: number | string | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const getStatusBadge = (status: string) => {
  if (status === "paid") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
};

export default function MyPayments() {
  const { user, getToken } = useAuth();
  const { profile } = useProfile();
	const { toast } = useToast();
  const { exportToPDF, exportToExcel } = usePaymentsInvoiceExport();
  const { workTypes } = useWorkTypes();

	const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const workTypeCategoryByCode = useMemo(() => {
    const map: Record<string, string> = {};
    (workTypes || []).forEach((wt) => {
      if (wt?.active === false) return;
      const code = String(wt?.code || "").toUpperCase().trim();
      if (!code) return;
      if (wt.category) map[code] = String(wt.category);
    });
    return map;
  }, [workTypes]);

  const batchesQuery = useQuery({
    queryKey: ["payments", "batches", user?.id ?? null],
    enabled: !!user,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const res = await apiFetch<{ ok: true; batches: Batch[] }>({ getToken }, "/api/payments/batches");
      return res.batches || [];
    },
  });

  const openBalanceQuery = useQuery({
    queryKey: ["payments", "open-balance", user?.id ?? null],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await apiFetch<{ ok: true; count: number; total: number }>(
        { getToken },
        "/api/payments/open-balance",
      );
      return { count: Number(res.count ?? 0) || 0, total: Number(res.total ?? 0) || 0 };
    },
  });

  const selectedBatch = useMemo(() => {
    const batches = batchesQuery.data || [];
    return batches.find((batch) => batch.id === selectedBatchId) || null;
  }, [batchesQuery.data, selectedBatchId]);

  const batchItemsQuery = useQuery({
    queryKey: ["payments", "batch-items", selectedBatchId ?? null, user?.id ?? null],
    enabled: !!user && !!selectedBatchId,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const res = await apiFetch<{ ok: true; items: BatchItem[] }>(
        { getToken },
        `/api/payments/batch-items?batch_id=${encodeURIComponent(String(selectedBatchId))}`,
      );
      const items = res.items || [];
      return items.map((item: any) => {
        const code = String(item.work_type || "").toUpperCase().trim();
        return { ...item, category: item.category ?? workTypeCategoryByCode[code] ?? null } as BatchItem;
      });
    },
  });

  const selectedItems = batchItemsQuery.data || [];

  useEffect(() => {
    const err = batchesQuery.error || openBalanceQuery.error || batchItemsQuery.error;
    if (!err) return;
    toast({ title: "Erro", description: "Falha ao carregar pagamentos.", variant: "destructive" });
  }, [batchesQuery.error, openBalanceQuery.error, batchItemsQuery.error, toast]);

	const openSummary = useMemo(() => {
    const openBalance = openBalanceQuery.data || { count: 0, total: 0 };
    return {
      totalValue: openBalance.total,
      totalOrders: openBalance.count,
    };
  }, [openBalanceQuery.data]);

  const handleDownloadPdf = async () => {
    if (!selectedBatch || selectedItems.length === 0) return;

    try {
      const assistantName = profile?.full_name || user?.email || "Assistente";
      const assistantEmail = user?.email ?? null;

      await exportToPDF({
        assistantName,
        assistantEmail,
        batch: {
          id: selectedBatch.id,
          period_start: selectedBatch.period_start,
          period_end: selectedBatch.period_end,
          status: selectedBatch.status,
        },
        items: selectedItems.map((item) => ({
          external_id: item.external_id,
          work_type: item.work_type,
          category: item.category,
          amount: item.amount,
        })),
      });
    } catch (error) {
      console.error("Error exporting invoice PDF:", error);
      toast({ title: "Erro", description: "Falha ao gerar o PDF.", variant: "destructive" });
    }
  };

  const handleDownloadExcel = async () => {
    if (!selectedBatch || selectedItems.length === 0) return;

    try {
      const assistantName = profile?.full_name || user?.email || "Assistente";
      const assistantEmail = user?.email ?? null;

      await exportToExcel({
        assistantName,
        assistantEmail,
        batch: {
          id: selectedBatch.id,
          period_start: selectedBatch.period_start,
          period_end: selectedBatch.period_end,
          status: selectedBatch.status,
        },
        items: selectedItems.map((item) => ({
          external_id: item.external_id,
          work_type: item.work_type,
          category: item.category,
          amount: item.amount,
        })),
      });
    } catch (error) {
      console.error("Error exporting invoice Excel:", error);
      toast({ title: "Erro", description: "Falha ao gerar o Excel.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meus Pagamentos</h1>
          <p className="text-muted-foreground">Acompanhe seus valores em aberto e o historico de lotes.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              A Receber (Aberto)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openBalanceQuery.isLoading ? (
              <AnimatedSkeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-3xl font-bold text-emerald-600">{formatCurrency(openSummary.totalValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">{openSummary.totalOrders} ordens fechadas</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-sky-600" />
              Lotes Fechados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {batchesQuery.isLoading ? (
              <AnimatedSkeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-3xl font-bold">{(batchesQuery.data || []).length}</div>
                <p className="text-xs text-muted-foreground mt-1">Historico de pagamentos</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/60">
        <CardHeader>
          <CardTitle>Historico de Pagamentos</CardTitle>
          <CardDescription>Lotes fechados pelo admin.</CardDescription>
        </CardHeader>
        <CardContent>
          {batchesQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <AnimatedSkeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (batchesQuery.data || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum lote fechado ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ordens</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(batchesQuery.data || []).map((batch) => {
                  const count = Number(batch.order_count ?? 0) || 0;
                  const total = Number(batch.total_value ?? 0) || 0;
                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        {format(parseISO(batch.period_start), "dd/MM")} - {format(parseISO(batch.period_end), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadge(batch.status)}>
                          {batch.status === "paid" ? "Pago" : "Processando"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{count}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(total)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedBatchId(batch.id)}>
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedBatchId} onOpenChange={() => setSelectedBatchId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Lote</DialogTitle>
            <DialogDescription>
              {selectedBatch
                ? `${format(parseISO(selectedBatch.period_start), "dd/MM")} - ${format(parseISO(selectedBatch.period_end), "dd/MM/yyyy")}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge variant="outline" className={getStatusBadge(selectedBatch.status)}>
                  {selectedBatch.status === "paid" ? "Pago" : "Processando"}
                </Badge>
              </div>

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
                  {batchItemsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.external_id || "-"}</TableCell>
                        <TableCell>{item.work_type || "-"}</TableCell>
                        <TableCell>{item.category || "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(item.amount) || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-lg font-bold text-emerald-600">
                  {formatCurrency(selectedItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedBatchId(null)}>
              Fechar
            </Button>
            <Button variant="secondary" onClick={handleDownloadExcel} disabled={selectedItems.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Excel
            </Button>
            <Button onClick={handleDownloadPdf} disabled={selectedItems.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
