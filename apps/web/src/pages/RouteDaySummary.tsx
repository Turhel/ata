import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ClipboardCheck, RefreshCcw, Route as RouteIcon, TriangleAlert } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { fetchRouteDayClose, fetchRouteDaySummary } from "../lib/api";
import { getWebEnv } from "../lib/env";

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function RouteDaySummaryDetails(props: { routeId: string }) {
  const env = getWebEnv();
  const query = useQuery({
    queryKey: ["routes", "day-close", "detail", props.routeId],
    queryFn: () => fetchRouteDayClose(env.apiUrl, props.routeId),
    retry: 1
  });

  if (query.isLoading) {
    return <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">Carregando detalhes do fechamento...</div>;
  }

  if (!query.data?.ok || !query.data.report) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        {query.data && !query.data.ok ? query.data.message : "Sem detalhes disponíveis para esta rota."}
      </div>
    );
  }

  const report = query.data.report;

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase text-gray-500">Reportadas</div>
          <div className="text-xl font-bold text-gray-900">{report.reportedOrderCodes.length}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase text-gray-500">Faltantes da rota</div>
          <div className="text-xl font-bold text-rose-700">{report.plannedNotDone.length}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase text-gray-500">Fora da rota</div>
          <div className="text-xl font-bold text-amber-700">{report.doneNotPlanned.length}</div>
        </div>
      </div>

      {report.plannedNotDone.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-800">Pontos pulados / faltantes</div>
          <div className="space-y-2">
            {report.plannedNotDone.map((item) => (
              <div
                key={`${item.seq}-${item.externalOrderCode ?? item.addressLine1 ?? "missing"}`}
                className="rounded-lg border border-rose-200 bg-white p-3 text-sm"
              >
                <div className="font-semibold text-rose-900">
                  Ponto {item.seq} · {item.externalOrderCode || "Sem WORDER"}
                </div>
                <div className="text-rose-800">{item.addressLine1 || "Sem endereço"}{item.city ? ` · ${item.city}` : ""}{item.state ? `/${item.state}` : ""}</div>
                <div className="mt-1 text-xs text-rose-700">Motivo: {item.reason || "Sem motivo registrado"}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {report.doneNotPlanned.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-800">Executadas fora da rota</div>
          <div className="flex flex-wrap gap-2">
            {report.doneNotPlanned.map((code) => (
              <span key={code} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                {code}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {report.notes ? (
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
          <div className="mb-1 text-xs font-semibold uppercase text-gray-500">Observações</div>
          {report.notes}
        </div>
      ) : null}
    </div>
  );
}

export function RouteDaySummary() {
  const env = getWebEnv();
  const [routeDate, setRouteDate] = useState(getTodayInputValue);
  const [inspectorAccountCode, setInspectorAccountCode] = useState("");
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["routes", "day-summary", routeDate, inspectorAccountCode],
    queryFn: () => fetchRouteDaySummary(env.apiUrl, routeDate, inspectorAccountCode.trim() || undefined),
    retry: 1
  });

  const data = query.data?.ok ? query.data : null;
  const apiErrorMessage = query.data && !query.data.ok ? query.data.message : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Fechamento diário das rotas</h1>
          </div>
          <p className="text-sm text-gray-500">
            Visão administrativa consolidada do dia para conferir faltantes, extras e rotas ainda sem fechamento.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="date"
            value={routeDate}
            onChange={(event) => setRouteDate(event.target.value)}
            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
          />
          <input
            type="text"
            value={inspectorAccountCode}
            onChange={(event) => setInspectorAccountCode(event.target.value)}
            placeholder="Filtrar conta ex.: ATAVEND04"
            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
          />
          <Button onClick={() => query.refetch()} variant="outline" className="gap-2">
            <RefreshCcw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-600">Rotas do dia</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-gray-900">{data.totals.routes}</div></CardContent>
            </Card>
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-600">Rotas fechadas</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-700">{data.totals.closedRoutes}</div></CardContent>
            </Card>
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-600">Faltantes</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-rose-700">{data.totals.plannedNotDoneCount}</div></CardContent>
            </Card>
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-600">Fora da rota</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-amber-700">{data.totals.doneNotPlannedCount}</div></CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {data.summaries.map((item) => {
              const isExpanded = expandedRouteId === item.routeId;

              return (
                <Card key={item.routeId} className="border-gray-200 shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <RouteIcon className="h-4 w-4 text-primary" />
                        {item.inspectorAccountCode} · {item.routeDate}
                      </CardTitle>

                      {item.hasDayClose ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedRouteId(isExpanded ? null : item.routeId)}
                          className="gap-2"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700">
                        Status da rota: {item.routeStatus}
                      </span>
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700">
                        Stops: {item.stopCount}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                          item.hasDayClose
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        {item.hasDayClose ? "Fechada" : "Sem fechamento"}
                      </span>
                      {item.routeComplete ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Rota completa
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="text-xs font-semibold uppercase text-gray-500">Planejadas e feitas</div>
                        <div className="text-xl font-bold text-emerald-700">{item.plannedDoneCount}</div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="text-xs font-semibold uppercase text-gray-500">Faltantes</div>
                        <div className="text-xl font-bold text-rose-700">{item.plannedNotDoneCount}</div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="text-xs font-semibold uppercase text-gray-500">Fora da rota</div>
                        <div className="text-xl font-bold text-amber-700">{item.doneNotPlannedCount}</div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="text-xs font-semibold uppercase text-gray-500">Parou no ponto</div>
                        <div className="text-xl font-bold text-gray-900">{item.stoppedAtSeq ?? "-"}</div>
                      </div>
                    </div>

                    {item.notes ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                        <div className="mb-1 text-xs font-semibold uppercase text-gray-500">Observações</div>
                        {item.notes}
                      </div>
                    ) : null}

                    {!item.hasDayClose ? (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>Esta rota ainda não tem fechamento diário registrado.</span>
                      </div>
                    ) : null}

                    {isExpanded ? <RouteDaySummaryDetails routeId={item.routeId} /> : null}
                  </CardContent>
                </Card>
              );
            })}

            {data.summaries.length === 0 ? (
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="py-8 text-center text-sm text-gray-500">
                  Nenhuma rota encontrada para a data informada.
                </CardContent>
              </Card>
            ) : null}
          </div>
        </>
      ) : (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="py-8 text-center text-sm text-gray-500">
            {apiErrorMessage ?? (query.error instanceof Error ? query.error.message : "Falha ao carregar resumo diário")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
