import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Download,
  Table as TableIcon,
  CheckCircle2,
  Clock,
  DollarSign,
  ClipboardList,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { AnimatedSkeleton } from "@/components/ui/animated-skeleton";
import { usePerformanceMetrics } from "@/hooks/usePerformanceMetrics";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfiles";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const COLORS = ["#0ea5e9", "#22c55e", "#eab308", "#f97316", "#ef4444"];

export default function Performance() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  const {
    metrics,
    chartData,
    categoryData,
    inspectorData,
    loading: isLoading,
    period,
    setPeriod,
    dateRange,
    refetch,
    getOrdersForExport,
  } = usePerformanceMetrics();

  // --- NOVA FUNÇÃO: GERAR RELATÓRIO AVANÇADO ---
  const generateAdvancedReport = async () => {
    const exportOrders = await getOrdersForExport();
    if (!exportOrders || exportOrders.length === 0) {
      toast({ title: "Atenção", description: "Sem dados para gerar relatório.", variant: "destructive" });
      return;
    }

    try {
      const [{ default: JsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable: any = (autoTableModule as any).default ?? autoTableModule;

      const doc = new JsPDF();
      const assistantName = profile?.full_name || user?.email || "Assistente";
      const periodText = period === "week" ? "Semana Atual" : period === "month" ? "Mês Atual" : "Personalizado";

      // Cabeçalho
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 40, "F");

      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text("Relatório Detalhado de Produção", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);

      // Info do Assistente
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.text(`Assistente: ${assistantName}`, 14, 48);
      doc.text(
        `Período: ${periodText} (${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")})`,
        14,
        54,
      );
      doc.text(`Total Ordens: ${metrics.totalOrders} | Aprovadas: ${metrics.approvedOrders}`, 14, 60);

      // Preparar dados da tabela
      const tableRows = exportOrders.map((order) => {
        const isApprovedStatus = order.app_status === "closed";
        const statusLabel = isApprovedStatus ? "Aprovada" : "Não Aprovada";

        // Motivo / Detalhes
        let details = "-";
        if (!isApprovedStatus) {
          if (order.app_status === "followup")
            details = order.followup_suspected_reason ? `Follow-up: ${order.followup_suspected_reason}` : "Follow-up";
          else if (order.app_status === "canceled")
            details = "Cancelada";
          else details = "Enviada / Em andamento";
        }

        const inspectorInfo =
          order.inspector_code_resolved || order.inspector_code || order.inspector_id?.substring(0, 8) || "N/A";

        const dateStr = order.submitted_at || order.created_at;
        const dateLabel = dateStr ? format(new Date(dateStr), "dd/MM") : "-";

        return [
          statusLabel,
          order.external_id,
          order.otype,
          order.category,
          inspectorInfo,
          [order.address1, order.address2].filter(Boolean).join(" ").trim().substring(0, 25) || "-",
          dateLabel,
          details,
        ];
      });

      // Gerar Tabela
      autoTable(doc, {
        startY: 65,
        head: [["Status", "Ordem", "Tipo", "Cat.", "Inspetor", "Endereço", "Data", "Detalhes"]],
        body: tableRows,
        theme: "grid",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: 255,
          fontSize: 8,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: "linebreak",
        },
        columnStyles: {
          0: { fontStyle: "bold" },
          7: { cellWidth: 40 },
        },
        didParseCell: function (data) {
          if (data.section === "body" && data.column.index === 0) {
            if (data.cell.raw === "Aprovada") {
              data.cell.styles.textColor = [22, 163, 74];
            } else {
              data.cell.styles.textColor = [220, 38, 38];
            }
          }
        },
      });

      // Rodapé
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`ATA Management - Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
      }

      doc.save(`Relatorio_Detalhado_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({ title: "Sucesso", description: "Relatório avançado gerado com sucesso!" });
    } catch (error) {
      console.error("Erro ao gerar PDF avançado:", error);
      toast({ title: "Erro", description: "Erro ao gerar o PDF.", variant: "destructive" });
    }
  };

  const handleExport = async (type: "excel" | "advanced-pdf") => {
    try {
      if (type === "advanced-pdf") {
        await generateAdvancedReport();
        return;
      }

      const exportOrders = await getOrdersForExport();
      if (!exportOrders || exportOrders.length === 0) {
        toast({ title: "Atenção", description: "Sem dados para exportar.", variant: "destructive" });
        return;
      }

      const xlsxModule: any = await import("xlsx");
      const XLSX: any = xlsxModule?.utils ? xlsxModule : xlsxModule?.default ?? xlsxModule;

      const ws = XLSX.utils.json_to_sheet(
        exportOrders.map((o) => {
          const dateStr = o.submitted_at || o.created_at;
          const inspectorInfo = o.inspector_code_resolved || o.inspector_code || o.inspector_id || null;
          return {
            Data: dateStr ? new Date(dateStr).toLocaleDateString() : "",
            Ordem: o.external_id,
            Tipo: o.otype,
            Categoria: o.category,
            Status: o.app_status,
            Inspetor: inspectorInfo,
          };
        }),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ordens");
      XLSX.writeFile(wb, "Relatorio_Performance.xlsx");
      toast({ title: "Sucesso", description: "Planilha baixada com sucesso!" });
    } catch (error: any) {
      console.error("Erro na exportação:", error);
      toast({
        title: "Erro",
        description: "Falha ao gerar documento.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <AnimatedSkeleton className="w-full h-[600px]" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Desempenho</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie suas métricas e relatórios.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()} title="Atualizar Dados">
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana Atual</SelectItem>
              <SelectItem value="month">Mês Atual</SelectItem>
            </SelectContent>
          </Select>


          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Opções de Exportação</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => handleExport("advanced-pdf")}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-blue-600" />
                <span>Relatório Detalhado (PDF)</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => handleExport("excel")}>
                <TableIcon className="mr-2 h-4 w-4 text-green-600" />
                <span>Relatório Excel</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ... (resto do JSX igual) ... */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ordens</CardTitle>
            <ClipboardList className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">Ordens enviadas no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordens Aprovadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.approvedOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Taxa de aprovação: <span className="text-green-600 font-bold">{metrics.approvalRate.toFixed(0)}%</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Estimado</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">$ {metrics.estimatedValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Baseado nas ordens aprovadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Diária</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.dailyAverage.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">Ordens por dia ativo</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="inspectors">Por Inspetor</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Produção Diária</CardTitle>
                <CardDescription>Volume de ordens enviadas vs aprovadas</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                      />
                      <Legend />
                      <Bar dataKey="ordens" name="Enviadas" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="aprovadas" name="Aprovadas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
                <CardDescription>Tipos de serviços realizados (Aprovados)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inspectors">
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Inspetor</CardTitle>
              <CardDescription>Eficiência e volume por inspetor atendido</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inspectorData.map((inspector) => (
                  <div
                    key={inspector.code}
                    className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xs">
                        {inspector.code.substring(0, 3)}
                      </div>
                      <div>
                        <p className="font-medium">{inspector.name}</p>
                        <p className="text-sm text-muted-foreground">{inspector.code}</p>
                      </div>
                    </div>
                    <div className="flex gap-6 text-right">
                      <div>
                        <p className="text-sm font-medium">{inspector.orders}</p>
                        <p className="text-xs text-muted-foreground">Ordens</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-600">
                          {inspector.orders > 0 ? ((inspector.approved / inspector.orders) * 100).toFixed(0) : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">Aprovação</p>
                      </div>
                      <div className="w-24">
                        <p className="text-sm font-bold text-emerald-600">$ {inspector.value.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Estimado</p>
                      </div>
                    </div>
                  </div>
                ))}
                {inspectorData.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">Nenhum dado encontrado para o período.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
