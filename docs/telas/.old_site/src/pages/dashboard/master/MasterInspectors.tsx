import { useState } from 'react';
import { useInspectors } from '@/hooks/useInspectors';
import { useInspectorAssignments } from '@/hooks/useInspectorAssignments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/animated-skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Search, Users, UserCheck, UserX, Shield, Calendar, Hash } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MasterInspectors = () => {
  const { inspectors, isLoading, createInspector, updateInspector, toggleActive } = useInspectors(false);
  const {
    assignments,
    pendingUsers,
    isLoading: assignmentsLoading,
    assign,
    unassign,
  } = useInspectorAssignments();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newInspector, setNewInspector] = useState({ name: '', code: '' });
  const [editingInspector, setEditingInspector] = useState<{ id: string; name: string; code: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedInspectorId, setSelectedInspectorId] = useState<string>('');

  const filteredInspectors = inspectors.filter(
    (inspector) =>
      (inspector.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspector.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = inspectors.filter(i => i.active).length;
  const inactiveCount = inspectors.filter(i => !i.active).length;

  const handleAddInspector = async () => {
    if (!newInspector.name.trim() || !newInspector.code.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsSubmitting(true);
    try {
      await createInspector({
        name: newInspector.name.trim(),
        code: newInspector.code.trim().toUpperCase(),
      });
      toast.success('Inspetor cadastrado com sucesso!');
      setIsAddDialogOpen(false);
      setNewInspector({ name: '', code: '' });
    } catch (error) {
      toast.error('Erro ao cadastrar inspetor');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInspector = async () => {
    if (!editingInspector || !editingInspector.name.trim() || !editingInspector.code.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateInspector(editingInspector.id, {
        name: editingInspector.name.trim(),
        code: editingInspector.code.trim().toUpperCase(),
      });
      toast.success('Inspetor atualizado com sucesso!');
      setIsEditDialogOpen(false);
      setEditingInspector(null);
    } catch (error) {
      toast.error('Erro ao atualizar inspetor');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean | null) => {
    try {
      await toggleActive(id, !currentActive);
      toast.success(currentActive ? 'Inspetor desativado' : 'Inspetor ativado');
    } catch (error) {
      toast.error('Erro ao alterar status');
      console.error(error);
    }
  };

  const openEditDialog = (inspector: { id: string; name: string; code: string }) => {
    setEditingInspector({ id: inspector.id, name: inspector.name, code: inspector.code });
    setIsEditDialogOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatPendingUserLabel = (u: { full_name?: string | null; email?: string | null; clerk_user_id?: string | null; id: string }) => {
    const name = u.full_name?.trim() ? u.full_name.trim() : null;
    const email = u.email?.trim() ? u.email.trim() : null;
    const clerkId = u.clerk_user_id?.trim() ? u.clerk_user_id.trim() : null;
    if (name && email) return `${name} — ${email}`;
    if (name) return name;
    if (email) return email;
    if (clerkId) return `Clerk: ${clerkId}`;
    return `ID: ${u.id}`;
  };

  const formatAccountTitle = (u: { user_full_name?: string | null; user_email?: string | null; user_clerk_user_id?: string | null; user_id?: string | null }) => {
    const name = u.user_full_name?.trim() ? u.user_full_name.trim() : null;
    const email = u.user_email?.trim() ? u.user_email.trim() : null;
    const clerkId = u.user_clerk_user_id?.trim() ? u.user_clerk_user_id.trim() : null;
    const userId = u.user_id?.trim() ? u.user_id.trim() : null;
    if (name) return name;
    if (email) return email;
    if (clerkId) return `Clerk: ${clerkId}`;
    return userId ? `ID: ${userId}` : "Sem nome";
  };

  const formatAccountSubtitle = (u: { user_full_name?: string | null; user_email?: string | null; user_clerk_user_id?: string | null }) => {
    const name = u.user_full_name?.trim() ? u.user_full_name.trim() : null;
    const email = u.user_email?.trim() ? u.user_email.trim() : null;
    const clerkId = u.user_clerk_user_id?.trim() ? u.user_clerk_user_id.trim() : null;

    // Prefer showing a second line only when it adds information (avoid duplicates)
    if (name && email) return email;
    if (name && clerkId) return `Clerk: ${clerkId}`;
    if (email && clerkId) return `Clerk: ${clerkId}`;
    return null;
  };

  if (isLoading) {
    return <PageSkeleton variant="table" />;
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Autorizações de Inspetores
          </CardTitle>
          <CardDescription>
            Atribua um código (slot) para liberar o acesso do inspetor logado. Enquanto não houver código, o inspetor vê “aguardando autorização”.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Conta (pendente)</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={pendingUsers.length ? 'Selecione um inspetor' : 'Sem pendências'} />
                </SelectTrigger>
                <SelectContent>
                  {pendingUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {formatPendingUserLabel(u)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Código (slot)</Label>
              <Select value={selectedInspectorId} onValueChange={setSelectedInspectorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um código" />
                </SelectTrigger>
                <SelectContent>
                  {inspectors.map((i) => {
                    const isAssigned = assignments.some((a) => a.inspector_id === i.id);
                    return (
                      <SelectItem key={i.id} value={i.id} disabled={!i.active || isAssigned}>
                        {i.code} — {i.name} {!i.active ? '(inativo)' : isAssigned ? '(em uso)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                className="w-full"
                disabled={!selectedUserId || !selectedInspectorId || assignmentsLoading}
                onClick={async () => {
                  try {
                    await assign({ user_id: selectedUserId, inspector_id: selectedInspectorId });
                    toast.success('Código atribuído com sucesso!');
                    setSelectedUserId('');
                    setSelectedInspectorId('');
                  } catch (error: any) {
                    toast.error(error?.message ?? 'Erro ao atribuir código');
                  }
                }}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Autorizar
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">Conta</TableHead>
                  <TableHead className="font-semibold">Código</TableHead>
                  <TableHead className="font-semibold">Desde</TableHead>
                  <TableHead className="text-right font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="text-sm font-medium">{formatAccountTitle(a)}</div>
                      {formatAccountSubtitle(a) && (
                        <div className="text-xs text-muted-foreground">{formatAccountSubtitle(a)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="px-2.5 py-1 bg-muted rounded-md text-sm font-mono border border-border/50">
                        {a.inspector_code ?? a.inspector_id}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(a.assigned_at ?? null)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await unassign(a.id);
                            toast.success('Autorização removida');
                          } catch (error: any) {
                            toast.error(error?.message ?? 'Erro ao remover autorização');
                          }
                        }}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Revogar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {assignments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      Nenhuma autorização ativa.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Header com gradiente */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-border/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestão de Inspetores</h1>
              <p className="text-muted-foreground mt-1">
                Cadastre e gerencie os inspetores do sistema
              </p>
            </div>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg">
                <Plus className="h-5 w-5 mr-2" />
                Novo Inspetor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Inspetor</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo inspetor
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    placeholder="Ex: João Silva"
                    value={newInspector.name}
                    onChange={(e) => setNewInspector({ ...newInspector, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Código do Inspetor</Label>
                  <Input
                    id="code"
                    placeholder="Ex: ATAVEND01"
                    value={newInspector.code}
                    onChange={(e) => setNewInspector({ ...newInspector, code: e.target.value.toUpperCase() })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Código usado para identificar o inspetor nas pastas de ordens
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddInspector} disabled={isSubmitting}>
                  {isSubmitting ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inspectors.length}</p>
                <p className="text-sm text-muted-foreground">Total de Inspetores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <UserX className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveCount}</p>
                <p className="text-sm text-muted-foreground">Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Inspetores Cadastrados
              </CardTitle>
              <CardDescription>
                {filteredInspectors.length} inspetor(es) encontrado(s)
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInspectors.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Users className="h-12 w-12 opacity-50" />
              </div>
              <p className="font-medium">Nenhum inspetor encontrado</p>
              <p className="text-sm mt-1">Tente ajustar sua busca ou adicione um novo inspetor</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Inspetor</TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-1">
                        <Hash className="h-3.5 w-3.5" />
                        Código
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Cadastrado em
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInspectors.map((inspector, index) => (
                    <TableRow 
                      key={inspector.id}
                      className="group hover:bg-muted/50 transition-colors"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-border">
                            <AvatarFallback className={`text-sm font-medium ${inspector.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              {getInitials(inspector.name ?? '')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{inspector.name}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{inspector.code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <code className="px-2.5 py-1 bg-muted rounded-md text-sm font-mono border border-border/50">
                          {inspector.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={inspector.active ? 'default' : 'secondary'}
                          className={inspector.active ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20' : ''}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${inspector.active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                          {inspector.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(inspector.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Switch 
                            checked={inspector.active ?? false}
                            onCheckedChange={() => handleToggleActive(inspector.id, inspector.active)}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openEditDialog(inspector)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Inspetor</DialogTitle>
            <DialogDescription>
              Atualize os dados do inspetor
            </DialogDescription>
          </DialogHeader>
          {editingInspector && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome Completo</Label>
                <Input
                  id="edit-name"
                  placeholder="Ex: João Silva"
                  value={editingInspector.name}
                  onChange={(e) => setEditingInspector({ ...editingInspector, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-code">Código do Inspetor</Label>
                <Input
                  id="edit-code"
                  placeholder="Ex: ATAVEND01"
                  value={editingInspector.code}
                  onChange={(e) => setEditingInspector({ ...editingInspector, code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditInspector} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterInspectors;
