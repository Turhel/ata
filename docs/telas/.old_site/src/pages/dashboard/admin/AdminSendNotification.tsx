import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  Send,
  Users,
  User,
  AlertTriangle,
  Info,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAppUser } from '@/hooks/useAppUser';
import { useUserRole } from '@/hooks/useUserRole';
import { useSendNotification } from '@/hooks/useNotifications';
import { apiFetch } from '@/lib/apiClient';

const DRAFT_KEY = 'admin_notification_draft';

interface Recipient {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  selected: boolean;
}

export default function AdminSendNotification() {
  const { toast } = useToast();
  const { user, getToken } = useAuth();
  const { appUser } = useAppUser();
  const { isMaster, isAdmin } = useUserRole();
  const { sendNotification } = useSendNotification();
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState('info');
  const [sendToAll, setSendToAll] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Fetch recipients based on role
  const fetchRecipients = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      if (isMaster) {
        // Master can send to anyone - fetch all profiles
        const profilesRes = await apiFetch<{ ok: true; profiles: any[] }>(
          { getToken },
          '/api/users/profiles?all=true'
        );
        setRecipients(
          (profilesRes.profiles || [])
            .filter((p) => p.user_id !== (appUser?.id ?? user.id))
            .map((p) => ({
              id: p.id,
              user_id: p.user_id,
              full_name: p.full_name,
              email: p.email,
              selected: false,
            }))
        );
      } else if (isAdmin) {
        // Admin can send to their team members
        const teamRes = await apiFetch<{
          ok: true;
          teams: { adminId: string; adminClerkUserId?: string | null; assistants: { id: string }[] }[];
        }>({ getToken }, '/api/team-assignments');

        const team = teamRes.teams.find(
          (t) => t.adminId === appUser?.id || (!!t.adminClerkUserId && t.adminClerkUserId === user.id),
        );
        const assistantIds = team?.assistants.map((a) => a.id) || [];

        if (assistantIds.length > 0) {
          const profilesRes = await apiFetch<{ ok: true; profiles: any[] }>(
            { getToken },
            `/api/users/profiles?user_ids=${assistantIds.join(',')}`
          );

          setRecipients(
            (profilesRes.profiles || []).map((p) => ({
              id: p.id,
              user_id: p.user_id,
              full_name: p.full_name,
              email: p.email,
              selected: false,
            }))
          );
        } else {
          setRecipients([]);
        }
      }
    } catch (error) {
      console.error('Error fetching recipients:', error);
      toast({
        title: "Erro ao carregar destinatários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, isMaster, isAdmin, getToken, toast, appUser?.id]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  useEffect(() => {
    const draftRaw = window.localStorage.getItem(DRAFT_KEY);
    if (!draftRaw) return;
    try {
      const draft = JSON.parse(draftRaw) as { title?: string; message?: string; type?: string };
      if (draft.title) setTitle(draft.title);
      if (draft.message) setMessage(draft.message);
      if (draft.type) setNotificationType(draft.type);
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  const handleToggleMember = (recipientId: string) => {
    setRecipients(prev =>
      prev.map(r =>
        r.id === recipientId ? { ...r, selected: !r.selected } : r
      )
    );
  };

  const handleSendToAllChange = (checked: boolean) => {
    setSendToAll(checked);
    if (checked) {
      setRecipients(prev => prev.map(r => ({ ...r, selected: true })));
    } else {
      setRecipients(prev => prev.map(r => ({ ...r, selected: false })));
    }
  };

  const selectedCount = recipients.filter(r => r.selected).length;
  const selectedPreview = recipients.filter(r => r.selected).slice(0, 5);

  const handleSend = async () => {
    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Preencha o título da notificação.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Mensagem obrigatória",
        description: "Preencha a mensagem da notificação.",
        variant: "destructive",
      });
      return;
    }

    if (title.length > 100) {
      toast({
        title: "Título muito longo",
        description: "O título deve ter no máximo 100 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (message.length > 1000) {
      toast({
        title: "Mensagem muito longa",
        description: "A mensagem deve ter no máximo 1000 caracteres.",
        variant: "destructive",
      });
      return;
    }

    const selectedRecipients = recipients.filter(r => r.selected);
    
    if (selectedRecipients.length === 0) {
      toast({
        title: "Selecione destinatários",
        description: "Selecione pelo menos um usuário.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Send notification to each selected recipient
      const promises = selectedRecipients.map(recipient =>
        sendNotification(
          recipient.user_id,
          title.trim(),
          message.trim(),
          notificationType
        )
      );

      await Promise.all(promises);

      toast({
        title: "Notificação enviada",
        description: `Notificação enviada para ${selectedRecipients.length} usuário(s).`,
      });

      // Reset form
      setTitle('');
      setMessage('');
      setNotificationType('info');
      setSendToAll(false);
      setRecipients(prev => prev.map(r => ({ ...r, selected: false })));
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (error: any) {
      console.error('Error sending notification:', error);
      const message = error?.message || 'Não foi possível enviar a notificação. Tente novamente.';
      toast({
        title: "Erro ao enviar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = () => {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ title: title.trim(), message: message.trim(), type: notificationType }),
    );
    toast({ title: "Rascunho salvo", description: "O rascunho foi salvo neste navegador." });
  };

  const handleClearDraft = () => {
    window.localStorage.removeItem(DRAFT_KEY);
    setTitle('');
    setMessage('');
    setNotificationType('info');
    toast({ title: "Rascunho removido" });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-chart-5" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-chart-4" />;
      default:
        return <Info className="h-4 w-4 text-chart-1" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enviar Notificação</h1>
        <p className="text-muted-foreground">
          {isMaster 
            ? 'Envie notificações para qualquer usuário do sistema.'
            : 'Envie notificações para os assistentes da sua equipe.'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notification Form */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Nova Notificação
            </CardTitle>
            <CardDescription>
              Compose sua mensagem para envio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Ex: Atualização importante"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground text-right">
                {title.length}/100
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={notificationType} onValueChange={setNotificationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-chart-1" />
                      Informação
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-chart-5" />
                      Aviso
                    </div>
                  </SelectItem>
                  <SelectItem value="success">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-chart-4" />
                      Sucesso
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                placeholder="Digite a mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/1000
              </p>
            </div>

            {/* Preview */}
            {(title || message) && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs text-muted-foreground mb-2">Prévia:</p>
                <div className="flex items-start gap-3">
                  {getTypeIcon(notificationType)}
                  <div>
                    <p className="font-medium text-sm">{title || 'Título da notificação'}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {message || 'Mensagem da notificação...'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-sm">
              <p className="text-xs text-muted-foreground mb-2">Resumo do envio</p>
              <p className="font-medium">
                {selectedCount === 0 ? "Nenhum destinatário selecionado" : `Enviando para ${selectedCount} usuário(s)`}
              </p>
              {selectedPreview.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedPreview.map((r) => r.full_name).join(", ")}
                  {selectedCount > selectedPreview.length ? "..." : ""}
                </p>
              )}
            </div>

            <Button 
              onClick={handleSend} 
              className="w-full" 
              disabled={selectedCount === 0 || isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para {selectedCount} usuário(s)
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleSaveDraft}>
                Salvar rascunho
              </Button>
              <Button variant="ghost" className="flex-1" onClick={handleClearDraft}>
                Limpar rascunho
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recipients */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Destinatários
            </CardTitle>
            <CardDescription>
              Selecione quem receberá a notificação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recipients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum usuário disponível</p>
                <p className="text-sm">
                  {isAdmin 
                    ? 'Você ainda não tem assistentes na sua equipe.'
                    : 'Não há usuários cadastrados no sistema.'}
                </p>
              </div>
            ) : (
              <>
                {/* Send to All */}
                <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
                  <Checkbox
                    id="sendToAll"
                    checked={sendToAll}
                    onCheckedChange={(checked) => handleSendToAllChange(checked as boolean)}
                  />
                  <Label htmlFor="sendToAll" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4" />
                    Enviar para todos ({recipients.length})
                  </Label>
                </div>

                {/* Recipients List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {recipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                        recipient.selected ? 'bg-primary/10' : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                      onClick={() => handleToggleMember(recipient.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={recipient.selected}
                          onCheckedChange={() => handleToggleMember(recipient.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{recipient.full_name}</p>
                          <p className="text-xs text-muted-foreground">{recipient.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  {selectedCount} de {recipients.length} selecionados
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
