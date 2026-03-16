import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Calendar, 
  User,
  FileText,
  Clock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useDuplicateRequests } from '@/hooks/useDuplicateRequests';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function DuplicateRequestsSection() {
  const { toast } = useToast();
  const { pendingRequests, isLoading, reviewRequest } = useDuplicateRequests();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReview = (requestId: string, action: 'approve' | 'reject') => {
    setSelectedRequest(requestId);
    setReviewAction(action);
    setReviewNotes('');
  };

  const confirmReview = async () => {
    if (!selectedRequest || !reviewAction) return;

    setIsSubmitting(true);
    try {
      await reviewRequest(
        selectedRequest,
        reviewAction === 'approve' ? 'approved' : 'rejected',
        reviewNotes || undefined
      );
      setSelectedRequest(null);
      setReviewAction(null);
      setReviewNotes('');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível processar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const currentRequest = pendingRequests.find(r => r.id === selectedRequest);

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Solicitações de Duplicata
          </CardTitle>
          <CardDescription>
            Revise solicitações de ordens duplicadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Solicitações de Duplicata
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingRequests.length} pendente(s)
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Assistentes solicitaram revisão de ordens que já existem no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Copy className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma solicitação pendente</p>
              <p className="text-sm">
                As solicitações de revisão de duplicatas aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 rounded-lg border border-border/50 bg-muted/30 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">
                          {request.external_id}
                        </span>
                        <Badge variant="outline" className="bg-chart-3/20 text-chart-3 border-chart-3/30">
                          Duplicata
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          Solicitante: {request.requester_name || 'Desconhecido'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(request.requested_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReview(request.id, 'approve')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReview(request.id, 'reject')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        Ordem Original
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        Inserida em: {formatDate(request.original_created_at)}
                      </div>
                      {request.original_assistant_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          Por: {request.original_assistant_name}
                        </div>
                      )}
                    </div>
                    {request.notes && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase">
                          Observações do Solicitante
                        </p>
                        <div className="flex items-start gap-2 text-sm">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                          <span>{request.notes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Aprovar Solicitação' : 'Rejeitar Solicitação'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? 'Ao aprovar, a ordem será transferida para o assistente solicitante.'
                : 'Ao rejeitar, o assistente será notificado e a ordem permanecerá com o assistente original.'}
            </DialogDescription>
          </DialogHeader>

          {currentRequest && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm">
                  <strong>Ordem:</strong> {currentRequest.external_id}
                </p>
                <p className="text-sm">
                  <strong>Solicitante:</strong> {currentRequest.requester_name || 'Desconhecido'}
                </p>
                {currentRequest.original_assistant_name && (
                  <p className="text-sm">
                    <strong>Assistente Original:</strong> {currentRequest.original_assistant_name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder={
                    reviewAction === 'approve'
                      ? 'Adicione observações sobre a aprovação...'
                      : 'Informe o motivo da rejeição...'
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedRequest(null)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
              onClick={confirmReview}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processando...' : (
                reviewAction === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
