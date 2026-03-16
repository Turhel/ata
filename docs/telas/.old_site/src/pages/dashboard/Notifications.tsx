import { useNotifications } from '@/hooks/useNotifications';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageSkeleton } from '@/components/ui/animated-skeleton';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Clock,
  Check,
  Trash2,
  MessageSquare,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Notifications() {
  const { 
    notifications, 
    isLoading, 
    unreadCount,
    readCount,
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications
  } = useNotifications();

  const getIcon = (type: string | null) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getTypeConfig = (type: string | null) => {
    const configs: Record<string, { 
      borderClass: string; 
      bgClass: string; 
      iconBgClass: string;
      iconColorClass: string;
      badgeClass: string;
    }> = {
      info: { 
        borderClass: 'border-l-blue-500',
        bgClass: 'bg-blue-500/5',
        iconBgClass: 'bg-blue-500/10',
        iconColorClass: 'text-blue-500',
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      },
      warning: { 
        borderClass: 'border-l-amber-500',
        bgClass: 'bg-amber-500/5',
        iconBgClass: 'bg-amber-500/10',
        iconColorClass: 'text-amber-500',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      },
      success: { 
        borderClass: 'border-l-emerald-500',
        bgClass: 'bg-emerald-500/5',
        iconBgClass: 'bg-emerald-500/10',
        iconColorClass: 'text-emerald-500',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      },
      error: { 
        borderClass: 'border-l-red-500',
        bgClass: 'bg-red-500/5',
        iconBgClass: 'bg-red-500/10',
        iconColorClass: 'text-red-500',
        badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400'
      },
    };
    return configs[type || 'info'] || configs.info;
  };

  const getTypeBadge = (type: string | null) => {
    const labels: Record<string, string> = {
      info: 'Informação',
      warning: 'Aviso',
      success: 'Sucesso',
      error: 'Erro',
    };
    return labels[type || 'info'] || labels.info;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Agora mesmo';
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return 'Ontem';
    return date.toLocaleDateString('pt-BR');
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (error) {
      toast.error('Erro ao marcar notificação como lida');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('Todas notificações marcadas como lidas');
    } catch (error) {
      toast.error('Erro ao marcar notificações');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      toast.success('Notificação excluída');
    } catch (error) {
      toast.error('Erro ao excluir notificação');
    }
  };

  const handleDeleteReadNotifications = async () => {
    try {
      await deleteReadNotifications();
      toast.success('Notificações lidas excluídas');
    } catch (error) {
      toast.error('Erro ao excluir notificações');
    }
  };

  if (isLoading) {
    return <PageSkeleton variant="cards" />;
  }

  return (
    <div className="space-y-6">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border/50 p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Notificações
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground">
                Acompanhe atualizações e mensagens importantes
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead} className="gap-2">
                <Check className="h-4 w-4" />
                Marcar todas como lidas
              </Button>
            )}
            {readCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Limpar lidas ({readCount})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir notificações lidas?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá excluir permanentemente {readCount} {readCount === 1 ? 'notificação lida' : 'notificações lidas'}.
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteReadNotifications}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-background">
            <MessageSquare className="h-4 w-4" />
            Todas ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2 data-[state=active]:bg-background">
            <Sparkles className="h-4 w-4" />
            Não lidas ({unreadCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <NotificationList 
            notifications={notifications}
            getIcon={getIcon}
            getTypeConfig={getTypeConfig}
            getTypeBadge={getTypeBadge}
            formatDate={formatDate}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDeleteNotification}
          />
        </TabsContent>

        <TabsContent value="unread" className="mt-4">
          <NotificationList 
            notifications={notifications.filter(n => !n.read)}
            getIcon={getIcon}
            getTypeConfig={getTypeConfig}
            getTypeBadge={getTypeBadge}
            formatDate={formatDate}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDeleteNotification}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface NotificationListProps {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string | null;
    read: boolean | null;
    created_at: string | null;
  }>;
  getIcon: (type: string | null) => JSX.Element;
  getTypeConfig: (type: string | null) => { 
    borderClass: string; 
    bgClass: string; 
    iconBgClass: string;
    iconColorClass: string;
    badgeClass: string;
  };
  getTypeBadge: (type: string | null) => string;
  formatDate: (dateString: string | null) => string;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationList({ 
  notifications, 
  getIcon, 
  getTypeConfig,
  getTypeBadge,
  formatDate,
  onMarkAsRead,
  onDelete
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Bell className="h-12 w-12 opacity-50" />
            </div>
            <p className="text-lg font-medium">Nenhuma notificação</p>
            <p className="text-sm text-muted-foreground">Você está em dia!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => {
        const config = getTypeConfig(notification.type);
        return (
          <Card 
            key={notification.id}
            className={cn(
              "overflow-hidden transition-all duration-200 hover:shadow-md border-l-4",
              config.borderClass,
              !notification.read && config.bgClass
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Ícone colorido */}
                <div className={cn(
                  "flex-shrink-0 p-2.5 rounded-xl",
                  config.iconBgClass
                )}>
                  <div className={config.iconColorClass}>
                    {getIcon(notification.type)}
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={cn(
                          "font-medium leading-tight",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </h4>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          config.badgeClass
                        )}>
                          {getTypeBadge(notification.type)}
                        </span>
                        {!notification.read && (
                          <span className="flex items-center gap-1 text-xs text-primary font-medium">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            Nova
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {notification.message}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                      <Clock className="h-3 w-3" />
                      {formatDate(notification.created_at)}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMarkAsRead(notification.id)}
                        className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Marcar como lida
                      </Button>
                    )}
                    {notification.read && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir notificação?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação irá excluir permanentemente esta notificação.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onDelete(notification.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}