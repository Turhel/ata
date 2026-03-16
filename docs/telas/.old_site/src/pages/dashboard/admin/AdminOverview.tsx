import { useCallback, useEffect, useMemo, useState } from "react";
import { useTeamAssignments } from "@/hooks/useTeamAssignments";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedSkeleton } from "@/components/ui/animated-skeleton";
import { Badge } from "@/components/ui/badge";
import { readCache, writeCache } from "@/lib/cache";
import { apiFetch } from "@/lib/apiClient";
import {
  Users,
  ClipboardCheck,
  FileSpreadsheet,
  Bell,
  ArrowRight,
  RefreshCw,
  Wallet,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";

type OrdersTeamApprovalsSummary = {
  ok: true;
  counts: {
    totalOrders: number;
    pendingApprovals: number;
    stuckApprovals24h: number;
    redoOrders: number;
  };
  updated_at: string;
  warnings?: string[];
};

export default function AdminOverview() {
  const { user, getToken } = useAuth();
  const { stats: teamStats, teams, isLoading: teamsLoading } = useTeamAssignments();
  const { isAdmin, isMaster } = useUserRole();

  const [ordersSummary, setOrdersSummary] = useState<OrdersTeamApprovalsSummary["counts"]>({
    totalOrders: 0,
    pendingApprovals: 0,
    stuckApprovals24h: 0,
    redoOrders: 0,
  });
  const [ordersSummaryUpdatedAt, setOrdersSummaryUpdatedAt] = useState<string | null>(null);
  const [ordersSummaryLoading, setOrdersSummaryLoading] = useState(true);

  const summaryCacheKey = useMemo(() => {
    const scope = isMaster ? "master" : "admin";
    return `admin-overview:orders-summary:${scope}:${user?.id ?? "anon"}`;
  }, [isMaster, user?.id]);

  // Metricas Gerais
  const loadOrdersSummary = useCallback(
    async (opts?: { force?: boolean }) => {
      const force = opts?.force === true;

      if (!user || (!isAdmin && !isMaster)) {
        setOrdersSummaryLoading(false);
        return;
      }

      setOrdersSummaryLoading(true);
      try {
        const cached = !force ? readCache<OrdersTeamApprovalsSummary>(summaryCacheKey, 5 * 60_000) : null;
        if (cached?.ok) {
          setOrdersSummary(cached.counts);
          setOrdersSummaryUpdatedAt(cached.updated_at ?? null);
          return;
        }

        const res = await apiFetch<OrdersTeamApprovalsSummary>({ getToken }, "/api/orders/team-approvals-summary");
        setOrdersSummary(res.counts);
        setOrdersSummaryUpdatedAt(res.updated_at ?? null);
        writeCache(summaryCacheKey, res);
      } catch (error) {
        console.error("Error loading orders summary:", error);
      } finally {
        setOrdersSummaryLoading(false);
      }
    },
    [getToken, isAdmin, isMaster, summaryCacheKey, user],
  );

  const pendingOrders = ordersSummary.pendingApprovals;
  const redoOrders = ordersSummary.redoOrders;
  const stuckOrdersCount = ordersSummary.stuckApprovals24h;
  const totalOrders = ordersSummary.totalOrders;

  useEffect(() => {
    loadOrdersSummary();
  }, [loadOrdersSummary]);

  const stats = [
    {
      title: "Assistentes Ativos",
      value: teamStats.totalAssistants.toString(),
      description: "Na sua equipe",
      icon: Users,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: "Fila de Aprovação",
      value: pendingOrders.toString(),
      description: "Aguardando ação",
      icon: ClipboardCheck,
      color: pendingOrders > 10 ? "text-amber-600" : "text-emerald-600",
      bgColor: pendingOrders > 10 ? "bg-amber-100" : "bg-emerald-100",
    },
    {
      title: "Gargalos (>24h)",
      value: stuckOrdersCount.toString(),
      description: "Atrasadas na fila",
      icon: Clock,
      color: stuckOrdersCount > 0 ? "text-rose-600" : "text-slate-600",
      bgColor: stuckOrdersCount > 0 ? "bg-rose-100" : "bg-slate-100",
    },
    {
      title: "Retrabalhos",
      value: redoOrders.toString(),
      description: "Correções pendentes",
      icon: RefreshCw,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
  ];

  const isLoading = teamsLoading || ordersSummaryLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Painel do Administrador</h1>
          <p className="text-muted-foreground">Gerencie sua equipe e aprove ordens em lote.</p>
        </div>
        <div className="text-right hidden sm:flex sm:flex-col sm:items-end gap-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Total de Ordens: {isLoading ? "…" : totalOrders.toLocaleString("pt-BR")}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {ordersSummaryUpdatedAt
                ? `Atualizado em ${format(parseISO(ordersSummaryUpdatedAt), "dd/MM HH:mm")}`
                : "Atualização sob demanda"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => loadOrdersSummary({ force: true })}
              disabled={isLoading}
              title="Atualizar"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild className="bg-primary hover:bg-primary/90 text-white shadow-sm">
          <Link to="/admin/approvals">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Aprovar Ordens
            {pendingOrders > 0 && (
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white hover:bg-white/30 border-0">
                {pendingOrders}
              </Badge>
            )}
          </Link>
        </Button>
        <Button
          variant="outline"
          asChild
          className="border-emerald-200 hover:bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950/30 dark:text-emerald-400"
        >
          <Link to="/admin/payments">
            <Wallet className="mr-2 h-4 w-4" />
            Pagamentos
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/pool-import">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Importar Demandas
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/notifications/send">
            <Bell className="mr-2 h-4 w-4" />
            Enviar Notificação
          </Link>
        </Button>
      </div>

      {/* Seção de Atenção (Só aparece se houver gargalos) */}
      {stuckOrdersCount > 0 && (
        <Card className="border-rose-200 bg-rose-50 dark:bg-rose-950/10 dark:border-rose-900">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <CardTitle className="text-lg text-rose-700 dark:text-rose-400">Atenção Necessária</CardTitle>
            </div>
            <CardDescription className="text-rose-600/80 dark:text-rose-400/80">
              Existem <strong>{stuckOrdersCount} ordens</strong> aguardando aprovação há mais de 24 horas. Isso pode
              impactar o SLA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="destructive" asChild>
              <Link to="/admin/approvals">Resolver Pendências</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="bg-card/50 backdrop-blur-sm border-border/50 transition-all hover:border-border/80"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <AnimatedSkeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <p className={`text-xs flex items-center gap-1 text-muted-foreground mt-1`}>{stat.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team Summary */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Minha Equipe</CardTitle>
            <CardDescription>Visão rápida dos assistentes</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/team">
              Gerenciar Equipe
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <AnimatedSkeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum assistente na equipe</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teams
                .flatMap((team) => team.assistants)
                .slice(0, 5)
                .map((assistant) => (
                  <div
                    key={assistant.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <span className="text-xs font-bold text-primary">
                          {assistant.name?.substring(0, 2).toUpperCase() || "AS"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{assistant.name}</p>
                        <p className="text-xs text-muted-foreground">{assistant.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button size="sm" variant="secondary" className="w-full sm:w-auto h-8 text-xs" asChild>
                        <Link to={`/admin/team?assistant=${assistant.id}`}>Ver Desempenho</Link>
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
