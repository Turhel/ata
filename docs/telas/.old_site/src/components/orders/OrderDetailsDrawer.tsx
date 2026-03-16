import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useOrderHistory, getStatusLabel, getStatusColor } from '@/hooks/useOrderHistory';
import { 
  ArrowRight, 
  Clock, 
  User, 
  MapPin, 
  FileText,
  Calendar,
  Briefcase,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  profiles?: { full_name: string } | null;
  inspectors?: { name: string; code: string } | null;
};

interface OrderDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

const getCategoryLabel = (category: string | null): string => {
  const labels: Record<string, string> = {
    regular: 'Regular',
    exterior: 'Exterior',
    interior: 'Interior',
    fint: 'FINT',
  };
  return category ? labels[category] || category : '-';
};

const getCategoryStyle = (category: string | null): string => {
  const styles: Record<string, string> = {
    regular: 'bg-primary/20 text-primary border-primary/30',
    exterior: 'bg-chart-1/20 text-chart-1 border-chart-1/30',
    interior: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
    fint: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
  };
  return styles[category || 'regular'] || 'bg-muted text-muted-foreground';
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return dateString;
  }
};

export function OrderDetailsDrawer({ open, onOpenChange, order }: OrderDetailsDrawerProps) {
  const { history, isLoading: historyLoading } = useOrderHistory(order?.id || null);

  if (!order) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-border/50 pb-4">
          <DrawerTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            <span className="font-mono">{order.external_id}</span>
          </DrawerTitle>
          <DrawerDescription className="flex items-center gap-2">
            Detalhes completos e histórico da ordem
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 py-4" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="space-y-6">
            {/* Order Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Informações da Ordem
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Work Type */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" />
                    Tipo de Serviço
                  </div>
                  <p className="font-medium">{order.work_type}</p>
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Categoria
                  </div>
                  <Badge variant="outline" className={getCategoryStyle(order.category)}>
                    {getCategoryLabel(order.category)}
                  </Badge>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Status Atual
                  </div>
                  <Badge variant="outline" className={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>

                {/* Assistant */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    Assistente
                  </div>
                  <p className="font-medium">{order.profiles?.full_name || 'Não atribuído'}</p>
                </div>
              </div>

              {/* Address */}
              {(order.address1 || order.address2 || order.city || order.zip) && (
                <div className="space-y-1 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    Endereço
                  </div>
                  <p className="font-medium">
                    {[
                      [order.address1, order.address2].filter(Boolean).join(" ").trim(),
                      order.city,
                      order.state,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {order.zip && (
                    <p className="text-sm text-muted-foreground">CEP: {order.zip}</p>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Prazo
                  </div>
                  <p className="text-sm font-medium">{formatDate(order.due_date)}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Execução
                  </div>
                  <p className="text-sm font-medium">{formatDate(order.execution_date)}</p>
                </div>
              </div>

              {/* Inspector */}
              {order.inspectors && (
                <div className="space-y-1 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    Inspetor
                  </div>
                  <p className="font-medium">
                    {order.inspectors.name} <span className="text-muted-foreground">({order.inspectors.code})</span>
                  </p>
                </div>
              )}

              {/* Audit Flag */}
              {order.audit_flag && order.audit_reason && (
                <div className="p-3 rounded-lg bg-chart-3/10 border border-chart-3/30 mt-2">
                  <p className="text-sm font-medium text-chart-3">Pendência de Verificação</p>
                  <p className="text-sm text-muted-foreground mt-1">{order.audit_reason}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Timeline Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Histórico Completo
              </h3>

              {historyLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground bg-muted/30 rounded-lg">
                  <Clock className="mx-auto h-10 w-10 opacity-50 mb-2" />
                  <p className="text-sm">Nenhuma alteração de status registrada</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
                  
                  <div className="space-y-4">
                    {history.map((entry) => (
                      <div key={entry.id} className="relative flex gap-4">
                        {/* Timeline dot */}
                        <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-primary shrink-0">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        
                        <div className="flex-1 pb-2 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {entry.previous_status && (
                              <>
                                <Badge variant="outline" className={`${getStatusColor(entry.previous_status)} text-xs`}>
                                  {getStatusLabel(entry.previous_status)}
                                </Badge>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              </>
                            )}
                            <Badge variant="outline" className={`${getStatusColor(entry.new_status)} text-xs`}>
                              {getStatusLabel(entry.new_status)}
                            </Badge>
                          </div>
                          
                          {entry.change_reason && (
                            <p className="text-xs text-muted-foreground mb-2 bg-muted/50 p-2 rounded">
                              {entry.change_reason}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {entry.created_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDateTime(entry.created_at)}
                              </span>
                            )}
                            {entry.changed_by_name && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {entry.changed_by_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order creation info */}
              <div className="pt-2 text-xs text-muted-foreground border-t border-border/50">
                <p className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Criada em: {formatDateTime(order.created_at)}
                </p>
                {order.updated_at && order.updated_at !== order.created_at && (
                  <p className="flex items-center gap-1.5 mt-1">
                    <Clock className="h-3 w-3" />
                    Última atualização: {formatDateTime(order.updated_at)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
