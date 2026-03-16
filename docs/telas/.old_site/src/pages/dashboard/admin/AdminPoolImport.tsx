import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  History,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Search,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { usePoolImport } from "@/hooks/usePoolImport";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Função auxiliar para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

interface ImportResult {
  totalRows: number;
  newOrders: number;
  updatedOrders: number;
  errors: string[];
  batch?: any | null;
}

interface ImportHistory {
  id: string;
  fileName: string;
  sourceType: string;
  importedAt: string;
  totalRows: number;
}

interface PoolOrder {
  id: string;
  worder: string;
  otype: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  zip: string | null;
  due_date: string | null;
  status: string;
}

export default function AdminPoolImport() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");

  // Manual entry state
  const [manualWorder, setManualWorder] = useState("");
  const [manualOtype, setManualOtype] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualZipCode, setManualZipCode] = useState("");
  const [manualDueDate, setManualDueDate] = useState("");
  const [isCheckingWorder, setIsCheckingWorder] = useState(false);
  const [worderStatus, setWorderStatus] = useState<{ exists: boolean; isFollowUp: boolean } | null>(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewBatch, setPreviewBatch] = useState<ImportHistory | null>(null);
  const [previewOrders, setPreviewOrders] = useState<PoolOrder[]>([]);
  const [previewTotalCount, setPreviewTotalCount] = useState(0);
  const [previewPage, setPreviewPage] = useState(0);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewSearch, setPreviewSearch] = useState("");
  const debouncedSearch = useDebounce(previewSearch, 500); // 500ms delay

  const pageSize = 50;

  const { importFile, getImportHistory, getOrdersByBatch, checkWorderExists, addManualOrder, isProcessing, progress } =
    usePoolImport();

  const loadPreviewData = useCallback(
    async (batchId: string, page: number, search: string) => {
      setIsLoadingPreview(true);
      // Passa o termo de busca para o hook
      const { data, totalCount } = await getOrdersByBatch(batchId, page, pageSize, search);
      setPreviewOrders(data);
      setPreviewTotalCount(totalCount);
      setIsLoadingPreview(false);
    },
    [getOrdersByBatch],
  );

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    // Atualiza o histÃ³rico local com informaÃ§Ãµes mÃ­nimas (reduz egress).
    try {
      const history = await getImportHistory();
      setImportHistory(history);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [getImportHistory]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Carrega dados quando batch, pagina ou busca mudar
  useEffect(() => {
    if (previewBatch && previewDialogOpen) {
      loadPreviewData(previewBatch.id, previewPage, debouncedSearch);
    }
  }, [previewBatch, previewPage, debouncedSearch, previewDialogOpen, loadPreviewData]);

  const handleViewBatch = (batch: ImportHistory) => {
    setPreviewBatch(batch);
    setPreviewSearch(""); // Reseta busca ao abrir
    setPreviewPage(0); // Reseta para pág 0
    setPreviewDialogOpen(true);
    // O useEffect vai disparar o carregamento
  };

  const handlePreviewPageChange = (newPage: number) => {
    setPreviewPage(newPage);
  };

  const totalPages = Math.ceil(previewTotalCount / pageSize);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    validateAndSetFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv",
    ];

    const hasValidExtension = file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv");

    if (!hasValidExtension) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV (.csv)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 15MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await importFile(selectedFile);
    setImportResult(result);

    if (result.errors.length === 0) {
      toast({
        title: "Importação concluída",
        description: `${result.newOrders} novas ordens e ${result.updatedOrders} atualizadas.`,
      });
      // Atualiza o histórico local com informações mínimas (reduz egress).
      if (result.batch?.id) {
        setImportHistory((prev) => {
          const next: ImportHistory[] = [
            {
              id: result.batch.id,
              fileName: result.batch.source_filename || selectedFile.name,
              sourceType: result.batch.source_type || "xlsx",
              importedAt: result.batch.imported_at
                ? new Date(result.batch.imported_at).toLocaleString("pt-BR")
                : new Date().toLocaleString("pt-BR"),
              totalRows: Number(result.batch.total_rows ?? result.totalRows ?? 0),
            },
            ...prev.filter((b) => b.id !== result.batch.id),
          ];
          return next.slice(0, 15);
        });
      } else {
        const history = await getImportHistory();
        setImportHistory(history);
      }
    } else if (result.newOrders > 0 || result.updatedOrders > 0) {
      toast({
        title: "Importação parcial",
        description: `Processado com ${result.errors.length} erro(s). Verifique o log.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Erro na importação",
        description: "Não foi possível processar o arquivo. Verifique o formato.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetManualForm = () => {
    setManualWorder("");
    setManualOtype("");
    setManualAddress("");
    setManualCity("");
    setManualZipCode("");
    setManualDueDate("");
    setWorderStatus(null);
  };

  const handleCheckWorder = async () => {
    if (!manualWorder.trim()) return;

    setIsCheckingWorder(true);
    const status = await checkWorderExists(manualWorder.trim());
    setWorderStatus(status);
    setIsCheckingWorder(false);
  };

  const handleManualSubmit = async () => {
    if (!manualWorder.trim() || !manualOtype.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "WORDER e OTYPE são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingManual(true);
    const result = await addManualOrder({
      worder: manualWorder.trim(),
      otype: manualOtype.trim(),
      address1: manualAddress || undefined,
      city: manualCity || undefined,
      zip: manualZipCode || undefined,
      due_date: manualDueDate || undefined,
      isFollowUp: worderStatus?.isFollowUp,
    });

    if (result.success) {
      resetManualForm();
      const history = await getImportHistory();
      setImportHistory(history);
      toast({ title: "Ordem adicionada com sucesso!" });
    }
    setIsSubmittingManual(false);
  };

  const getSourceBadge = (sourceType: string) => {
    const normalized = sourceType?.toLowerCase() || "xlsx";
    const isManual = normalized === "manual";
    return (
      <Badge
        variant="outline"
        className={
          isManual
            ? "bg-amber-100 text-amber-700 border-amber-200"
            : "bg-emerald-100 text-emerald-700 border-emerald-200"
        }
      >
        {normalized.toUpperCase()}
      </Badge>
    );
  };

  const downloadSample = () => {
    const csvContent =
      "WORDER,OTYPE,ADDRESS1,ADDRESS2,CITY,ZIP,DUE_DATE,STATUS\n12345678,FI,123 Main St,,New York,10001,2024-12-31,open";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_importacao.csv";
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Importar Demandas</h1>
          <p className="text-muted-foreground">Faça upload do arquivo de pool ou adicione ordens manualmente.</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadSample}>
          <Download className="h-4 w-4 mr-2" />
          Baixar Modelo
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "manual")}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload Arquivo
          </TabsTrigger>
          <TabsTrigger value="manual">
            <Plus className="h-4 w-4 mr-2" />
            Entrada Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Upload de Arquivo</CardTitle>
              <CardDescription>
                Suporta .xlsx, .xls e .csv. O sistema tentará identificar automaticamente as colunas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedFile ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                    isDragging ? "border-primary bg-primary/5 scale-[0.99]" : "border-border hover:border-primary/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium mb-2">Arraste seu arquivo aqui</p>
                  <p className="text-sm text-muted-foreground mb-6">ou clique para selecionar do computador</p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                      <FileSpreadsheet className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-lg">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(2)} KB • Pronto para importar
                      </p>
                    </div>
                    {!isProcessing && !importResult && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        Remover
                      </Button>
                    )}
                  </div>

                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="flex items-center gap-2 text-primary">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processando dados...
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        Isso pode levar alguns instantes dependendo do tamanho do arquivo.
                      </p>
                    </div>
                  )}

                  {importResult && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-4 bg-muted/30 rounded-lg border">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <FileSpreadsheet className="h-4 w-4" />
                            <span className="text-sm font-medium">Total Lido</span>
                          </div>
                          <p className="text-3xl font-bold">{importResult.totalRows}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900">
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-medium">Novas Ordens</span>
                          </div>
                          <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                            {importResult.newOrders}
                          </p>
                        </div>
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900">
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm font-medium">Atualizadas</span>
                          </div>
                          <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                            {importResult.updatedOrders}
                          </p>
                        </div>
                      </div>

                      {importResult.errors.length > 0 && (
                        <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                          <div className="flex items-center gap-2 text-destructive mb-3">
                            <FileWarning className="h-5 w-5" />
                            <span className="font-semibold">Problemas Encontrados ({importResult.errors.length})</span>
                          </div>
                          <ul className="text-sm text-destructive space-y-1.5 max-h-40 overflow-y-auto pl-4 list-disc marker:text-destructive/50">
                            {importResult.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Button onClick={handleReset} variant="outline" className="w-full">
                        Importar Outro Arquivo
                      </Button>
                    </div>
                  )}

                  {!isProcessing && !importResult && (
                    <Button
                      onClick={handleUpload}
                      className="w-full h-12 text-base shadow-md hover:shadow-lg transition-all"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Iniciar Processamento
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Entrada Manual de Ordem
              </CardTitle>
              <CardDescription>
                Adicione uma ordem individualmente. Útil para correções rápidas ou inserções avulsas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* WORDER check */}
              <div className="space-y-2">
                <Label htmlFor="manual-worder">Número da Ordem (WORDER) *</Label>
                <div className="flex gap-2">
                  <Input
                    id="manual-worder"
                    placeholder="Ex: 352950698"
                    value={manualWorder}
                    onChange={(e) => {
                      setManualWorder(e.target.value);
                      setWorderStatus(null);
                    }}
                    className="font-mono"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleCheckWorder}
                    disabled={!manualWorder.trim() || isCheckingWorder}
                  >
                    {isCheckingWorder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    <span className="ml-2">Verificar</span>
                  </Button>
                </div>
                {worderStatus && (
                  <div
                    className={`p-3 rounded-lg border text-sm flex items-start gap-2 ${worderStatus.isFollowUp ? "bg-amber-50 border-amber-200 text-amber-800" : worderStatus.exists ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}
                  >
                    {worderStatus.isFollowUp ? (
                      <RotateCcw className="h-4 w-4 mt-0.5" />
                    ) : worderStatus.exists ? (
                      <History className="h-4 w-4 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {worderStatus.isFollowUp
                          ? "Follow-up Detectado"
                          : worderStatus.exists
                            ? "Ordem Existente"
                            : "Nova Ordem"}
                      </p>
                      <p className="opacity-90">
                        {worderStatus.exists
                          ? "Esta ordem já está no sistema. Os dados serão atualizados."
                          : worderStatus.isFollowUp
                            ? "Esta ordem já foi finalizada anteriormente. Será criada como Follow-up."
                            : "Ordem não encontrada. Será criada um novo registro."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manual-otype">Tipo (OTYPE) *</Label>
                  <Input
                    id="manual-otype"
                    placeholder="Ex: FI, FINT, EXT..."
                    value={manualOtype}
                    onChange={(e) => setManualOtype(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-due-date">Vencimento (DUE DATE)</Label>
                  <Input
                    id="manual-due-date"
                    type="date"
                    value={manualDueDate}
                    onChange={(e) => setManualDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-address">Endereço Completo</Label>
                <Input
                  id="manual-address"
                  placeholder="Ex: 123 Main St"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manual-city">Cidade</Label>
                  <Input
                    id="manual-city"
                    placeholder="Cidade"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-zip">ZIP Code</Label>
                  <Input
                    id="manual-zip"
                    placeholder="00000"
                    value={manualZipCode}
                    onChange={(e) => setManualZipCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="ghost" onClick={resetManualForm} disabled={isSubmittingManual}>
                  Limpar
                </Button>
                <Button
                  onClick={handleManualSubmit}
                  disabled={!manualWorder.trim() || !manualOtype.trim() || isSubmittingManual}
                  className="flex-1"
                >
                  {isSubmittingManual ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {worderStatus?.exists ? "Atualizar Dados" : "Adicionar Ordem"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import History */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Histórico de Importações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Carregando histórico...</p>
            </div>
          ) : importHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma importação realizada ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {importHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background border border-border hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => handleViewBatch(item)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {item.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.importedAt} · {item.sourceType.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium">{item.totalRows} linhas</p>
                      <p className="text-xs text-muted-foreground">Origem: {item.sourceType.toUpperCase()}</p>
                    </div>
                    {getSourceBadge(item.sourceType)}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-2 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{previewBatch?.fileName}</DialogTitle>
                <DialogDescription>
                  Importado em {previewBatch?.importedAt} • {previewBatch?.totalRows} registros totais
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 bg-muted/10">
            <div className="p-4 border-b bg-background flex justify-between items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar nesta lista..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  className="pl-9 bg-muted/30"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{previewTotalCount} ordens carregadas</span>
              </div>
            </div>

            {isLoadingPreview ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
              </div>
            ) : (
              <div className="flex-1 overflow-auto min-h-0">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[120px]">WORDER</TableHead>
                      <TableHead className="w-[80px]">Tipo</TableHead>
                      <TableHead className="hidden md:table-cell">Endereço</TableHead>
                      <TableHead className="hidden sm:table-cell w-[150px]">Cidade</TableHead>
                      <TableHead className="hidden lg:table-cell w-[100px]">ZIP</TableHead>
                      <TableHead className="w-[120px]">Vencimento</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                          <p>
                            {previewSearch ? "Nenhuma ordem encontrada com este filtro" : "Nenhuma ordem nesta página"}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono font-medium">{order.worder}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal">
                              {order.otype}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="hidden md:table-cell truncate max-w-[200px]"
                            title={[order.address1, order.address2].filter(Boolean).join(" ")}
                          >
                            {[order.address1, order.address2].filter(Boolean).join(" ") || (
                              <span className="text-muted-foreground italic">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell truncate max-w-[150px]">
                            {order.city || <span className="text-muted-foreground italic">-</span>}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell font-mono text-xs">
                            {order.zip || <span className="text-muted-foreground italic">-</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {order.due_date ? new Date(order.due_date).toLocaleDateString("pt-BR") : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px] h-5 uppercase">
                              {order.status || "open"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {!isLoadingPreview && (
              <div className="p-4 border-t bg-background flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewPageChange(previewPage - 1)}
                    disabled={previewPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  <span className="text-sm font-medium px-4">
                    Página {previewPage + 1} de {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewPageChange(previewPage + 1)}
                    disabled={previewPage >= totalPages - 1}
                  >
                    Próxima <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
