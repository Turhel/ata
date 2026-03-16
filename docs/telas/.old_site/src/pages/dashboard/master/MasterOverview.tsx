import { useInspectors } from '@/hooks/useInspectors';
import { useWorkTypes } from '@/hooks/useWorkTypes';
import { useInvitations } from '@/hooks/useInvitations';
import { useTeamAssignments } from '@/hooks/useTeamAssignments';
import { useOrderStats } from '@/hooks/useOrders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedSkeleton } from '@/components/ui/animated-skeleton';
import { Users, DollarSign, Ticket, UserPlus, ClipboardList, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const MasterOverview = () => {
  const { inspectors, isLoading: inspectorsLoading } = useInspectors(false);
  const { workTypes, isLoading: workTypesLoading } = useWorkTypes();
  const { invitations, isLoading: invitationsLoading } = useInvitations();
  const { stats: teamStats, isLoading: teamsLoading } = useTeamAssignments();
  const { stats: orderStats, isLoading: ordersLoading } = useOrderStats();

  const safeInspectors = Array.isArray(inspectors) ? inspectors : [];
  const safeWorkTypes = Array.isArray(workTypes) ? workTypes : [];
  const safeInvitations = Array.isArray(invitations) ? invitations : [];

  const activeInspectors = safeInspectors.filter((i) => i.active).length;
  const activeInvitations = safeInvitations.filter(
    (i) => !i.used_at && (!i.expires_at || new Date(i.expires_at) >= new Date()),
  ).length;

  const isLoading = inspectorsLoading || workTypesLoading || invitationsLoading || teamsLoading || ordersLoading;
  const totalAssistants = teamStats.totalAssistants + teamStats.unassignedCount;

  const activePricedWorkTypes = safeWorkTypes.filter(
    (wt) =>
      wt.active &&
      (Number(wt.assistant_value ?? 0) > 0 || Number(wt.inspector_value ?? 0) > 0),
  ).length;

  const stats = [
    { 
      title: 'Inspetores Ativos', 
      value: activeInspectors.toString(), 
      icon: Users, 
      color: 'text-chart-1',
      bgColor: 'bg-chart-1/10',
    },
    { 
      title: 'Tipos de Preço', 
      value: activePricedWorkTypes.toString(),
      icon: DollarSign, 
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
    },
    { 
      title: 'Códigos Ativos', 
      value: activeInvitations.toString(), 
      icon: Ticket, 
      color: 'text-chart-5',
      bgColor: 'bg-chart-5/10',
    },
    { 
      title: 'Administradores', 
      value: teamStats.totalAdmins.toString(), 
      icon: Shield, 
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
    },
    { 
      title: 'Assistentes', 
      value: totalAssistants.toString(), 
      icon: UserPlus, 
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10',
    },
    { 
      title: 'Total de Ordens', 
      value: orderStats.total.toLocaleString('pt-BR'), 
      icon: ClipboardList, 
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Painel Master</h1>
        <p className="text-muted-foreground mt-1">
          Controle total do sistema ATA Management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <AnimatedSkeleton className="h-8 w-16" />
              ) : (
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesso direto às principais funcionalidades</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link to="/master/inspectors" className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-chart-1" />
              <span className="text-sm font-medium">Inspetores</span>
            </Link>
            <Link to="/master/work-types" className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-center">
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-chart-4" />
              <span className="text-sm font-medium">Tipos & Preços</span>
            </Link>
            <Link to="/master/invitations" className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-center">
              <Ticket className="h-6 w-6 mx-auto mb-2 text-chart-5" />
              <span className="text-sm font-medium">Convites</span>
            </Link>
            <Link to="/master/teams" className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-center">
              <UserPlus className="h-6 w-6 mx-auto mb-2 text-chart-2" />
              <span className="text-sm font-medium">Equipes</span>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Resumo do Sistema</CardTitle>
            <CardDescription>Visão geral das operações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Inspetores</p>
                  <p className="text-xs text-muted-foreground">Total cadastrados</p>
                </div>
                <span className="text-lg font-bold">{safeInspectors.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Tabela de Preços</p>
                  <p className="text-xs text-muted-foreground">Tipos cadastrados</p>
                </div>
                <span className="text-lg font-bold">{safeWorkTypes.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Convites</p>
                  <p className="text-xs text-muted-foreground">Total gerados</p>
                </div>
                <span className="text-lg font-bold">{safeInvitations.length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Usuários</p>
                  <p className="text-xs text-muted-foreground">Admins + Assistentes</p>
                </div>
                <span className="text-lg font-bold">{teamStats.totalAdmins + teamStats.totalAssistants}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MasterOverview;
