import { useEffect, useMemo, useState } from "react";
import { Search, ClipboardList, MapPin } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useAppUser } from "@/hooks/useAppUser";
import { apiFetch } from "@/lib/apiClient";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getTodayInAppTimezone } from "@/lib/timezone";

type ScopeItem = {
  id: string;
  area: string | null;
  label: string | null;
  notes: string | null;
  required: boolean;
  done: boolean;
  done_at: string | null;
};

type Scope = {
  id: string;
  order_id: string;
  order_external_id: string | null;
  external_id: string | null;
  kind: string | null;
  loss_reason: string | null;
  route_point: string | null;
  visibility: string | null;
  created_at: string;
  updated_at: string | null;
  items: ScopeItem[];
};

export default function InspectorDashboard() {
  const { getToken } = useAuth();
  const { inspector } = useAppUser();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<Scope | null>(null);

  const todayKey = useMemo(() => getTodayInAppTimezone(), []);
  const dailySummaryKey = useMemo(() => `inspector:daily-summary:v1:${todayKey}`, [todayKey]);
  const [dailySummaryUpdatedAt, setDailySummaryUpdatedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(dailySummaryKey);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (dailySummaryUpdatedAt) return;
    try {
      const now = new Date().toISOString();
      localStorage.setItem(dailySummaryKey, now);
      setDailySummaryUpdatedAt(now);
    } catch {
      // ignore
    }
  }, [dailySummaryKey, dailySummaryUpdatedAt]);

  const assignmentLabel = useMemo(() => {
    const code = inspector?.assignment?.inspector_code ?? null;
    const name = inspector?.assignment?.inspector_name ?? null;
    if (code && name) return `${code} — ${name}`;
    if (code) return code;
    if (name) return name;
    return "Inspetor";
  }, [inspector]);

  const originLabel = useMemo(() => {
    const o = inspector?.origin;
    if (!o?.origin_city) return null;
    const parts = [o.origin_city, o.origin_state].filter(Boolean);
    const base = parts.join(", ");
    return o.origin_zip ? `${base} ${o.origin_zip}` : base;
  }, [inspector]);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ ok: true; scope: Scope | null }>(
        { getToken },
        `/api/scopes/lookup?external_id=${encodeURIComponent(q)}`,
        { bypassFreeze: true }
      );
      setScope(res.scope ?? null);
      if (!res.scope) toast.message("Nenhum escopo encontrado para esse código.");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao buscar escopo");
    } finally {
      setLoading(false);
    }
  };

  const requiredCount = useMemo(() => (scope?.items ?? []).filter((i) => i.required).length, [scope]);
  const doneCount = useMemo(() => (scope?.items ?? []).filter((i) => i.done).length, [scope]);

  return (
    <div className="space-y-4 max-w-3xl mx-auto w-full">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Inspetor</span>
            <Badge variant="secondary" className="truncate max-w-[60%]">
              {assignmentLabel}
            </Badge>
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{originLabel ?? "Origem não informada"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">
            <div className="font-medium">Resumo diário</div>
            <div className="text-xs text-muted-foreground">
              Atualiza 1x por dia (cache no aparelho). Última atualização: {dailySummaryUpdatedAt ?? "-"}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar escopo por WORDER (ex: 123456)"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              inputMode="numeric"
            />
            <Button onClick={handleSearch} disabled={loading || !query.trim()} className="shrink-0">
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Buscando…" : "Buscar"}
            </Button>
          </div>

          {scope && (
            <>
              <Separator />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{scope.order_external_id ?? scope.external_id ?? scope.id}</Badge>
                {scope.kind && <Badge variant="secondary">{scope.kind}</Badge>}
                <span className="text-muted-foreground ml-auto">
                  {doneCount}/{requiredCount} concluídos
                </span>
              </div>

              <div className="rounded-lg border border-border/50 overflow-hidden">
                <div className="px-3 py-2 bg-muted/30 text-xs font-medium flex items-center gap-2">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Itens do escopo
                </div>
                <div className="divide-y divide-border/50">
                  {scope.items.map((item) => (
                    <div key={item.id} className="p-3 text-sm">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                            item.done ? "bg-emerald-500" : item.required ? "bg-amber-500" : "bg-muted-foreground"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {(item.area ? `${item.area}: ` : "") + (item.label ?? "-")}
                          </div>
                          {item.notes && <div className="text-xs text-muted-foreground mt-0.5">{item.notes}</div>}
                        </div>
                        {item.required && <Badge variant="outline">Obrigatório</Badge>}
                        {item.done && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Feito</Badge>}
                      </div>
                    </div>
                  ))}
                  {scope.items.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">Sem itens.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
