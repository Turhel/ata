import { useState } from 'react';
import { useInspectionScopes, InspectionScope, ScopeItem } from '@/hooks/useInspectionScopes';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useAppUser } from '@/hooks/useAppUser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose, DrawerFooter } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AnimatedSkeleton } from '@/components/ui/animated-skeleton';
import { Plus, Trash2, ListChecks, Copy, Eye, Edit } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const InspectionScopes = () => {
  const { scopes, isLoading, createScope, updateScope, toggleItemDone, deleteScope } = useInspectionScopes();
  const { isMaster } = useUserRole();
  const { user } = useAuth();
  const { appUser } = useAppUser();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState<InspectionScope | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [formData, setFormData] = useState({
    orderId: '',
    kind: '',
    visibility: 'private',
    routePoint: '',
    lossReason: '',
    itemsText: ''
  });

  const resetForm = () => {
    setFormData({ orderId: '', kind: '', visibility: 'private', routePoint: '', lossReason: '', itemsText: '' });
  };

  const parseItems = (itemsText: string) => {
    const lines = itemsText
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    const items: Array<Pick<ScopeItem, 'sort_order' | 'area' | 'label' | 'notes' | 'required'>> = [];
    lines.forEach((line, idx) => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const area = parts[0].trim();
        const label = parts.slice(1).join(':').trim();
        items.push({ sort_order: idx + 1, area: area || null, label: label || null, notes: null, required: true });
      } else {
        items.push({ sort_order: idx + 1, area: null, label: line, notes: null, required: true });
      }
    });
    return items;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = parseItems(formData.itemsText);

    const success = await createScope({
      order_id: formData.orderId,
      kind: formData.kind || null,
      visibility: formData.visibility || 'private',
      route_point: formData.routePoint || null,
      loss_reason: formData.lossReason || null,
      items
    });

    if (success) {
      resetForm();
      setIsCreateDialogOpen(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScope) return;

    const items = parseItems(formData.itemsText);

    const success = await updateScope(selectedScope.id, {
      order_id: formData.orderId,
      kind: formData.kind || null,
      visibility: formData.visibility || 'private',
      route_point: formData.routePoint || null,
      loss_reason: formData.lossReason || null,
      items
    });

    if (success) {
      resetForm();
      setIsEditDialogOpen(false);
      setSelectedScope(null);
    }
  };

  const openEditDialog = (scope: InspectionScope) => {
    setSelectedScope(scope);
    setFormData({
      orderId: scope.order_external_id || scope.external_id || scope.order_id,
      kind: scope.kind || '',
      visibility: scope.visibility || 'private',
      routePoint: scope.route_point || '',
      lossReason: scope.loss_reason || '',
      itemsText: (scope.items || []).map((i) => `${i.area ? `${i.area}: ` : ''}${i.label ?? ''}`).join('\n')
    });
    setIsEditDialogOpen(true);
  };

  const openViewDrawer = (scope: InspectionScope) => {
    setSelectedScope(scope);
    setIsDrawerOpen(true);
  };

  const handleCopyScope = (scope: InspectionScope) => {
    const orderLabel = scope.order_external_id || scope.external_id || scope.order_id;
    const header = `🧾 Ordem: ${orderLabel}\n📌 Kind: ${scope.kind || '-'}`;
    const routeLine = scope.route_point ? `\nRota: ${scope.route_point}` : '';
    const lossLine = scope.loss_reason ? `\nLoss: ${scope.loss_reason}` : '';
    const visLine = scope.visibility ? `\nVisibilidade: ${scope.visibility}` : '';
    const itemsText = (scope.items || [])
      .map((item, i) => `${i + 1}. ${item.area ? `${item.area}: ` : ''}${item.label ?? ''}`)
      .join('\n');
    const text = `${header}${routeLine}${lossLine}${visLine}\n\nItens:\n${itemsText}`;
    navigator.clipboard.writeText(text);
    toast.success('Escopo copiado para a área de transferência!');
  };

  const canEditDelete = (scope: InspectionScope) => {
    // Compat: alguns ambientes podem ainda ter `created_by` antigo (clerk_user_id).
    return isMaster || scope.created_by === appUser?.id || scope.created_by === user?.id;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            Escopos de Inspeção
          </h1>
          <p className="text-muted-foreground">
            Escopos registrados por ordem (`scopes` + `scope_items`)
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Escopo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Novo Escopo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-order-id">Número da Ordem *</Label>
                <Input
                  id="create-order-id"
                  value={formData.orderId}
                  onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                  placeholder="Ex: 352990891"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-kind">Kind (opcional)</Label>
                <Input
                  id="create-kind"
                  value={formData.kind}
                  onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
                  placeholder="Ex: default, follow-up"
                />
              </div>
              <div className="space-y-2">
                <Label>Visibilidade</Label>
                <Select value={formData.visibility} onValueChange={(v) => setFormData({ ...formData, visibility: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">private</SelectItem>
                    <SelectItem value="public">public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-route-point">Rota (opcional)</Label>
                <Input
                  id="create-route-point"
                  value={formData.routePoint}
                  onChange={(e) => setFormData({ ...formData, routePoint: e.target.value })}
                  placeholder="Ex: Ponto 12 / Rua X"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-loss-reason">Loss (opcional)</Label>
                <Textarea
                  id="create-loss-reason"
                  value={formData.lossReason}
                  onChange={(e) => setFormData({ ...formData, lossReason: e.target.value })}
                  placeholder="Motivo de rejeição / perda..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-items">Itens do Escopo *</Label>
                <p className="text-xs text-muted-foreground">Um item por linha. Suporta: `Área: Item`</p>
                <Textarea
                  id="create-items"
                  value={formData.itemsText}
                  onChange={(e) => setFormData({ ...formData, itemsText: e.target.value })}
                  placeholder={"Exterior: Fachada\nExterior: Telhado\nInterior: Sala\nInterior: Cozinha"}
                  rows={6}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Escopo</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => (
                <AnimatedSkeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : scopes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListChecks className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum escopo cadastrado. Clique em "Novo Escopo" para criar o primeiro.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead className="hidden md:table-cell">Kind</TableHead>
                  <TableHead className="hidden lg:table-cell">Visibilidade</TableHead>
                  <TableHead className="hidden sm:table-cell">Itens</TableHead>
                  <TableHead className="hidden lg:table-cell">Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopes.map((scope) => (
                  <TableRow key={scope.id}>
                    <TableCell className="font-mono">{scope.order_external_id || scope.external_id || scope.order_id}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                      {scope.kind || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {scope.visibility || '-'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {(scope.items?.filter((i) => i.done).length || 0)}/{scope.items?.length || 0} feitos
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {format(new Date(scope.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openViewDrawer(scope)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyScope(scope)}
                          title="Copiar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {canEditDelete(scope) && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(scope)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir Escopo</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este escopo ({scope.kind || 'sem kind'})? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                  </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteScope(scope.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Escopo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-order-id">Número da Ordem *</Label>
              <Input
                id="edit-order-id"
                value={formData.orderId}
                onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-kind">Kind (opcional)</Label>
              <Input
                id="edit-kind"
                value={formData.kind}
                onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
                placeholder="Ex: default, follow-up"
              />
            </div>
            <div className="space-y-2">
              <Label>Visibilidade</Label>
              <Select value={formData.visibility} onValueChange={(v) => setFormData({ ...formData, visibility: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">private</SelectItem>
                  <SelectItem value="public">public</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-route-point">Rota (opcional)</Label>
              <Input
                id="edit-route-point"
                value={formData.routePoint}
                onChange={(e) => setFormData({ ...formData, routePoint: e.target.value })}
                placeholder="Ex: Ponto 12 / Rua X"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-loss-reason">Loss (opcional)</Label>
              <Textarea
                id="edit-loss-reason"
                value={formData.lossReason}
                onChange={(e) => setFormData({ ...formData, lossReason: e.target.value })}
                placeholder="Motivo de rejeição / perda..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-items">Itens do Escopo *</Label>
              <p className="text-xs text-muted-foreground">Um item por linha. Suporta: `Área: Item`</p>
              <Textarea
                id="edit-items"
                value={formData.itemsText}
                onChange={(e) => setFormData({ ...formData, itemsText: e.target.value })}
                rows={6}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              {selectedScope?.kind || 'Escopo'}
            </DrawerTitle>
            {selectedScope?.order_id && (
              <DrawerDescription>
                Ordem: {selectedScope.order_external_id || selectedScope.external_id || selectedScope.order_id}
                {selectedScope.visibility ? ` · Visibilidade: ${selectedScope.visibility}` : ''}
                {selectedScope.route_point ? ` · Rota: ${selectedScope.route_point}` : ''}
              </DrawerDescription>
            )}
            {selectedScope?.loss_reason && <DrawerDescription>Loss: {selectedScope.loss_reason}</DrawerDescription>}
          </DrawerHeader>
          <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Itens do Escopo ({selectedScope?.items.length || 0})
              </h4>
              <ul className="space-y-2">
                {selectedScope?.items
                  ?.slice()
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((item, index) => {
                    const canPersist = selectedScope ? canEditDelete(selectedScope) : false;
                    const label = `${item.area ? `${item.area}: ` : ''}${item.label ?? ''}`.trim();

                    const onCheckedChange = async (checked: boolean | "indeterminate") => {
                      if (!selectedScope) return;
                      if (!canPersist) return;
                      await toggleItemDone(selectedScope.id, item.id, checked === true);
                    };

                    return (
                      <li
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="pt-0.5">
                          <Checkbox checked={!!item.done} onCheckedChange={onCheckedChange} disabled={!canPersist} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            <span className="mr-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                              {index + 1}
                            </span>
                            <span className={item.done ? "line-through text-muted-foreground" : ""}>
                              {label || '(sem label)'}
                            </span>
                            {!item.required && (
                              <span className="ml-2 text-xs text-muted-foreground">(opcional)</span>
                            )}
                          </div>
                          {item.notes && <div className="text-xs text-muted-foreground mt-1">{item.notes}</div>}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={() => selectedScope && handleCopyScope(selectedScope)}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Escopo
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Fechar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default InspectionScopes;
