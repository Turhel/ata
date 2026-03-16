import { Activity, AlertTriangle, CheckCircle2, ClipboardList, Clock, Layers, Users as UsersIcon, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useMetrics } from "../hooks/useMetrics";

export function Dashboard() {
  const { data: metrics, isLoading, isError, error } = useMetrics();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in p-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Executivo</h1>
          <p className="text-gray-500">Carregando métricas do sistema...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse bg-gray-100 border-none h-[120px]" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div className="space-y-6 animate-fade-in p-2">
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-md">
          Falha ao carregar o dashboard: {error?.message || "Erro desconhecido"}
        </div>
      </div>
    );
  }

  const { orders, users, imports } = metrics;

  const statCards = [
    {
      title: "Pendências de OS",
      value: orders.available.toString(),
      description: "Disponíveis no Pool",
      icon: ClipboardList,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Aguardando Validação",
      value: orders.submitted.toString(),
      description: "Enviadas na ponta",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Sessões Ativas",
      value: users.active.toString(),
      description: "Usuários autorizados",
      icon: UsersIcon,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Reprovações",
      value: orders.rejected.toString(),
      description: "Devolvida para correção",
      icon: AlertTriangle,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Visão Global</h1>
        <p className="text-gray-500 text-sm">Resumo da operação e produtividade do portal ATA</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1 font-medium">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-gray-500" />
              Volume de Produção (OS)
            </CardTitle>
            <CardDescription>Distribuição atual de status de ponta a ponta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-1/4 text-sm font-medium">No Pool</div>
                <div className="w-3/4 flex items-center gap-2">
                  <div className="h-2 bg-gray-200 rounded-full w-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((orders.available / 100) * 100, 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold">{orders.available}</span>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-1/4 text-sm font-medium">Em Execução</div>
                <div className="w-3/4 flex items-center gap-2">
                  <div className="h-2 bg-gray-200 rounded-full w-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((orders.inProgress / 100) * 100, 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold">{orders.inProgress}</span>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-1/4 text-sm font-medium">Em Análise</div>
                <div className="w-3/4 flex items-center gap-2">
                  <div className="h-2 bg-gray-200 rounded-full w-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min((orders.submitted / 100) * 100, 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold">{orders.submitted}</span>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-1/4 text-sm font-medium">Aprovadas</div>
                <div className="w-3/4 flex items-center gap-2">
                  <div className="h-2 bg-gray-200 rounded-full w-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((orders.approved / 100) * 100, 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold">{orders.approved}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-500" />
              Integridade de Importação
            </CardTitle>
            <CardDescription>Resumo de processos em lote de Excel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium">Sucesso</span>
              </div>
              <span className="font-bold">{imports.completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm font-medium">Parcial</span>
              </div>
              <span className="font-bold">{imports.partiallyCompleted}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-sm font-medium">Falha Crítica</span>
              </div>
              <span className="font-bold">{imports.failed}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
