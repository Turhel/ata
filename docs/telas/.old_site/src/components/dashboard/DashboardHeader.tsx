import { useLocation } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function DashboardHeader() {
  const location = useLocation();

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    
    // Master routes
    if (path === '/master') return 'Visão Geral Master';
    if (path === '/master/inspectors') return 'Gestão de Inspetores';
    if (path === '/master/work-types') return 'Tipos e Preços';
    if (path === '/master/invitations') return 'Códigos de Convite';
    if (path === '/master/teams') return 'Gestão de Equipes';
    if (path === '/master/audit-logs') return 'Logs de Auditoria';
    if (path === '/master/notifications') return 'Notificações';
    
    // Admin routes
    if (path === '/admin') return 'Visão Geral Admin';
    if (path === '/admin/team') return 'Minha Equipe';
    if (path === '/admin/performance') return 'Desempenho da Equipe';
    if (path === '/admin/payments') return 'Pagamentos';
    if (path === '/admin/payments/history') return 'Histórico de Lotes';
    if (path === '/admin/approvals') return 'Aprovar Ordens';
    if (path === '/admin/pool-import') return 'Importar Demandas';
    if (path === '/admin/redo-orders') return 'Ordens Refeitas';
    if (path === '/admin/notifications/send') return 'Enviar Notificação';
    if (path === '/admin/notifications') return 'Notificações';
    
    // Dashboard routes
    if (path === '/dashboard') return 'Visão Geral';
    if (path === '/dashboard/orders') return 'Minhas Ordens';
    if (path === '/dashboard/orders/new') return 'Inserir Ordens';
    if (path === '/dashboard/performance') return 'Desempenho';
    if (path === '/dashboard/payments') return 'Meus Pagamentos';
    if (path === '/dashboard/notifications') return 'Notificações';
    if (path === '/dashboard/settings') return 'Configurações';
    
    return 'Dashboard';
  };

  return (
    <header className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center px-4 md:px-6 gap-2">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <h1 className="text-lg font-semibold text-foreground">{getPageTitle()}</h1>
    </header>
  );
}
