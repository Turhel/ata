import { useState } from 'react';
import { useInvitations } from '@/hooks/useInvitations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/animated-skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Copy, Trash2, Search, Ticket, Check, Calendar, Shield, Users, Crown, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleConfig: Record<string, { label: string; color: string; icon: typeof Users }> = {
  user: { label: 'Assistente', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Users },
  admin: { label: 'Administrador', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Shield },
  master: { label: 'Master', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Crown },
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  available: { label: 'Disponível', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle },
  used: { label: 'Usado', color: 'bg-muted text-muted-foreground border-border', icon: Check },
  expired: { label: 'Expirado', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Calendar },
};

const MasterInvitations = () => {
  const { invitations, isLoading, stats, createInvitation, expireInvitation, deleteInvitation } = useInvitations();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newInvitation, setNewInvitation] = useState({
    role: '' as AppRole | '',
    expiresInDays: 30,
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpiring, setIsExpiring] = useState<string | null>(null);

  const filteredInvitations = invitations.filter((invitation) => {
    const matchesSearch = invitation.code.toLowerCase().includes(searchTerm.toLowerCase());
    const isUsed = invitation.used_at !== null;
    const isExpired = !!(invitation.expires_at && new Date(invitation.expires_at) < new Date());
    
    if (statusFilter === 'available') return matchesSearch && !isUsed && !isExpired;
    if (statusFilter === 'used') return matchesSearch && isUsed;
    if (statusFilter === 'expired') return matchesSearch && !isUsed && isExpired;
    
    return matchesSearch;
  });

  const handleAddInvitation = async () => {
    if (!newInvitation.role) {
      toast.error('Selecione o tipo de conta');
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresAt =
        newInvitation.expiresInDays > 0
          ? new Date(Date.now() + newInvitation.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
          : null;
      const result = await createInvitation(newInvitation.role as AppRole, expiresAt);
      toast.success('Código criado: ' + result.code);
      setIsAddDialogOpen(false);
      setNewInvitation({ role: '', expiresInDays: 30 });
    } catch (error) {
      toast.error('Erro ao criar código');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Código copiado!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteInvitation = async (id: string) => {
    try {
      await deleteInvitation(id);
      toast.success('Código excluído');
    } catch (error) {
      toast.error('Erro ao excluir código');
      console.error(error);
    }
  };

  const getStatus = (invitation: typeof invitations[0]) => {
    if (invitation.used_at) return 'used';
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) return 'expired';
    return 'available';
  };

  const handleExpireInvitation = async (id: string) => {
    setIsExpiring(id);
    try {
      await expireInvitation(id);
      toast.success('CИdigo expirado');
    } catch (error) {
      toast.error('Erro ao expirar cИdigo');
      console.error(error);
    } finally {
      setIsExpiring(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

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
              <Ticket className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Códigos de Convite</h1>
              <p className="text-muted-foreground mt-1">
                Crie e gerencie códigos para cadastro de novos usuários
              </p>
            </div>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg">
                <Plus className="h-5 w-5 mr-2" />
                Novo Código
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar Novo Código de Convite</DialogTitle>
                <DialogDescription>
                  O código será gerado automaticamente
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Tipo de Conta</Label>
                  <Select
                    value={newInvitation.role}
                    onValueChange={(value) => setNewInvitation({ ...newInvitation, role: value as AppRole })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Assistente
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Administrador
                        </div>
                      </SelectItem>
                      <SelectItem value="master">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4" />
                          Master
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expira em</Label>
                  <Select
                    value={String(newInvitation.expiresInDays)}
                    onValueChange={(value) => setNewInvitation({ ...newInvitation, expiresInDays: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                      <SelectItem value="0">Sem expiraÇõÇœo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddInvitation} disabled={isSubmitting || !newInvitation.role}>
                  {isSubmitting ? 'Gerando...' : 'Gerar Código'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Códigos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-sm text-muted-foreground">Disponíveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <Check className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.used}</p>
                <p className="text-sm text-muted-foreground">Usados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Calendar className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-sm text-muted-foreground">Expirados</p>
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
                <Ticket className="h-5 w-5 text-primary" />
                Códigos de Convite
              </CardTitle>
              <CardDescription>
                {filteredInvitations.length} código(s) encontrado(s)
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="available">Disponíveis</SelectItem>
                  <SelectItem value="used">Usados</SelectItem>
                  <SelectItem value="expired">Expirados</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar código..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInvitations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Ticket className="h-12 w-12 opacity-50" />
              </div>
              <p className="font-medium">Nenhum código encontrado</p>
              <p className="text-sm mt-1">Ajuste os filtros ou crie um novo código</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Código</TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Criado em
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Expira em
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider>
                    {filteredInvitations.map((invitation, index) => {
                      const status = getStatus(invitation);
                      const statusInfo = statusConfig[status];
                      const roleInfo = roleConfig[invitation.role] || { label: invitation.role, color: 'bg-muted text-muted-foreground', icon: Users };
                      const RoleIcon = roleInfo.icon;
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <TableRow 
                          key={invitation.id}
                          className="group hover:bg-muted/50 transition-colors"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <TableCell>
                            <code className="px-2.5 py-1 bg-muted rounded-md text-sm font-mono border border-border/50">
                              {invitation.code}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${roleInfo.color} gap-1`}>
                              <RoleIcon className="h-3 w-3" />
                              {roleInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(invitation.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusInfo.color} gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(invitation.expires_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {status === 'available' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleCopyCode(invitation.code)}
                                    >
                                      {copiedCode === invitation.code 
                                        ? <Check className="h-4 w-4 text-green-500" />
                                        : <Copy className="h-4 w-4" />
                                      }
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copiar código</TooltipContent>
                                </Tooltip>
                              )}
                              {status === 'available' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-amber-600"
                                      disabled={isExpiring === invitation.id}
                                    >
                                      <Calendar className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Copiar e expirar?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        O cИdigo serВ copiado e expirado imediatamente. N„o poderВ ser usado ap—s isso.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          handleCopyCode(invitation.code);
                                          handleExpireInvitation(invitation.id);
                                        }}
                                        className="bg-amber-600 text-white hover:bg-amber-700"
                                      >
                                        Expirar agora
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir código?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. O código "{invitation.code}" será excluído permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteInvitation(invitation.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TooltipProvider>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterInvitations;
