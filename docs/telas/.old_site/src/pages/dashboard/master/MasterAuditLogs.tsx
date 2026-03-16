import { useState } from 'react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useAuditLogsExport } from '@/hooks/useAuditLogsExport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageSkeleton } from '@/components/ui/animated-skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Activity, Shield, FileText, Users, History, Clock, Globe, RefreshCw, PlusCircle, Edit, Trash2, CheckCircle, Database, CreditCard, Bell, Tag, UserPlus, XCircle, Settings, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const actionConfig: Record<string, { label: string; color: string; icon: typeof Activity }> = {
  create: { label: 'Criação', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: PlusCircle },
  insert: { label: 'Inserção', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: PlusCircle },
  update: { label: 'Atualização', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Edit },
  delete: { label: 'Exclusão', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: Trash2 },
  approve: { label: 'Aprovação', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: CheckCircle },
  reject: { label: 'Rejeição', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: XCircle },
  login: { label: 'Login', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', icon: UserPlus },
  logout: { label: 'Logout', color: 'bg-muted text-muted-foreground border-border', icon: Settings },
  status_change: { label: 'Mudança de Status', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: RefreshCw },
};

const resourceConfig: Record<string, { label: string; icon: typeof Activity }> = {
  order: { label: 'Ordem', icon: FileText },
  orders: { label: 'Ordens', icon: FileText },
  user: { label: 'Usuário', icon: Users },
  users: { label: 'Usuários', icon: Users },
  inspector: { label: 'Inspetor', icon: Shield },
  inspectors: { label: 'Inspetores', icon: Shield },
  inspectors_directory: { label: 'Inspetores', icon: Shield },
  pricing: { label: 'Preço', icon: CreditCard },
  order_pricing: { label: 'Preços', icon: CreditCard },
  invitation: { label: 'Convite', icon: Tag },
  invitation_codes: { label: 'Convites', icon: Tag },
  notification: { label: 'Notificação', icon: Bell },
  notifications: { label: 'Notificações', icon: Bell },
  work_type: { label: 'Tipo de Trabalho', icon: Database },
  work_types: { label: 'Tipos de Trabalho', icon: Database },
  team_assignment: { label: 'Atribuição de Equipe', icon: Users },
  team_assignments: { label: 'Atribuições', icon: Users },
  profile: { label: 'Perfil', icon: Users },
  profiles: { label: 'Perfis', icon: Users },
  payment: { label: 'Pagamento', icon: CreditCard },
  payment_records: { label: 'Pagamentos', icon: CreditCard },
  payment_batches: { label: 'Pagamentos', icon: CreditCard },
  payment_batch_items: { label: 'Itens de Pagamento', icon: CreditCard },
  order_scope_summaries: { label: 'Resumos de Escopo', icon: FileText },
};

const MasterAuditLogs = () => {
  const { logs, isLoading, stats, pagination, refetch, goToPage, nextPage, prevPage } = useAuditLogs(20);
  const { exportToExcel, exportToPDF } = useAuditLogsExport();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const userName = log.user_name || log.user_email || '';
    const matchesSearch =
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.resource_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action.toLowerCase() === actionFilter.toLowerCase();
    const matchesResource = resourceFilter === 'all' || log.resource_type.toLowerCase() === resourceFilter.toLowerCase();
    return matchesSearch && matchesAction && matchesResource;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const formatDetails = (details: unknown) => {
    if (!details || typeof details !== 'object') return '-';
    const obj = details as Record<string, unknown>;
    const entries = Object.entries(obj);
    if (entries.length === 0) return '-';
    
    return entries
      .slice(0, 3)
      .map(([key, value]) => {
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return `${key}: ${displayValue.substring(0, 30)}${displayValue.length > 30 ? '...' : ''}`;
      })
      .join(' • ');
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return '??';
  };

  const getActionInfo = (action: string) => {
    const key = action.toLowerCase();
    return actionConfig[key] || { label: action, color: 'bg-muted text-muted-foreground border-border', icon: Activity };
  };

  const getResourceInfo = (resourceType: string) => {
    const key = resourceType.toLowerCase();
    return resourceConfig[key] || { label: resourceType, icon: Database };
  };

  // Get unique action and resource types for filters
  const uniqueActions = [...new Set(logs.map(l => l.action.toLowerCase()))];
  const uniqueResources = [...new Set(logs.map(l => l.resource_type.toLowerCase()))];

  if (isLoading) {
    return <PageSkeleton variant="table" />;
  }

  return (
    <div className="space-y-6">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-border/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <History className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Logs de Auditoria</h1>
              <p className="text-muted-foreground mt-1">
                Histórico completo de ações no sistema
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportToExcel(logs, stats)} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToPDF(logs, stats)} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Ações</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <PlusCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(stats.actions['CREATE'] || 0) + (stats.actions['INSERT'] || 0)}</p>
                <p className="text-sm text-muted-foreground">Criações</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Edit className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.actions['UPDATE'] || 0}</p>
                <p className="text-sm text-muted-foreground">Atualizações</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.actions['DELETE'] || 0}</p>
                <p className="text-sm text-muted-foreground">Exclusões</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Histórico de Ações
              </CardTitle>
              <CardDescription>
                {filteredLogs.length} registro(s) encontrado(s)
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {uniqueActions.map(action => {
                    const info = getActionInfo(action);
                    return (
                      <SelectItem key={action} value={action}>
                        {info.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filtrar recurso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os recursos</SelectItem>
                  {uniqueResources.map(resource => {
                    const info = getResourceInfo(resource);
                    return (
                      <SelectItem key={resource} value={resource}>
                        {info.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nos logs..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <History className="h-12 w-12 opacity-50" />
              </div>
              <p className="font-medium">Nenhum registro encontrado</p>
              <p className="text-sm mt-1">Ajuste os filtros ou aguarde novas ações no sistema</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Data/Hora
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Usuário</TableHead>
                      <TableHead className="font-semibold">Ação</TableHead>
                      <TableHead className="font-semibold">Recurso</TableHead>
                      <TableHead className="font-semibold">Detalhes</TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-1">
                          <Globe className="h-3.5 w-3.5" />
                          IP
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TooltipProvider>
                      {filteredLogs.map((log, index) => {
                        const actionInfo = getActionInfo(log.action);
                        const resourceInfo = getResourceInfo(log.resource_type);
                        const ActionIcon = actionInfo.icon;
                        const ResourceIcon = resourceInfo.icon;
                        
                        return (
                          <TableRow 
                            key={log.id}
                            className="group hover:bg-muted/50 transition-colors"
                            style={{ animationDelay: `${index * 30}ms` }}
                          >
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDate(log.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 border border-border">
                                  {log.user_avatar_url ? (
                                    <AvatarImage
                                      src={log.user_avatar_url}
                                      alt={log.user_name || log.user_email || "Usuário"}
                                    />
                                  ) : null}
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {getInitials(log.user_name, log.user_email)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">
                                    {log.user_name || 'Usuário desconhecido'}
                                  </p>
                                  {log.user_email && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {log.user_email}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${actionInfo.color} gap-1`}>
                                <ActionIcon className="h-3 w-3" />
                                {actionInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded bg-muted/50">
                                  <ResourceIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div>
                                  <span className="text-sm font-medium">{resourceInfo.label}</span>
                                  {log.resource_id && (
                                    <p className="text-xs text-muted-foreground font-mono truncate max-w-24">
                                      {log.resource_id.substring(0, 8)}...
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="max-w-xs truncate text-sm text-muted-foreground cursor-help">
                                    {formatDetails(log.details)}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-sm">
                                  <pre className="text-xs whitespace-pre-wrap">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                                {log.ip_address || '-'}
                              </code>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TooltipProvider>
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} a {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} de {pagination.totalCount} registros
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => goToPage(1)}
                      disabled={pagination.page === 1 || isLoading}
                      className="h-8 w-8"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={prevPage}
                      disabled={pagination.page === 1 || isLoading}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1 px-2">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pagination.page === pageNum ? 'default' : 'outline'}
                            size="icon"
                            onClick={() => goToPage(pageNum)}
                            disabled={isLoading}
                            className="h-8 w-8"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={nextPage}
                      disabled={pagination.page === pagination.totalPages || isLoading}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => goToPage(pagination.totalPages)}
                      disabled={pagination.page === pagination.totalPages || isLoading}
                      className="h-8 w-8"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterAuditLogs;
