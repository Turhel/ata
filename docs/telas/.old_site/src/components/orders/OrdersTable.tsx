import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Eye, 
  ClipboardList, 
  AlertCircle, 
  AlertTriangle,
  CalendarClock,
  RotateCcw, 
  History 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Database } from '@/integrations/supabase/types';
import { getDueDateKey, getDateKeyInAppTimezone } from '@/lib/timezone';
import type { FollowupKind } from '@/hooks/useOrderFollowups';

type Order = Database['public']['Tables']['orders']['Row'] & {
  inspectors?: { name: string } | null;
  followup_kind?: FollowupKind;
  followup_reason?: string | null;
  due_date_confirmed?: boolean | null;
};

interface OrdersTableProps {
  orders: Order[];
  inspectors: Array<{ id: string; name: string }>;
  onViewReason: (order: Order) => void;
  onRedoAction: (order: Order) => void;
  onViewHistory: (order: Order) => void;
  onConfirmDueDate?: (order: Order) => void;
}

export function OrdersTable({ 
  orders, 
  inspectors, 
  onViewReason, 
  onRedoAction, 
  onViewHistory,
  onConfirmDueDate,
}: OrdersTableProps) {
  const todayKey = getDateKeyInAppTimezone(new Date());
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      available: "bg-muted text-muted-foreground",
      scheduled: "bg-chart-1/20 text-chart-1",
      submitted: "bg-chart-2/20 text-chart-2",
      followup: "bg-chart-5/20 text-chart-5",
      canceled: "bg-muted text-muted-foreground line-through",
      closed: "bg-chart-4/20 text-chart-4",
    };
    const labels: Record<string, string> = {
      available: "Disponível",
      scheduled: "Agendada",
      submitted: "Enviada",
      followup: "Follow-up",
      canceled: "Cancelada",
      closed: "Fechada",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.available}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getCategoryBadge = (category: string | null) => {
    if (!category) return null;
    const styles: Record<string, string> = {
      regular: 'bg-chart-1/20 text-chart-1',
      exterior: 'bg-chart-2/20 text-chart-2',
      interior: 'bg-chart-3/20 text-chart-3',
      fint: 'bg-chart-5/20 text-chart-5',
    };
    const labels: Record<string, string> = {
      regular: 'Regular',
      exterior: 'Exterior',
      interior: 'Interior',
      fint: 'FINT',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[category] || ''}`}>
        {labels[category] || category}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getInspectorName = (inspectorId: string | null, orderInspector: { name: string } | null | undefined) => {
    if (orderInspector?.name) return orderInspector.name;
    if (!inspectorId) return '-';
    const inspector = inspectors.find(i => i.id === inspectorId);
    return inspector?.name || '-';
  };

  const getOrderAddress = (order: Order) => {
    const address = [order.address1, order.address2].filter(Boolean).join(" ").trim();
    return address || "-";
  };

  const needsAction = (order: Order) => {
    return order.followup_kind === "correction";
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma ordem encontrada</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/50 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[120px]">ID da Ordem</TableHead>
            <TableHead className="min-w-[80px]">Tipo</TableHead>
            <TableHead className="min-w-[90px] hidden sm:table-cell">Categoria</TableHead>
            <TableHead className="min-w-[100px] hidden md:table-cell">Inspetor</TableHead>
            <TableHead className="min-w-[150px] hidden lg:table-cell">Endereço</TableHead>
            <TableHead className="min-w-[100px]">Status</TableHead>
            <TableHead className="text-right min-w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const isCorrection = order.followup_kind === 'correction';
            const isPoolException = order.followup_kind === 'pool_exception';
            const dueKey = order.due_date ? getDueDateKey(order.due_date) : null;
            const isDueDateConfirmed = order.due_date_confirmed == null ? true : !!order.due_date_confirmed;
            const isOverdue =
              isDueDateConfirmed && order.status === "scheduled" && dueKey !== null && dueKey < todayKey;
            const canConfirmDueDate =
              !!onConfirmDueDate &&
              isDueDateConfirmed &&
              order.status === "scheduled" &&
              dueKey !== null &&
              dueKey <= todayKey;
            const rowClass = isCorrection
              ? 'bg-destructive/5'
              : isPoolException
                 ? 'bg-amber-500/5'
                 : '';
            const overdueClass = isOverdue ? 'border-l-4 border-rose-500/60 bg-rose-500/5' : '';
            return (
              <TableRow key={order.id} className={`${rowClass} ${overdueClass}`}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {isPoolException && (
                    <span title="Fora do pool">
                      <AlertTriangle className="h-4 w-4 text-chart-5" />
                    </span>
                  )}
                  {isCorrection && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  {order.external_id}
                </div>
              </TableCell>
              <TableCell>{order.work_type}</TableCell>
              <TableCell className="hidden sm:table-cell">{getCategoryBadge(order.category)}</TableCell>
              <TableCell className="hidden md:table-cell">{getInspectorName(order.inspector_id, order.inspectors)}</TableCell>
              <TableCell className="max-w-[200px] truncate hidden lg:table-cell">{getOrderAddress(order)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getStatusBadge(order.status || "available")}
                  {isCorrection && (
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium bg-destructive/20 text-destructive"
                      title={order.followup_reason || 'Correção pendente'}
                    >
                      Retornou
                    </span>
                  )}
                  {isPoolException && (
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-600"
                      title={order.followup_reason || 'Fora do pool'}
                    >
                      Fora do pool
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onViewHistory(order)}
                    title="Ver histórico"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  
                   {(isCorrection || isPoolException) && (
                     <Button 
                       variant="ghost" 
                       size="icon"
                       onClick={() => onViewReason(order)}
                       title="Ver motivo"
                     >
                       <Eye className="h-4 w-4 text-destructive" />
                     </Button>
                   )}

                  {canConfirmDueDate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onConfirmDueDate(order)}
                      title={isOverdue ? "Confirmar ordem agendada (vencida)" : "Confirmar ordem agendada"}
                    >
                      <CalendarClock className="h-4 w-4 text-chart-1" />
                    </Button>
                  )}
                   
                  {isCorrection && order.status !== "submitted" && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onRedoAction(order)}
                      title="Ação de refazer"
                    >
                      <RotateCcw className="h-4 w-4 text-chart-5" />
                    </Button>
                  )}

                  {!needsAction(order) && !isPoolException && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button variant="ghost" size="icon" disabled className="opacity-40 cursor-not-allowed">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Sem ações disponíveis</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
