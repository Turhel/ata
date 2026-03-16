import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  Mail,
  MapPinned,
  RefreshCcw,
  Route,
  Search,
  Send,
  UploadCloud
} from "lucide-react";
import type {
  RouteCreateRequest,
  RouteExportEmailPreviewResponse,
  RouteSourceBatchCandidateItem
} from "@ata-portal/contracts";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { getWebEnv } from "../lib/env";
import {
  createRouteDraft,
  exportRouteEmailPreviewById,
  exportRouteGpxById,
  fetchRouteById,
  fetchRouteSourceBatchCandidates,
  fetchRoutes,
  geocodeRouteSourceBatch,
  importRouteGpx,
  publishRouteById,
  uploadRouteSourceBatchXlsx
} from "../lib/api";

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function statusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Rascunho";
    case "published":
      return "Publicada";
    case "superseded":
      return "Substituída";
    case "cancelled":
      return "Cancelada";
    default:
      return status;
  }
}

function triggerTextDownload(fileName: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function RoutesAdmin() {
  const queryClient = useQueryClient();
  const { apiUrl } = getWebEnv();

  const [filters, setFilters] = useState({
    routeDate: getTodayDate(),
    inspectorAccountCode: "",
    status: ""
  });
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<RouteExportEmailPreviewResponse | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [batchForm, setBatchForm] = useState({
    routeDate: getTodayDate(),
    file: null as File | null
  });
  const [batchContext, setBatchContext] = useState<{
    batchId: string;
    routeDate: string;
    inspectorAccountCodes: string[];
    totalRows: number;
  } | null>(null);

  const [routeForm, setRouteForm] = useState<RouteCreateRequest>({
    sourceBatchId: "",
    routeDate: getTodayDate(),
    inspectorAccountCode: "",
    assistantUserId: "",
    originCity: "",
    replaceExisting: false,
    replaceReason: ""
  });
  const [gpxFile, setGpxFile] = useState<File | null>(null);

  const routesQuery = useQuery({
    queryKey: ["routes-admin", filters],
    queryFn: () =>
      fetchRoutes(apiUrl, {
        routeDate: filters.routeDate || undefined,
        inspectorAccountCode: filters.inspectorAccountCode || undefined,
        status: filters.status || undefined,
        page: 1,
        pageSize: 20
      })
  });

  const routeDetailQuery = useQuery({
    queryKey: ["routes-admin", "detail", selectedRouteId],
    queryFn: () => fetchRouteById(apiUrl, selectedRouteId as string),
    enabled: selectedRouteId != null
  });

  const reviewCandidatesQuery = useQuery({
    queryKey: ["routes-admin", "batch-review", batchContext?.batchId],
    queryFn: () =>
      fetchRouteSourceBatchCandidates(apiUrl, {
        batchId: batchContext?.batchId as string,
        review: "required",
        page: 1,
        pageSize: 20
      }),
    enabled: batchContext?.batchId != null
  });

  const uploadBatchMutation = useMutation({
    mutationFn: async () => {
      if (!batchForm.file) {
        throw new Error("Selecione um arquivo XLSX.");
      }
      return uploadRouteSourceBatchXlsx(apiUrl, {
        file: batchForm.file,
        routeDate: batchForm.routeDate
      });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }

      const nextBatchContext = {
        batchId: result.batch.batchId,
        routeDate: result.batch.routeDate,
        inspectorAccountCodes: result.batch.inspectorAccountCodes,
        totalRows: result.batch.totalRows
      };

      setBatchContext(nextBatchContext);
      setRouteForm((current) => ({
        ...current,
        sourceBatchId: result.batch.batchId,
        routeDate: result.batch.routeDate,
        inspectorAccountCode: result.batch.inspectorAccountCodes[0] ?? current.inspectorAccountCode
      }));
      setFeedback(`Snapshot do dia criado: ${result.batch.batchId}`);
      setError(null);
      setBatchForm((current) => ({ ...current, file: null }));
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
    }
  });

  const geocodeMutation = useMutation({
    mutationFn: async () => {
      if (!batchContext?.batchId) {
        throw new Error("Crie ou informe um sourceBatch antes de geocodificar.");
      }
      return geocodeRouteSourceBatch(apiUrl, { batchId: batchContext.batchId });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setFeedback(
        `Geocode concluído: ${result.processedCandidates}/${result.totalCandidates} candidatos processados, ${result.reviewRequiredCandidates} em revisão.`
      );
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["routes-admin", "batch-review", batchContext?.batchId] });
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
    }
  });

  const createRouteMutation = useMutation({
    mutationFn: async () =>
      createRouteDraft(apiUrl, {
        ...routeForm,
        assistantUserId: routeForm.assistantUserId?.trim() || null,
        originCity: routeForm.originCity?.trim() || null,
        replaceReason: routeForm.replaceReason?.trim() || null
      }),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setFeedback(`Rota criada: ${result.routeId} (${result.totalStops} pontos).`);
      setError(null);
      setSelectedRouteId(result.routeId);
      queryClient.invalidateQueries({ queryKey: ["routes-admin"] });
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
    }
  });

  const importGpxMutation = useMutation({
    mutationFn: async () => {
      if (!gpxFile) {
        throw new Error("Selecione um arquivo GPX.");
      }
      return importRouteGpx(apiUrl, {
        file: gpxFile,
        sourceBatchId: routeForm.sourceBatchId,
        routeDate: routeForm.routeDate,
        inspectorAccountCode: routeForm.inspectorAccountCode,
        assistantUserId: routeForm.assistantUserId?.trim() || null,
        originCity: routeForm.originCity?.trim() || null,
        replaceExisting: routeForm.replaceExisting,
        replaceReason: routeForm.replaceReason?.trim() || null
      });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setFeedback(
        `GPX importado: ${result.routeId} (${result.matchedStops} match, ${result.unmatchedStops} revisão).`
      );
      setError(null);
      setSelectedRouteId(result.routeId);
      queryClient.invalidateQueries({ queryKey: ["routes-admin"] });
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
    }
  });

  const publishMutation = useMutation({
    mutationFn: (routeId: string) => publishRouteById(apiUrl, routeId),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setFeedback(`Rota publicada: ${result.routeId}`);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["routes-admin"] });
      queryClient.invalidateQueries({ queryKey: ["routes-admin", "detail", result.routeId] });
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message);
    }
  });

  const exportGpxMutation = useMutation({
    mutationFn: async (routeId: string) => {
      const result = await exportRouteGpxById(apiUrl, routeId);
      if (result.ok) {
        triggerTextDownload(result.fileName, result.content, result.contentType);
      }
      return result;
    },
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setFeedback(`GPX exportado: ${result.fileName}`);
      setError(null);
    }
  });

  const emailPreviewMutation = useMutation({
    mutationFn: (routeId: string) => exportRouteEmailPreviewById(apiUrl, routeId),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setEmailPreview(result);
      setFeedback("Preview de email gerado.");
      setError(null);
    }
  });

  const routes = routesQuery.data?.ok ? routesQuery.data.routes : [];
  const reviewCandidates =
    reviewCandidatesQuery.data?.ok ? reviewCandidatesQuery.data.candidates : ([] as RouteSourceBatchCandidateItem[]);
  const selectedRoute = routeDetailQuery.data && routeDetailQuery.data.ok ? routeDetailQuery.data : null;

  const routeTotals = useMemo(
    () => ({
      total: routes.length,
      drafts: routes.filter((route) => route.status === "draft").length,
      published: routes.filter((route) => route.status === "published").length
    }),
    [routes]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Rotas operacionais</h1>
          <p className="text-sm text-muted-foreground">
            Snapshot do dia, geocode, criação de rota, import GPX e exportações operacionais.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["routes-admin"] });
            if (selectedRouteId) {
              queryClient.invalidateQueries({ queryKey: ["routes-admin", "detail", selectedRouteId] });
            }
          }}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {feedback ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rotas filtradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{routeTotals.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rascunhos</span>
              <span className="font-semibold">{routeTotals.drafts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Publicadas</span>
              <span className="font-semibold">{routeTotals.published}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Batch atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="text-muted-foreground">Batch ID</div>
            <div className="font-mono text-xs">{batchContext?.batchId ?? "—"}</div>
            <div className="pt-2 text-muted-foreground">Contas encontradas</div>
            <div className="font-semibold">{batchContext?.inspectorAccountCodes.length ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revisão de geocode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pendências</span>
              <span className="font-semibold">{reviewCandidates.length}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Endereços aproximados ou sem match ficam só como alerta; não bloqueiam a criação.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              1. Snapshot do dia
            </CardTitle>
            <CardDescription>Suba o XLSX usado para alimentar a criação/otimização da rota.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="date"
              value={batchForm.routeDate}
              onChange={(event) => setBatchForm((current) => ({ ...current, routeDate: event.target.value }))}
            />
            <Input
              type="file"
              accept=".xlsx"
              onChange={(event) =>
                setBatchForm((current) => ({
                  ...current,
                  file: event.target.files?.[0] ?? null
                }))
              }
            />
            <div className="flex gap-2">
              <Button onClick={() => uploadBatchMutation.mutate()} disabled={uploadBatchMutation.isPending}>
                {uploadBatchMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Criar batch
              </Button>
              <Button
                variant="outline"
                onClick={() => geocodeMutation.mutate()}
                disabled={!batchContext?.batchId || geocodeMutation.isPending}
              >
                {geocodeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPinned className="mr-2 h-4 w-4" />}
                Geocode do batch
              </Button>
            </div>
            {batchContext ? (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
                <div className="font-medium">Batch pronto</div>
                <div className="mt-1 font-mono text-xs">{batchContext.batchId}</div>
                <div className="mt-2 text-muted-foreground">
                  {batchContext.totalRows} linhas | contas: {batchContext.inspectorAccountCodes.join(", ") || "nenhuma"}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-primary" />
              2. Revisão de discrepâncias
            </CardTitle>
            <CardDescription>Casos de geocode suspeito para auditoria do admin.</CardDescription>
          </CardHeader>
          <CardContent>
            {batchContext?.batchId == null ? (
              <div className="text-sm text-muted-foreground">Crie ou selecione um batch para revisar candidatos.</div>
            ) : reviewCandidatesQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando revisão do batch...</div>
            ) : reviewCandidates.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma discrepância aberta neste batch.</div>
            ) : (
              <div className="space-y-3">
                {reviewCandidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{candidate.externalOrderCode}</div>
                      <div className="text-xs text-amber-800">{candidate.geocodeQuality ?? candidate.geocodeStatus}</div>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {candidate.addressLine1}, {candidate.city}/{candidate.state}
                    </div>
                    <div className="mt-1 text-xs text-amber-800">
                      {candidate.geocodeReviewReason ?? "Revisão manual recomendada."}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Route className="h-4 w-4 text-primary" />
              3. Criar rota heurística
            </CardTitle>
            <CardDescription>Gera uma rota com base no snapshot do dia e na cidade de partida.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input
              placeholder="sourceBatchId"
              value={routeForm.sourceBatchId}
              onChange={(event) => setRouteForm((current) => ({ ...current, sourceBatchId: event.target.value }))}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="date"
                value={routeForm.routeDate}
                onChange={(event) => setRouteForm((current) => ({ ...current, routeDate: event.target.value }))}
              />
              <Input
                placeholder="ATAVEND04"
                value={routeForm.inspectorAccountCode}
                onChange={(event) => setRouteForm((current) => ({ ...current, inspectorAccountCode: event.target.value.toUpperCase() }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="assistantUserId (opcional)"
                value={routeForm.assistantUserId ?? ""}
                onChange={(event) => setRouteForm((current) => ({ ...current, assistantUserId: event.target.value }))}
              />
              <Input
                placeholder="Cidade de partida (override)"
                value={routeForm.originCity ?? ""}
                onChange={(event) => setRouteForm((current) => ({ ...current, originCity: event.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={routeForm.replaceExisting === true}
                onChange={(event) =>
                  setRouteForm((current) => ({ ...current, replaceExisting: event.target.checked }))
                }
              />
              Substituir rota ativa do mesmo dia/conta
            </label>
            <textarea
              className="min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              placeholder="replaceReason (obrigatório se substituir)"
              value={routeForm.replaceReason ?? ""}
              onChange={(event) => setRouteForm((current) => ({ ...current, replaceReason: event.target.value }))}
            />
            <Button onClick={() => createRouteMutation.mutate()} disabled={createRouteMutation.isPending}>
              {createRouteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Route className="mr-2 h-4 w-4" />}
              Criar rota
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UploadCloud className="h-4 w-4 text-primary" />
              4. Importar GPX do inRoute
            </CardTitle>
            <CardDescription>Usa a sequência externa como fonte de ordenação da rota.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input
              type="file"
              accept=".gpx"
              onChange={(event) => setGpxFile(event.target.files?.[0] ?? null)}
            />
            <div className="text-xs text-muted-foreground">
              Reaproveita os mesmos campos do formulário de criação: batch, data, conta, assistant e override de cidade.
            </div>
            <Button onClick={() => importGpxMutation.mutate()} disabled={importGpxMutation.isPending || !gpxFile}>
              {importGpxMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Importar GPX
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-primary" />
            5. Rotas existentes
          </CardTitle>
          <CardDescription>Lista operacional com publicação, exportação e detalhe.</CardDescription>
          <div className="grid gap-3 pt-2 md:grid-cols-4">
            <Input
              type="date"
              value={filters.routeDate}
              onChange={(event) => setFilters((current) => ({ ...current, routeDate: event.target.value }))}
            />
            <Input
              placeholder="ATAVEND04"
              value={filters.inspectorAccountCode}
              onChange={(event) =>
                setFilters((current) => ({ ...current, inspectorAccountCode: event.target.value.toUpperCase() }))
              }
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="">Todos status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="superseded">Superseded</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["routes-admin"] })}>
              Atualizar lista
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pontos</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Carregando rotas...
                    </TableCell>
                  </TableRow>
                ) : routes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Nenhuma rota encontrada para o filtro atual.
                    </TableCell>
                  </TableRow>
                ) : (
                  routes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell>{route.routeDate}</TableCell>
                      <TableCell>{route.inspectorAccountCode}</TableCell>
                      <TableCell>{statusLabel(route.status)}</TableCell>
                      <TableCell>{route.totalStops}</TableCell>
                      <TableCell>{route.originCity ?? "—"}</TableCell>
                      <TableCell>{route.optimizationMode}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedRouteId(route.id)}>
                            Detalhe
                          </Button>
                          {route.status === "draft" ? (
                            <Button
                              size="sm"
                              onClick={() => publishMutation.mutate(route.id)}
                              disabled={publishMutation.isPending}
                            >
                              Publicar
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportGpxMutation.mutate(route.id)}
                            disabled={exportGpxMutation.isPending}
                          >
                            GPX
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => emailPreviewMutation.mutate(route.id)}
                            disabled={emailPreviewMutation.isPending}
                          >
                            Email
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalhe da rota</CardTitle>
            <CardDescription>Eventos, alertas e primeiros pontos da rota selecionada.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedRouteId == null ? (
              <div className="text-sm text-muted-foreground">Selecione uma rota na lista.</div>
            ) : routeDetailQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando detalhe...</div>
            ) : selectedRoute == null ? (
              <div className="text-sm text-muted-foreground">Não foi possível carregar o detalhe da rota.</div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Rota</div>
                    <div className="mt-1 font-semibold">{selectedRoute.route.id}</div>
                    <div className="text-muted-foreground">{statusLabel(selectedRoute.route.status)}</div>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Alertas</div>
                    <div className="mt-1">Revisão: {selectedRoute.route.alerts.reviewRequiredCount}</div>
                    <div>Aproximado: {selectedRoute.route.alerts.approximateCount}</div>
                    <div>Não encontrado: {selectedRoute.route.alerts.notFoundCount}</div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 font-semibold">Primeiros pontos</div>
                  <div className="space-y-2">
                    {selectedRoute.stops.slice(0, 8).map((stop) => (
                      <div key={stop.id} className="rounded-lg border border-border/50 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">
                              #{stop.seq} · {stop.addressLine1 ?? "Sem endereço"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {stop.city}/{stop.state} · {stop.routeCategory}
                            </div>
                          </div>
                          {stop.geocodeReviewRequired ? (
                            <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                              Revisar
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 font-semibold">Eventos</div>
                  <div className="space-y-2">
                    {selectedRoute.events.slice(-5).reverse().map((event) => (
                      <div key={event.id} className="rounded-lg border border-border/50 px-3 py-2">
                        <div className="font-medium">{event.eventType}</div>
                        <div className="text-xs text-muted-foreground">
                          {event.createdAt} {event.reason ? `· ${event.reason}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-primary" />
              Preview de email
            </CardTitle>
            <CardDescription>Estrutura de envio operacional antes do disparo real.</CardDescription>
          </CardHeader>
          <CardContent>
            {!emailPreview || !emailPreview.ok ? (
              <div className="text-sm text-muted-foreground">
                Gere um preview na lista para visualizar assunto, destinatários e corpo.
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Assunto</div>
                  <div className="font-semibold">{emailPreview.subject}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Destinatários</div>
                  <div>Inspetor: {emailPreview.recipients.inspectorEmail ?? "sem email"}</div>
                  <div>Assistant: {emailPreview.recipients.assistantEmail ?? "sem email"}</div>
                </div>
                <textarea
                  readOnly
                  className="min-h-56 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-xs shadow-sm"
                  value={emailPreview.textBody}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
