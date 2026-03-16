import { useEffect, useMemo, useState } from "react";
import { useTeamAssignments } from "@/hooks/useTeamAssignments";
import { useTeamPerformance } from "@/hooks/useTeamPerformance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/animated-skeleton";
import { Users, Search, Mail, TrendingUp, CheckCircle2, FileText, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/apiClient";
import { differenceInDays, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

export default function AdminTeam() {
  const { getToken } = useAuth();
  const { teams, isLoading: loadingTeams, stats } = useTeamAssignments();
  const { metrics: teamMetrics, isLoading: loadingMetrics } = useTeamPerformance("month");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "approval" | "orders">("approval");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [lastActivityMap, setLastActivityMap] = useState<Record<string, string>>({});
  const [ordersLast7Days, setOrdersLast7Days] = useState<Record<string, number>>({});
  const [goalMap, setGoalMap] = useState<Record<string, number>>({});
  const [approvalFilter, setApprovalFilter] = useState<"all" | "below" | "above">("all");
  const [goalFilter, setGoalFilter] = useState<"all" | "met" | "miss">("all");

  const assistantIds = useMemo(
    () => teams.flatMap((team) => team.assistants.map((assistant) => assistant.id)),
    [teams],
  );

  useEffect(() => {
    const loadActivity = async () => {
      if (assistantIds.length === 0) {
        setLastActivityMap({});
        setOrdersLast7Days({});
        setGoalMap({});
        return;
      }

      try {
        const qs = new URLSearchParams();
        qs.set("assistant_ids", assistantIds.join(","));
        qs.set("since_days", "90");
        const activityRes = await apiFetch<{
          ok: true;
          assistants: {
            assistant_id: string;
            weekly_goal: number | null;
            last_activity_at: string | null;
            orders_last_7_days: number | null;
          }[];
        }>({ getToken }, `/api/orders/assistants-activity?${qs.toString()}`, { bypassFreeze: true });

        const nextGoalMap: Record<string, number> = {};
        const nextLastActivity: Record<string, string> = {};
        const nextOrdersLast7Days: Record<string, number> = {};

        (activityRes.assistants || []).forEach((a) => {
          nextGoalMap[a.assistant_id] = Number(a.weekly_goal ?? 0) || 0;
          if (a.last_activity_at) nextLastActivity[a.assistant_id] = a.last_activity_at;
          nextOrdersLast7Days[a.assistant_id] = Number(a.orders_last_7_days ?? 0) || 0;
        });

        setGoalMap(nextGoalMap);
        setLastActivityMap(nextLastActivity);
        setOrdersLast7Days(nextOrdersLast7Days);
      } catch (error) {
        console.error("Erro ao carregar atividade da equipe:", error);
      }
    };

    loadActivity();
  }, [assistantIds, getToken]);

  // Flatten all assistants from teams for display
  const allAssistants = teams.flatMap((team) =>
    team.assistants.map((a) => {
      // Tenta encontrar métricas para este assistente na lista de métricas
      // O hook useTeamPerformance retorna { assistants: [...] } dentro de metrics
      const assistantMetrics = teamMetrics?.assistants?.find((m: any) => m.assistantId === a.id) || {
        totalOrders: 0,
        approvedOrders: 0,
        approvalRate: 0,
      };

      return {
        ...a,
        adminName: team.adminName,
        metrics: assistantMetrics,
        lastActivity: lastActivityMap[a.id] || null,
        ordersLast7Days: ordersLast7Days[a.id] || 0,
        weeklyGoal: goalMap[a.id] || 0,
      };
    }),
  );

  const filteredMembers = allAssistants.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());

    const approvalRate = member.metrics.approvalRate || 0;
    const approvalMatch =
      approvalFilter === "all"
        ? true
        : approvalFilter === "below"
          ? approvalRate < 70
          : approvalRate >= 70;

    const goalMet = member.weeklyGoal > 0 ? member.ordersLast7Days >= member.weeklyGoal : null;
    const goalMatch =
      goalFilter === "all"
        ? true
        : goalFilter === "met"
          ? goalMet === true
          : goalMet === false;

    return matchesSearch && approvalMatch && goalMatch;
  });

  const sortedMembers = useMemo(() => {
    const sorted = [...filteredMembers].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "orders") {
        return (a.metrics.totalOrders || 0) - (b.metrics.totalOrders || 0);
      }
      return (a.metrics.approvalRate || 0) - (b.metrics.approvalRate || 0);
    });
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [filteredMembers, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / pageSize));
  const pagedMembers = sortedMembers.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const isLoading = loadingTeams || loadingMetrics;

  if (isLoading) {
    return <PageSkeleton variant="cards" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Minha Equipe</h1>
          <p className="text-muted-foreground">Monitore o desempenho e gerencie os assistentes da sua equipe.</p>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Assistentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div className="text-2xl font-bold">{stats.totalAssistants}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ativos na sua equipe</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média de Aprovação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div className="text-2xl font-bold">
                {/* Calcula média geral simples baseada nos dados carregados */}
                {filteredMembers.length > 0
                  ? (
                      filteredMembers.reduce((acc, curr) => acc + (curr.metrics.approvalRate || 0), 0) /
                      filteredMembers.length
                    ).toFixed(0)
                  : 0}
                %
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Desempenho geral da equipe (Mês)</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Produzido (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <div className="text-2xl font-bold">
                {filteredMembers.reduce((acc, curr) => acc + (curr.metrics.totalOrders || 0), 0)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ordens enviadas pela equipe</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & List */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle>Membros da Equipe</CardTitle>
              <CardDescription>Gerencie acessos e visualize métricas individuais.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approval">Aprovação</SelectItem>
                  <SelectItem value="orders">Ordens</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as typeof sortDirection)}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Ordem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Desc</SelectItem>
                  <SelectItem value="asc">Asc</SelectItem>
                </SelectContent>
              </Select>
              <Select value={approvalFilter} onValueChange={(value) => setApprovalFilter(value as typeof approvalFilter)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Aprovação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas taxas</SelectItem>
                  <SelectItem value="above">&gt;= 70%</SelectItem>
                  <SelectItem value="below">&lt; 70%</SelectItem>
                </SelectContent>
              </Select>
              <Select value={goalFilter} onValueChange={(value) => setGoalFilter(value as typeof goalFilter)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Meta semanal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas metas</SelectItem>
                  <SelectItem value="met">Meta batida</SelectItem>
                  <SelectItem value="miss">Meta abaixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum assistente encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pagedMembers.map((member) => {
                const lastActivityDate = member.lastActivity ? new Date(member.lastActivity) : null;
                const isInactive = !lastActivityDate || differenceInDays(new Date(), lastActivityDate) > 7;
                const goalMet = member.weeklyGoal > 0 && member.ordersLast7Days >= member.weeklyGoal;
                return (
                  <div
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-all gap-4"
                  >
                  {/* Info Principal */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                      <span className="font-bold text-primary text-sm">
                        {member.name?.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{member.name}</p>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                          Assistente
                        </Badge>
                        {isInactive && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-amber-600 border-amber-200">
                            Inativo
                          </Badge>
                        )}
                        {member.weeklyGoal > 0 && (
                          <Badge
                            variant={goalMet ? "default" : "secondary"}
                            className="text-[10px] h-5 px-1.5"
                          >
                            {goalMet ? "Meta OK" : "Meta abaixo"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Métricas Rápidas */}
                  <div className="flex items-center gap-6 sm:gap-8 text-sm border-t sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                    <div className="text-center sm:text-left">
                      <p className="font-medium text-foreground">{member.metrics.totalOrders}</p>
                      <p className="text-xs text-muted-foreground">Ordens</p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="font-medium text-green-600">{member.metrics.approvalRate.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Aprovação</p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="font-medium text-blue-600">
                        {member.metrics.totalOrders > 0
                          ? ((member.metrics.followUpOrders / member.metrics.totalOrders) * 100).toFixed(0)
                          : 0}
                        %
                      </p>
                      <p className="text-xs text-muted-foreground">Follow-up</p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="font-medium text-slate-700">
                        {member.ordersLast7Days}/{member.weeklyGoal || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Meta semanal</p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-xs text-muted-foreground">Última atividade</p>
                      <p className="text-xs font-medium text-slate-600">
                        {member.lastActivity
                          ? formatDistanceToNow(new Date(member.lastActivity), { addSuffix: true })
                          : "Sem atividade"}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                      <Button size="sm" variant="outline" asChild>
                        {/* ROTA CORRIGIDA AQUI */}
                        <Link to={`/admin/performance?assistant=${member.id}`}>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Detalhes
                        </Link>
                      </Button>
                      <Button size="sm" variant="secondary" asChild>
                        <Link to={`/admin/approvals?assistant=${member.id}`}>
                          Pendentes
                        </Link>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            {/* ROTA CORRIGIDA AQUI */}
                            <Link to={`/admin/performance?assistant=${member.id}`}>Ver Histórico Completo</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  </div>
                );
              })}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-sm text-muted-foreground">
                <span>
                  Mostrando {(page - 1) * pageSize + 1} -{" "}
                  {Math.min(page * pageSize, sortedMembers.length)} de {sortedMembers.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    Anterior
                  </Button>
                  <span>
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
