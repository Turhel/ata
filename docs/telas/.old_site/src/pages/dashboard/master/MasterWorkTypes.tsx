import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Loader2, 
  Edit2, 
  Check, 
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWorkTypes, useWorkTypeRequests, WorkType, WorkTypeRequest } from '@/hooks/useWorkTypes';
import { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';

type WorkCategory = Database['public']['Enums']['work_category'];

const CATEGORY_LABELS: Record<WorkCategory, string> = {
  regular: 'Regular',
  exterior: 'Exterior',
  interior: 'Interior',
  fint: 'FINT',
};

const CATEGORY_COLORS: Record<WorkCategory, string> = {
  regular: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  exterior: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  interior: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
  fint: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
};

export default function MasterWorkTypes() {
  const { user } = useAuth();
  const { workTypes, isLoading, refetch, createWorkType, updateWorkType, toggleWorkTypeStatus } = useWorkTypes();
  const { requests, pendingRequests, isLoading: requestsLoading, refetch: refetchRequests, reviewRequest } = useWorkTypeRequests();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'types' | 'requests'>('types');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<WorkType | null>(null);
  const [reviewingRequest, setReviewingRequest] = useState<WorkTypeRequest | null>(null);
  
  // Form state
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<WorkCategory>('regular');
  const [formInspectorValue, setFormInspectorValue] = useState('');
  const [formAssistantValue, setFormAssistantValue] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewCategory, setReviewCategory] = useState<WorkCategory>('regular');
  const [reviewInspectorValue, setReviewInspectorValue] = useState('');
  const [reviewAssistantValue, setReviewAssistantValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTypes = workTypes.filter(wt => {
    const matchesSearch = wt.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wt.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || wt.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Stats
  const stats = useMemo(() => {
    const active = workTypes.filter(wt => wt.active);
    const withValues = active.filter(
      (wt) => (Number(wt.assistant_value ?? 0) || 0) > 0 || (Number(wt.inspector_value ?? 0) || 0) > 0,
    );
    const withoutValues = active.filter(
      (wt) => (Number(wt.assistant_value ?? 0) || 0) === 0 && (Number(wt.inspector_value ?? 0) || 0) === 0,
    );
    return {
      total: active.length,
      withPricing: withValues.length,
      withoutPricing: withoutValues.length,
      byCategory: {
        regular: active.filter(wt => wt.category === 'regular').length,
        exterior: active.filter(wt => wt.category === 'exterior').length,
        interior: active.filter(wt => wt.category === 'interior').length,
        fint: active.filter(wt => wt.category === 'fint').length,
      },
    };
  }, [workTypes]);

  const handleCreateType = async () => {
    if (!formCode.trim() || !user) return;
    
    setIsSubmitting(true);
    try {
      const inspVal = parseFloat(formInspectorValue) || 0;
      const assVal = parseFloat(formAssistantValue) || 0;

      const result = await createWorkType({
        code: formCode,
        description: formDescription,
        category: formCategory,
        inspector_value: inspVal,
        assistant_value: assVal,
      });
      
      if (result) {
        setCreateDialogOpen(false);
        resetForm();
        refetch();
      }
    } catch (error) {
      console.error('Error creating work type:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateType = async () => {
    if (!editingType || !formCode.trim() || !user) return;
    
    setIsSubmitting(true);
    try {
      const inspVal = parseFloat(formInspectorValue) || 0;
      const assVal = parseFloat(formAssistantValue) || 0;

      await updateWorkType(editingType.id, {
        code: formCode,
        description: formDescription,
        category: formCategory,
        inspector_value: inspVal,
        assistant_value: assVal,
      });
      
      setEditingType(null);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error updating work type:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewRequest = async (action: 'approve' | 'reject') => {
    if (!reviewingRequest) return;
    
    setIsSubmitting(true);
    const inspVal = parseFloat(reviewInspectorValue) || 0;
    const assVal = parseFloat(reviewAssistantValue) || 0;

    const success = await reviewRequest(
      reviewingRequest.id, 
      action, 
      reviewNotes, 
      action === 'approve' ? reviewCategory : undefined,
      action === 'approve'
        ? { inspector_value: inspVal, assistant_value: assVal }
        : undefined
    );
    if (success && action === 'approve') refetch();
    
    setIsSubmitting(false);
    setReviewingRequest(null);
    setReviewNotes('');
    setReviewCategory('regular');
    setReviewInspectorValue('');
    setReviewAssistantValue('');
  };

  const resetForm = () => {
    setFormCode('');
    setFormDescription('');
    setFormCategory('regular');
    setFormInspectorValue('');
    setFormAssistantValue('');
  };

  const openEditDialog = (type: WorkType) => {
    setFormCode(type.code);
    setFormDescription(type.description || '');
    setFormCategory(type.category);
    setFormInspectorValue(type.inspector_value != null ? String(type.inspector_value) : '');
    setFormAssistantValue(type.assistant_value != null ? String(type.assistant_value) : '');
    setEditingType(type);
  };

  const openReviewDialog = (request: WorkTypeRequest) => {
    setReviewCategory(request.suggested_category || 'regular');
    setReviewNotes('');
    setReviewInspectorValue('');
    setReviewAssistantValue('');
    setReviewingRequest(request);
  };

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const handleRefresh = () => {
    refetch();
    refetchRequests();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tipos de Ordem e Preços</h1>
          <p className="text-muted-foreground">
            Gerencie os códigos de tipos de ordem, categorias e valores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => {
            resetForm();
            setCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tipo
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading || requestsLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || requestsLoading) ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Tipos Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-4/10">
                <DollarSign className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withPricing}</p>
                <p className="text-xs text-muted-foreground">Com Preço</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {stats.withoutPricing > 0 && (
          <Card className="bg-chart-3/10 border-chart-3/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-3/20">
                  <AlertCircle className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-chart-3">{stats.withoutPricing}</p>
                  <p className="text-xs text-muted-foreground">Sem Preço</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {(Object.keys(CATEGORY_LABELS) as WorkCategory[]).map((cat) => (
          <Card key={cat} className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={CATEGORY_COLORS[cat]}>
                  {CATEGORY_LABELS[cat]}
                </Badge>
                <p className="text-xl font-bold">{stats.byCategory[cat]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'types' | 'requests')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="types">
            Tipos e Preços
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {workTypes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Solicitações
            {pendingRequests.length > 0 && (
              <Badge className="ml-2 h-5 px-1.5 text-xs bg-chart-3 text-white">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tipo de ordem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {(Object.keys(CATEGORY_LABELS) as WorkCategory[]).map((cat) => (
                  <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Tipos de Ordem e Preços</CardTitle>
              <CardDescription>
                {filteredTypes.length} tipo(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTypes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum tipo de ordem encontrado.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Inspetor</TableHead>
                      <TableHead className="text-right">Assistente</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTypes.map((type) => (
                      <TableRow key={type.id} className={!type.active ? 'opacity-50' : ''}>
                        <TableCell>
                          <code className="px-2 py-1 bg-muted rounded text-sm font-medium">
                            {type.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={CATEGORY_COLORS[type.category]}>
                            {CATEGORY_LABELS[type.category]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {type.description || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(type.inspector_value)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(type.assistant_value)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {type.inspector_value != null || type.assistant_value != null
                            ? formatCurrency(Number(type.inspector_value ?? 0) + Number(type.assistant_value ?? 0))
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {type.active ? (
                              <Badge variant="default" className="text-xs">Ativo</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Inativo</Badge>
                            )}
                            {type.active &&
                              Number(type.inspector_value ?? 0) <= 0 &&
                              Number(type.assistant_value ?? 0) <= 0 && (
                              <Badge variant="outline" className="text-xs bg-chart-3/10 text-chart-3 border-chart-3/30">
                                Sem preço
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Switch
                              checked={type.active}
                              onCheckedChange={(checked) => toggleWorkTypeStatus(type.id, checked)}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openEditDialog(type)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
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

        <TabsContent value="requests" className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Solicitações de Novos Tipos</CardTitle>
              <CardDescription>
                Solicitações encaminhadas por admins para aprovação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma solicitação pendente de aprovação.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-chart-3/10 border border-chart-3/30"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-chart-3" />
                          <span className="font-mono font-medium text-lg">{request.code}</span>
                          {request.suggested_category && (
                            <Badge variant="outline" className={CATEGORY_COLORS[request.suggested_category]}>
                              Sugerido: {CATEGORY_LABELS[request.suggested_category]}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Solicitado por: {request.requester_name} • {new Date(request.requested_at).toLocaleDateString('pt-BR')}
                        </p>
                        {request.admin_notes && (
                          <p className="text-sm text-muted-foreground">
                            <strong>Nota do Admin:</strong> {request.admin_notes}
                          </p>
                        )}
                      </div>
                      <Button onClick={() => openReviewDialog(request)}>
                        Analisar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* History */}
              {requests.filter(r => r.status !== 'pending').length > 0 && (
                <div className="mt-8">
                  <h4 className="font-medium mb-4 text-muted-foreground">Histórico</h4>
                  <div className="space-y-2">
                    {requests.filter(r => r.status !== 'pending').slice(0, 10).map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/20"
                      >
                        <div className="flex items-center gap-3">
                          {request.status === 'approved' ? (
                            <CheckCircle2 className="h-4 w-4 text-chart-4" />
                          ) : (
                            <X className="h-4 w-4 text-destructive" />
                          )}
                          <span className="font-mono">{request.code}</span>
                          <span className="text-sm text-muted-foreground">
                            por {request.requester_name}
                          </span>
                        </div>
                        <Badge variant={request.status === 'approved' ? 'default' : 'destructive'}>
                          {request.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Tipo de Ordem</DialogTitle>
            <DialogDescription>
              Adicione um novo código de tipo de ordem com precificação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  placeholder="Ex: FI, E3RNN..."
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v as WorkCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as WorkCategory[]).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Descrição opcional"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inspectorValue">Valor Inspetor ($)</Label>
                <Input
                  id="inspectorValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formInspectorValue}
                  onChange={(e) => setFormInspectorValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assistantValue">Valor Assistente ($)</Label>
                <Input
                  id="assistantValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formAssistantValue}
                  onChange={(e) => setFormAssistantValue(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateType} disabled={!formCode.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Tipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingType} onOpenChange={() => setEditingType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Tipo de Ordem</DialogTitle>
            <DialogDescription>
              Modifique as informações e valores do tipo de ordem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Código *</Label>
                <Input
                  id="edit-code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v as WorkCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as WorkCategory[]).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-inspectorValue">Valor Inspetor ($)</Label>
                <Input
                  id="edit-inspectorValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formInspectorValue}
                  onChange={(e) => setFormInspectorValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-assistantValue">Valor Assistente ($)</Label>
                <Input
                  id="edit-assistantValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formAssistantValue}
                  onChange={(e) => setFormAssistantValue(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingType(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateType} disabled={!formCode.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Request Dialog */}
      <Dialog open={!!reviewingRequest} onOpenChange={() => setReviewingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analisar Solicitação</DialogTitle>
            <DialogDescription>
              Aprove ou rejeite a solicitação de novo tipo de ordem.
            </DialogDescription>
          </DialogHeader>
          {reviewingRequest && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="font-mono text-lg font-medium">{reviewingRequest.code}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Solicitado por: {reviewingRequest.requester_name}
                </p>
                {reviewingRequest.admin_notes && (
                  <p className="text-sm mt-2">
                    <strong>Nota do Admin:</strong> {reviewingRequest.admin_notes}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={reviewCategory} onValueChange={(v) => setReviewCategory(v as WorkCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as WorkCategory[]).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <Badge variant="outline" className={CATEGORY_COLORS[cat]}>
                          {CATEGORY_LABELS[cat]}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="review-inspectorValue">Valor Inspetor ($)</Label>
                  <Input
                    id="review-inspectorValue"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reviewInspectorValue}
                    onChange={(e) => setReviewInspectorValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-assistantValue">Valor Assistente ($)</Label>
                  <Input
                    id="review-assistantValue"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reviewAssistantValue}
                    onChange={(e) => setReviewAssistantValue(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Adicione uma observação (opcional)"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="destructive" 
              onClick={() => handleReviewRequest('reject')}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
            <Button 
              onClick={() => handleReviewRequest('approve')}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Aprovar e Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
