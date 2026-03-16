/* eslint-disable react-hooks/rules-of-hooks */
import { useMemo, useState } from 'react';
import { useOrderCleanup } from '@/hooks/useOrderCleanup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatedSkeleton } from '@/components/ui/animated-skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Archive,
  Download,
  Trash2,
  RotateCcw,
  Database,
  FileSpreadsheet,
  ShieldCheck,
  Clock,
  History,
  User,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function AdminOrderCleanup() {
  const {
    archivedOrders,
    cleanupBatches,
    cleanupHistory,
    stats,
    isAvailable,
    isLoading,
    refetch,
    restoreOrder,
    createCleanupBatch,
    downloadBackupCSV,
    hardDeleteOrders,
    getOrdersReadyForDeletion,
    fourMonthsAgo,
  } = useOrderCleanup();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'restore' | 'delete' | 'hard-delete';
    orderId?: string;
    batchId?: string;
    batchType?: 'orders' | 'order_pool';
  }>({ open: false, type: 'restore' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyReady, setShowOnlyReady] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  if (!isAvailable) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-200/60 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle>Limpeza de Dados Indisponível</CardTitle>
            <CardDescription>
              O schema atual do banco não possui as tabelas/colunas necessárias para esta tela.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Se quiser reativar este módulo, precisamos adicionar tabelas de controle de limpeza e campos de
              arquivamento nas ordens.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ordersReadyForDeletion = getOrdersReadyForDeletion();

  const filteredArchivedOrders = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return archivedOrders.filter((order) => {
      const matchesSearch =
        !normalized ||
        order.external_id?.toLowerCase().includes(normalized) ||
        order.work_type?.toLowerCase().includes(normalized);
      const isOld = order.deleted_at && new Date(order.deleted_at) < fourMonthsAgo;
      return matchesSearch && (!showOnlyReady || isOld);
    });
  }, [archivedOrders, fourMonthsAgo, searchTerm, showOnlyReady]);

  const totalPages = Math.max(1, Math.ceil(filteredArchivedOrders.length / pageSize));
  const pagedArchivedOrders = filteredArchivedOrders.slice((page - 1) * pageSize, page * pageSize);

  const handleRestore = async (orderId: string) => {
    setConfirmDialog({ open: true, type: 'restore', orderId });
  };

  const handleCreateBatch = async (batchType: 'orders' | 'order_pool') => {
    try {
      const count = batchType === 'orders' ? stats.readyForDeletion : stats.oldPoolOrders;
      if (count === 0) {
        toast.info('Nenhum registro encontrado para limpeza');
        return;
      }
      const batchId = await createCleanupBatch(batchType, count);
      toast.success('Lote de limpeza criado. Baixe o CSV antes de excluir.');
    } catch (error) {
      toast.error('Erro ao criar lote de limpeza');
    }
  };

  const handleDownloadCSV = async (batchId: string, batchType: 'orders' | 'order_pool') => {
    try {
      await downloadBackupCSV(batchId, batchType);
      toast.success('CSV baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao baixar CSV');
    }
  };

  const handleHardDelete = (batchId: string, batchType: 'orders' | 'order_pool') => {
    setConfirmText('');
    setConfirmDialog({ open: true, type: 'hard-delete', batchId, batchType });
  };

  const confirmAction = async () => {
    if (confirmDialog.type === 'hard-delete' && confirmText.trim().toUpperCase() !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar a exclusão permanente');
      return;
    }
    setIsSubmitting(true);
    try {
      if (confirmDialog.type === 'restore' && confirmDialog.orderId) {
        await restoreOrder(confirmDialog.orderId);
        toast.success('Ordem restaurada com sucesso!');
      } else if (confirmDialog.type === 'hard-delete' && confirmDialog.batchId) {
        await hardDeleteOrders(confirmDialog.batchId);
        toast.success('Registros excluídos permanentemente!');
      }
      setConfirmDialog({ open: false, type: 'restore' });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao executar ação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getTimeSinceDeleted = (deletedAt: string | null) => {
    if (!deletedAt) return '-';
    try {
      return formatDistanceToNow(parseISO(deletedAt), { locale: ptBR, addSuffix: true });
    } catch {
      return '-';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AnimatedSkeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <AnimatedSkeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          Limpeza de Dados
        </h1>
        <p className="text-muted-foreground">
          Gerencie o arquivo morto e a exclusão permanente de ordens antigas.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Archive className="h-4 w-4 text-chart-5" />
              Arquivo Morto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-5">{stats.archivedOrders}</div>
            <p className="text-xs text-muted-foreground">Ordens arquivadas (soft delete)</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              Prontas para Exclusão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.readyForDeletion}</div>
            <p className="text-xs text-muted-foreground">Ordens com 4+ meses arquivadas</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-chart-3" />
              Pool Antigo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-3">{stats.oldPoolOrders}</div>
            <p className="text-xs text-muted-foreground">Demandas com 4+ meses no pool</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="archive" className="space-y-4">
        <TabsList>
          <TabsTrigger value="archive" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Arquivo Morto
            {stats.archivedOrders > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.archivedOrders}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Limpeza
            {(stats.readyForDeletion + stats.oldPoolOrders) > 0 && (
              <Badge variant="destructive" className="ml-1">
                {stats.readyForDeletion + stats.oldPoolOrders}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="batches" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Lotes de Backup
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
            {cleanupHistory.length > 0 && (
              <Badge variant="outline" className="ml-1">{cleanupHistory.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

      {/* Archive Tab */}
      <TabsContent value="archive">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Ordens Arquivadas</CardTitle>
            <CardDescription>
              Ordens movidas para o arquivo morto. Após 4 meses, podem ser excluídas permanentemente.
            </CardDescription>
            <div className="flex flex-col md:flex-row md:items-center gap-3 pt-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Buscar por ID externo ou tipo..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ready-only"
                  checked={showOnlyReady}
                  onCheckedChange={(checked) => {
                    setShowOnlyReady(Boolean(checked));
                    setPage(1);
                  }}
                />
                <Label htmlFor="ready-only" className="text-sm">
                  Mostrar apenas prontas para exclusão
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
              {filteredArchivedOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma ordem arquivada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Externo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Arquivada</TableHead>
                      <TableHead>Tempo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedArchivedOrders.map(order => {
                      const isOld = order.deleted_at && new Date(order.deleted_at) < fourMonthsAgo;
                      return (
                        <TableRow key={order.id} className={isOld ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-medium">{order.external_id}</TableCell>
                          <TableCell>{order.work_type}</TableCell>
                        <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                order.status === 'aprovada'
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                  : order.status === 'rejeitada'
                                    ? 'bg-rose-100 text-rose-700 border-rose-200'
                                    : order.status === 'nao_realizada'
                                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                                      : order.status === 'cancelada'
                                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                                        : 'bg-sky-100 text-sky-700 border-sky-200'
                              }
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(order.deleted_at)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className={isOld ? 'text-destructive' : ''}>
                                {getTimeSinceDeleted(order.deleted_at)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(order.id)}
                              disabled={isOld}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restaurar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {filteredArchivedOrders.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 text-sm text-muted-foreground">
                  <span>
                    Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredArchivedOrders.length)} de{" "}
                    {filteredArchivedOrders.length} ordens arquivadas
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
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
              )}
          </CardContent>
        </Card>
      </TabsContent>

        {/* Cleanup Tab */}
        <TabsContent value="cleanup">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Orders Cleanup */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Ordens Antigas
                </CardTitle>
                <CardDescription>
                  {stats.readyForDeletion} ordens arquivadas há mais de 4 meses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive">Atenção!</p>
                      <p className="text-muted-foreground">
                        A exclusão permanente é irreversível. Baixe o backup CSV antes de prosseguir.
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleCreateBatch('orders')}
                  disabled={stats.readyForDeletion === 0}
                  className="w-full"
                >
                  Preparar Lote de Limpeza ({stats.readyForDeletion} ordens)
                </Button>
              </CardContent>
            </Card>

            {/* Pool Cleanup */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-chart-3" />
                  Pool de Demandas
                </CardTitle>
                <CardDescription>
                  {stats.oldPoolOrders} demandas no pool há mais de 4 meses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-chart-3/10 border border-chart-3/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-chart-3 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-chart-3">Limpeza do Pool</p>
                      <p className="text-muted-foreground">
                        Demandas antigas que não foram utilizadas serão removidas.
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleCreateBatch('order_pool')}
                  disabled={stats.oldPoolOrders === 0}
                  variant="outline"
                  className="w-full"
                >
                  Preparar Lote de Limpeza ({stats.oldPoolOrders} demandas)
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Batches Tab */}
        <TabsContent value="batches">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Lotes de Backup</CardTitle>
              <CardDescription>
                Baixe o CSV de backup antes de confirmar a exclusão permanente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cleanupBatches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum lote de limpeza pendente</p>
                  <p className="text-sm mt-2">
                    Crie um lote na aba "Limpeza" para começar.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Backup CSV</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cleanupBatches.map(batch => (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <Badge variant={batch.batch_type === 'orders' ? 'destructive' : 'secondary'}>
                            {batch.batch_type === 'orders' ? 'Ordens' : 'Pool'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{batch.record_count}</TableCell>
                        <TableCell>{formatDate(batch.created_at)}</TableCell>
                        <TableCell>
                          {batch.csv_downloaded_at ? (
                            <Badge variant="outline" className="text-chart-4 border-chart-4">
                              <Download className="h-3 w-3 mr-1" />
                              Baixado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-chart-5 border-chart-5">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadCSV(batch.id, batch.batch_type as 'orders' | 'order_pool')}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            CSV
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleHardDelete(batch.id, batch.batch_type as 'orders' | 'order_pool')}
                            disabled={!batch.csv_downloaded_at}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Histórico de Limpezas
              </CardTitle>
              <CardDescription>
                Registro de todas as exclusões permanentes realizadas, com detalhes de quem executou e quando.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cleanupHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma limpeza realizada ainda</p>
                  <p className="text-sm mt-2">
                    O histórico será exibido após a primeira exclusão permanente.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Backup CSV</TableHead>
                      <TableHead>Exclusão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cleanupHistory.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant={item.batch_type === 'orders' ? 'destructive' : 'secondary'}>
                            {item.batch_type === 'orders' ? 'Ordens' : 'Pool'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.record_count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(item.period_start)} - {formatDate(item.period_end)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Download className="h-3 w-3 text-muted-foreground" />
                              <span>{formatDate(item.csv_downloaded_at)}</span>
                            </div>
                            {item.csv_downloaded_by_name && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{item.csv_downloaded_by_name}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 text-sm text-destructive">
                              <Trash2 className="h-3 w-3" />
                              <span>{formatDate(item.hard_deleted_at)}</span>
                            </div>
                            {item.hard_deleted_by_name && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{item.hard_deleted_by_name}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === 'restore' && 'Restaurar Ordem'}
              {confirmDialog.type === 'hard-delete' && 'Confirmar Exclusão Permanente'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'restore' && 
                'A ordem será movida de volta para a lista ativa.'}
              {confirmDialog.type === 'hard-delete' && (
                <span className="text-destructive">
                  Esta ação é irreversível. Todos os {confirmDialog.batchType === 'orders' ? 'registros de ordens' : 'registros do pool'} serão excluídos permanentemente.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {confirmDialog.type === 'hard-delete' && (
            <div className="space-y-2">
              <Label htmlFor="confirm-delete">Digite EXCLUIR para confirmar</Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="EXCLUIR"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant={confirmDialog.type === 'hard-delete' ? 'destructive' : 'default'}
              onClick={confirmAction}
              disabled={isSubmitting || (confirmDialog.type === 'hard-delete' && confirmText.trim().toUpperCase() !== 'EXCLUIR')}
            >
              {isSubmitting ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
