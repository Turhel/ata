import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrderHistory, getStatusLabel, getStatusColor } from '@/hooks/useOrderHistory';
import { ArrowRight, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  orderExternalId?: string;
}

export function OrderHistoryDialog({ open, onOpenChange, orderId, orderExternalId }: OrderHistoryDialogProps) {
  const { history, isLoading } = useOrderHistory(orderId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Status
            {orderExternalId && (
              <span className="text-sm font-normal text-muted-foreground">
                - {orderExternalId}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Clock className="mx-auto h-12 w-12 opacity-50 mb-3" />
              <p>Nenhuma alteração de status registrada</p>
              <p className="text-sm mt-1">O histórico será exibido quando houver mudanças de status</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
              
              <div className="space-y-6">
                {history.map((entry, index) => (
                  <div key={entry.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-primary">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    
                    <div className="flex-1 pb-2">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {entry.previous_status && (
                          <>
                            <Badge variant="outline" className={getStatusColor(entry.previous_status)}>
                              {getStatusLabel(entry.previous_status)}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </>
                        )}
                        <Badge variant="outline" className={getStatusColor(entry.new_status)}>
                          {getStatusLabel(entry.new_status)}
                        </Badge>
                      </div>
                      
                      {entry.change_reason && (
                        <p className="text-sm text-muted-foreground mb-2 bg-muted/50 p-2 rounded">
                          {entry.change_reason}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {entry.created_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
