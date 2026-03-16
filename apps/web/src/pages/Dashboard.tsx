import { Activity, AlertTriangle, ClipboardList, Clock, FileText, Layers, TrendingUp, Users as UsersIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useMetrics } from "../hooks/useMetrics";
import { cn } from "../lib/utils";

const statCards = (orders: any, users: any) => [
  {
    title: "Pendências de OS",
    value: orders.available,
    description: "Disponíveis no Pool",
    icon: ClipboardList,
    color: "text-sky-600",
    bgColor: "bg-sky-500/10",
    trend: null,
  },
  {
    title: "Aguardando Validação",
    value: orders.submitted,
    description: "Enviadas na ponta",
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    trend: null,
  },
  {
    title: "Sessões Ativas",
    value: users.active,
    description: "Usuários autorizados",
    icon: UsersIcon,
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    trend: null,
  },
  {
    title: "Reprovações",
    value: orders.rejected,
    description: "Devolvida para correção",
    icon: AlertTriangle,
    color: "text-rose-600",
    bgColor: "bg-rose-500/10",
    trend: null,
  },
];

const progressRows = (orders: any) => [
  { label: "No Pool", value: orders.available, gradient: "from-sky-500 to-cyan-400" },
  { label: "Em Execução", value: orders.inProgress, gradient: "from-purple-500 to-violet-400" },
  { label: "Em Análise", value: orders.submitted, gradient: "from-amber-500 to-orange-400" },
  { label: "Aprovadas", value: orders.approved, gradient: "from-emerald-500 to-green-400" },
];

function LoadingState() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="h-7 w-48 bg-muted rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-muted/60 rounded animate-pulse" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[110px] bg-muted/40 rounded-xl animate-pulse border border-border/40" />
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data: metrics, isLoading, isError, error } = useMetrics();

  if (isLoading) return <LoadingState />;

  if (isError || !metrics) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm">
          Falha ao carregar o dashboard: {(error as any)?.message ?? "Erro desconhecido"}
        </div>
      </div>
    );
  }

  const { orders, users, imports, routes } = metrics;
  const totalOrders = Math.max(
    orders.available + orders.inProgress + orders.submitted + orders.approved,
    1
  );

  const now = new Date().toLocaleTimeString("pt-BR");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Visão Global</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Resumo da operação e produtividade do portal ATA
          </p>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/80 border border-border/50 px-3 py-1.5 rounded-full shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Atualizado às {now}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards(orders, users).map((stat, i) => (
          <div
            key={i}
            className={cn(
              "group relative bg-card border border-border/50 rounded-xl p-5 shadow-sm",
              "hover-lift card-interactive cursor-default"
            )}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {stat.title}
              </p>
              <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110", stat.bgColor)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
            </div>
            <div className={cn("text-3xl font-bold mb-1", stat.color)}>{stat.value}</div>
            <p className="text-xs text-muted-foreground font-medium">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Volume de Produção */}
        <Card className="col-span-4 border-border/50 shadow-sm card-interactive">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-primary" />
              Volume de Produção (OS)
            </CardTitle>
            <CardDescription>Distribuição atual de status de ponta a ponta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progressRows(orders).map((row) => {
                const pct = Math.min(Math.round((row.value / totalOrders) * 100), 100);
                return (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">{row.label}</span>
                      <span className="font-bold text-foreground">{row.value}</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out", row.gradient)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* System status row */}
            <div className="flex items-center gap-5 mt-6 pt-5 border-t border-border/40 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
                <span className="text-muted-foreground font-medium">Operacional</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-sky-500" />
                <span className="text-muted-foreground font-medium">Uptime 99.9%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-muted-foreground font-medium">+{Math.round((orders.approved / totalOrders) * 100)}% aprovação</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integridade de Importação */}
        <Card className="col-span-3 border-border/50 shadow-sm card-interactive">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Integridade de Importação
            </CardTitle>
            <CardDescription>Resumo de processos em lote de Excel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Sucesso", value: imports.completed, color: "bg-emerald-500", glow: "shadow-[0_0_8px_rgba(34,197,94,0.5)]" },
              { label: "Parcial", value: imports.partiallyCompleted, color: "bg-amber-500", glow: "" },
              { label: "Falha Crítica", value: imports.failed, color: "bg-rose-500", glow: "" },
              { label: "Em Processo", value: imports.processing, color: "bg-sky-500", glow: "" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", row.color, row.glow)} />
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                </div>
                <span className="text-sm font-bold text-foreground">{row.value}</span>
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-border/40">
              <p className="text-xs text-muted-foreground text-center bg-muted/30 px-3 py-1.5 rounded-full border border-border/40 inline-block w-full text-center">
                Total processado: {imports.completed + imports.partiallyCompleted + imports.failed + imports.processing} lotes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 shadow-sm card-interactive">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Fechamento de Rotas
            </CardTitle>
            <CardDescription>Resumo operacional do dia {routes.date}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Rotas</div>
                <div className="mt-1 text-2xl font-bold text-foreground">{routes.total}</div>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Fechadas</div>
                <div className="mt-1 text-2xl font-bold text-foreground">{routes.closed}</div>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Completas</div>
                <div className="mt-1 text-2xl font-bold text-emerald-600">{routes.complete}</div>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Pontos feitos</div>
                <div className="mt-1 text-2xl font-bold text-sky-600">{routes.plannedDone}</div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Faltantes da rota</span>
                <span className="font-semibold text-amber-600">{routes.plannedNotDone}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Executadas fora da rota</span>
                <span className="font-semibold text-rose-600">{routes.doneNotPlanned}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
