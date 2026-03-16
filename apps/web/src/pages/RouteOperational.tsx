import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPinned, Navigation, RefreshCcw, Route as RouteIcon, Save, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { fetchRouteDayClose, upsertRouteDayClose } from "../lib/api";
import { getWebEnv } from "../lib/env";
import { useOperationalRoute } from "../hooks/useOperationalRoute";

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function categoryLabel(category: string) {
  switch (category) {
    case "exterior":
      return "Exterior";
    case "interior":
      return "Interior";
    case "fint":
      return "Fint";
    case "overdue":
      return "Atrasada";
    default:
      return "Regular";
  }
}

function categoryClass(category: string) {
  switch (category) {
    case "exterior":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "interior":
      return "bg-pink-100 text-pink-800 border-pink-200";
    case "fint":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "overdue":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }
}

function stopStatusLabel(stopStatus: string) {
  switch (stopStatus) {
    case "done":
      return "Concluído";
    case "skipped":
      return "Pulada";
    default:
      return "Pendente";
  }
}

function stopStatusClass(stopStatus: string) {
  switch (stopStatus) {
    case "done":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "skipped":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-sky-100 text-sky-800 border-sky-200";
  }
}

function RouteMap(props: {
  stops: Array<{
    id: string;
    seq: number;
    externalOrderCode: string | null;
    latitude: string | null;
    longitude: string | null;
    geocodeReviewRequired: boolean;
    routeCategory: string;
  }>;
}) {
  const points = useMemo(() => {
    const parsed = props.stops
      .map((stop) => ({
        ...stop,
        lat: stop.latitude == null ? null : Number(stop.latitude),
        lon: stop.longitude == null ? null : Number(stop.longitude)
      }))
      .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon)) as Array<{
      id: string;
      seq: number;
      lat: number;
      lon: number;
      geocodeReviewRequired: boolean;
      routeCategory: string;
    }>;

    if (parsed.length === 0) return [];

    const minLat = Math.min(...parsed.map((point) => point.lat));
    const maxLat = Math.max(...parsed.map((point) => point.lat));
    const minLon = Math.min(...parsed.map((point) => point.lon));
    const maxLon = Math.max(...parsed.map((point) => point.lon));

    const latRange = maxLat - minLat || 0.01;
    const lonRange = maxLon - minLon || 0.01;
    const padding = 18;
    const width = 620;
    const height = 340;

    return parsed.map((point) => ({
      ...point,
      x: padding + ((point.lon - minLon) / lonRange) * (width - padding * 2),
      y: height - padding - ((point.lat - minLat) / latRange) * (height - padding * 2)
    }));
  }, [props.stops]);

  if (points.length === 0) {
    return (
      <div className="flex h-[340px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
        Esta rota ainda não tem coordenadas suficientes para exibir o mapa.
      </div>
    );
  }

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <svg viewBox="0 0 620 340" className="h-[340px] w-full rounded-lg bg-slate-50">
        <polyline
          points={polyline}
          fill="none"
          stroke="#0f766e"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />

        {points.map((point) => {
          const fill =
            point.routeCategory === "exterior"
              ? "#16a34a"
              : point.routeCategory === "interior"
                ? "#ec4899"
                : point.routeCategory === "fint"
                  ? "#a16207"
                  : point.routeCategory === "overdue"
                    ? "#dc2626"
                    : "#ca8a04";

          return (
            <g key={point.id}>
              {point.geocodeReviewRequired ? (
                <circle cx={point.x} cy={point.y} r="12" fill="none" stroke="#ef4444" strokeWidth="3" />
              ) : null}
              <circle cx={point.x} cy={point.y} r="9" fill={fill} />
              <text x={point.x} y={point.y + 3} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">
                {point.seq}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-yellow-500" />Regular</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-600" />Exterior</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-pink-500" />Interior</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-700" />Fint</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-600" />Atrasada</span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border-2 border-rose-500 bg-transparent" />
          Revisar geocode
        </span>
      </div>
    </div>
  );
}

export function RouteOperational() {
  const env = getWebEnv();
  const queryClient = useQueryClient();
  const [routeDate, setRouteDate] = useState(getTodayInputValue);
  const [reportedOrderCodesText, setReportedOrderCodesText] = useState("");
  const [notes, setNotes] = useState("");
  const [routeComplete, setRouteComplete] = useState(false);
  const [stoppedAtSeq, setStoppedAtSeq] = useState("");
  const [skippedReasons, setSkippedReasons] = useState<Record<number, string>>({});
  const [hasAppliedReport, setHasAppliedReport] = useState(false);
  const { data, isLoading, isFetching, refetch, error } = useOperationalRoute(routeDate);

  const route = data?.ok ? data.route : null;
  const stops = data?.ok ? data.stops : [];

  const dayCloseQuery = useQuery({
    queryKey: ["routes", "day-close", route?.id ?? "none"],
    queryFn: () => fetchRouteDayClose(env.apiUrl, route!.id),
    enabled: Boolean(route?.id),
    retry: 1
  });

  useEffect(() => {
    setHasAppliedReport(false);
    setReportedOrderCodesText("");
    setNotes("");
    setRouteComplete(false);
    setStoppedAtSeq("");
    setSkippedReasons({});
  }, [route?.id]);

  useEffect(() => {
    if (!route?.id || !dayCloseQuery.data?.ok || !dayCloseQuery.data.report || hasAppliedReport) return;
    const report = dayCloseQuery.data.report;
    setReportedOrderCodesText(report.reportedOrderCodes.join("\n"));
    setNotes(report.notes ?? "");
    setRouteComplete(report.routeComplete);
    setStoppedAtSeq(report.stoppedAtSeq == null ? "" : String(report.stoppedAtSeq));
    setSkippedReasons(
      Object.fromEntries(
        report.plannedNotDone
          .filter((item) => item.reason && item.reason.trim().length > 0)
          .map((item) => [item.seq, item.reason?.trim() ?? ""])
      )
    );
    setHasAppliedReport(true);
  }, [dayCloseQuery.data, hasAppliedReport, route?.id]);

  const reportedOrderCodes = useMemo(
    () =>
      reportedOrderCodesText
        .split(/[\n,]+/g)
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean),
    [reportedOrderCodesText]
  );

  const missingStops = useMemo(() => {
    const reportedSet = new Set(reportedOrderCodes);
    return stops.filter((stop) => {
      const code = stop.externalOrderCode?.trim().toUpperCase();
      return !code || !reportedSet.has(code);
    });
  }, [reportedOrderCodes, stops]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!route?.id) throw new Error("Rota operacional ausente");
      return upsertRouteDayClose(env.apiUrl, route.id, {
        reportedOrderCodes,
        routeComplete,
        stoppedAtSeq: stoppedAtSeq.trim() === "" ? null : Number(stoppedAtSeq),
        skippedStops: missingStops
          .map((stop) => ({
            seq: stop.seq,
            reason: skippedReasons[stop.seq]?.trim() ?? ""
          }))
          .filter((item) => item.reason.length > 0),
        notes: notes.trim() === "" ? null : notes.trim()
      });
    },
    onSuccess: async () => {
      if (!route?.id) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["routes", "operational", routeDate] }),
        queryClient.invalidateQueries({ queryKey: ["routes", "day-close", route.id] })
      ]);
    }
  });

  const dayClose = dayCloseQuery.data?.ok ? dayCloseQuery.data.report : null;
  const isAssistant = data?.ok && data.viewer.role === "assistant";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <RouteIcon className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Rota operacional</h1>
          </div>
          <p className="text-sm text-gray-500">
            Visão do dia para assistant e inspector, com sequência de pontos, mapa e fechamento operacional.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="date"
            value={routeDate}
            onChange={(event) => setRouteDate(event.target.value)}
            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
          />
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
          <div className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
          <div className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
          <div className="h-[340px] animate-pulse rounded-xl border border-gray-200 bg-gray-100 lg:col-span-2" />
          <div className="h-[340px] animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
        </div>
      ) : data?.ok ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-600">Rota</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{route?.stopCount ?? 0}</div>
                <p className="text-xs text-gray-500">Conta {route?.inspectorAccountCode ?? "-"} · {route?.routeDate}</p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-600">Pendentes</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sky-700">{route?.pendingStops ?? 0}</div>
                <p className="text-xs text-gray-500">Paradas ainda em aberto no roteiro</p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-600">Revisão</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-700">{route?.reviewStops ?? 0}</div>
                <p className="text-xs text-gray-500">Pontos com geocode suspeito ou incompleto</p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-600">Origem</CardTitle></CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-gray-900">{route?.originCity || "Não definida"}</div>
                <p className="text-xs text-gray-500">Visualizando como {data.viewer.role === "assistant" ? "assistant" : "inspector"}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPinned className="h-4 w-4 text-primary" />
                  Mapa simplificado da rota
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RouteMap stops={stops} />
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Navigation className="h-4 w-4 text-primary" />
                  Sequência operacional
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[430px] space-y-3 overflow-auto">
                {stops.map((stop) => (
                  <div key={stop.id} className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-gray-900">Ponto {stop.seq} · {stop.residentName || "Sem morador"}</div>
                        <div className="text-xs text-gray-500">
                          {stop.addressLine1 || "Sem endereço"}{stop.city ? ` · ${stop.city}` : ""}{stop.state ? `/${stop.state}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${categoryClass(stop.routeCategory)}`}>
                          {categoryLabel(stop.routeCategory)}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stopStatusClass(stop.stopStatus)}`}>
                          {stopStatusLabel(stop.stopStatus)}
                        </span>
                      </div>
                    </div>

                    {stop.geocodeReviewRequired ? (
                      <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                        <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>Endereço com alerta de geocode. O admin deve revisar antes de confiar totalmente na navegação.</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Fechamento do dia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isAssistant ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    Esta visão está em modo leitura. Apenas o assistant responsável registra o fechamento do dia.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Ordens executadas (OK/OKE)</label>
                      <textarea
                        value={reportedOrderCodesText}
                        onChange={(event) => setReportedOrderCodesText(event.target.value)}
                        rows={8}
                        placeholder={"Cole um código por linha\nROUTE-001\nROUTE-002"}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      />
                      <p className="text-xs text-gray-500">Use os `WORDER` executados no dia. Códigos fora da rota aparecem como divergência.</p>
                    </div>

                    {missingStops.length > 0 ? (
                      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">Motivo estruturado por ponto pulado</div>
                          <p className="text-xs text-gray-500">
                            Preencha o motivo por `seq` para os pontos da rota que não foram reportados como executados.
                          </p>
                        </div>

                        <div className="space-y-3">
                          {missingStops.map((stop) => (
                            <div key={stop.id} className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="mb-2 text-sm font-semibold text-gray-900">
                                Ponto {stop.seq} · {stop.externalOrderCode || "Sem WORDER"}
                              </div>
                              <div className="mb-2 text-xs font-medium text-gray-500">
                                WORDER: {stop.externalOrderCode || "não informado"}
                              </div>
                              <div className="mb-2 text-xs text-gray-500">
                                {stop.addressLine1 || "Sem endereço"}{stop.city ? ` · ${stop.city}` : ""}{stop.state ? `/${stop.state}` : ""}
                              </div>
                              <input
                                type="text"
                                value={skippedReasons[stop.seq] ?? ""}
                                onChange={(event) =>
                                  setSkippedReasons((current) => ({
                                    ...current,
                                    [stop.seq]: event.target.value
                                  }))
                                }
                                placeholder="Ex.: inspetor pulou esse ponto sem perceber"
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={routeComplete}
                          onChange={(event) => setRouteComplete(event.target.checked)}
                        />
                        Marcar como rota completa
                      </label>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Parou no ponto</label>
                        <input
                          type="number"
                          min={1}
                          value={stoppedAtSeq}
                          onChange={(event) => setStoppedAtSeq(event.target.value)}
                          className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
                          placeholder="Ex.: 15"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Observações</label>
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={4}
                        placeholder="Ex.: inspetor esqueceu o ponto 15; houve retorno em atraso fora da rota."
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      />
                    </div>

                    {mutation.data && !mutation.data.ok ? (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                        {mutation.data.message}
                      </div>
                    ) : null}

                    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
                      <Save className="h-4 w-4" />
                      {mutation.isPending ? "Salvando..." : "Salvar fechamento"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Resumo do fechamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dayCloseQuery.isLoading ? (
                  <div className="text-sm text-gray-500">Carregando fechamento...</div>
                ) : dayClose ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="text-xs font-semibold uppercase text-gray-500">Planejadas e feitas</div>
                        <div className="text-2xl font-bold text-emerald-700">{dayClose.plannedDone.length}</div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="text-xs font-semibold uppercase text-gray-500">Planejadas e faltantes</div>
                        <div className="text-2xl font-bold text-rose-700">{dayClose.plannedNotDone.length}</div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="text-xs font-semibold uppercase text-gray-500">Fora da rota</div>
                        <div className="text-2xl font-bold text-amber-700">{dayClose.doneNotPlanned.length}</div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="text-xs font-semibold uppercase text-gray-500">Parou no ponto</div>
                        <div className="text-2xl font-bold text-gray-900">{dayClose.stoppedAtSeq ?? "-"}</div>
                      </div>
                    </div>

                    {dayClose.plannedNotDone.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-gray-800">Faltantes da rota</div>
                        <div className="space-y-2">
                          {dayClose.plannedNotDone.map((item) => (
                            <div key={`${item.seq}-${item.externalOrderCode ?? item.addressLine1 ?? "missing"}`} className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm">
                              <div className="font-semibold text-rose-900">
                                Ponto {item.seq} · {item.externalOrderCode || "Sem WORDER"}
                              </div>
                              <div className="text-rose-800">{item.addressLine1 || "Sem endereço"}</div>
                              {item.reason ? <div className="mt-1 text-xs text-rose-700">Motivo: {item.reason}</div> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {dayClose.doneNotPlanned.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-gray-800">Executadas fora da rota</div>
                        <div className="flex flex-wrap gap-2">
                          {dayClose.doneNotPlanned.map((code) => (
                            <span key={code} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {dayClose.notes ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                        <div className="mb-1 text-xs font-semibold uppercase text-gray-500">Observações</div>
                        {dayClose.notes}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                    Ainda não existe fechamento registrado para esta rota.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="py-10">
            <div className="space-y-2 text-center">
              <p className="text-lg font-semibold text-gray-900">
                {data?.error === "NOT_FOUND" ? "Nenhuma rota publicada encontrada" : "Acesso não permitido para esta visão"}
              </p>
              <p className="text-sm text-gray-500">
                {data?.message ?? (error instanceof Error ? error.message : "Erro ao carregar a rota operacional")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
