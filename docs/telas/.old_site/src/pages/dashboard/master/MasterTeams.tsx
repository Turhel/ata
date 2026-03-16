import { useState, useMemo, DragEvent } from 'react';
import { useTeamAssignments } from '@/hooks/useTeamAssignments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/animated-skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { UserPlus, Users, Search, Trash2, ArrowRightLeft, Shield, Mail, UserCheck, UserX, PieChart, GripVertical, LayoutGrid, List, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const MasterTeams = () => {
  const { 
    teams, 
    unassignedAssistants, 
    availableAdmins, 
    isLoading, 
    stats,
    assignAssistant,
    removeAssignment,
    transferAssistant
  } = useTeamAssignments();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [selectedAssistant, setSelectedAssistant] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Transfer state
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferData, setTransferData] = useState<{
    assistantId: string;
    assistantName: string;
    fromAdminId: string;
    fromAdminName: string;
  } | null>(null);
  const [targetAdminId, setTargetAdminId] = useState('');

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{
    id: string;
    name: string;
    type: 'unassigned' | 'assigned';
    fromAdminId?: string;
    assignmentId?: string;
  } | null>(null);
  const [dragOverAdminId, setDragOverAdminId] = useState<string | null>(null);
  
  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const filteredTeams = teams.filter(
    (team) =>
      team.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.assistants.some((a) => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAssign = async () => {
    if (!selectedAdmin || !selectedAssistant) {
      toast.error('Selecione o administrador e o assistente');
      return;
    }

    setIsSubmitting(true);
    try {
      await assignAssistant(selectedAdmin, selectedAssistant);
      toast.success('Assistente atribuído com sucesso!');
      setIsAssignDialogOpen(false);
      setSelectedAdmin('');
      setSelectedAssistant('');
    } catch (error) {
      toast.error('Erro ao atribuir assistente');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, assistantName: string) => {
    try {
      await removeAssignment(assignmentId);
      toast.success(`${assistantName} removido da equipe`);
    } catch (error) {
      toast.error('Erro ao remover assistente');
      console.error(error);
    }
  };

  const openTransferDialog = (assistant: { id: string; name: string }, team: { adminId: string; adminName: string }) => {
    setTransferData({
      assistantId: assistant.id,
      assistantName: assistant.name,
      fromAdminId: team.adminId,
      fromAdminName: team.adminName,
    });
    setTargetAdminId('');
    setIsTransferDialogOpen(true);
  };

  const handleTransfer = async () => {
    if (!transferData || !targetAdminId) {
      toast.error('Selecione o administrador de destino');
      return;
    }

    setIsSubmitting(true);
    try {
      await transferAssistant(transferData.assistantId, transferData.fromAdminId, targetAdminId);
      toast.success(`${transferData.assistantName} transferido com sucesso!`);
      setIsTransferDialogOpen(false);
      setTransferData(null);
      setTargetAdminId('');
    } catch (error) {
      toast.error('Erro ao transferir assistente');
      console.error(error);
    } finally {
      setIsSubmitting(false);
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

  // Drag and drop handlers
  const handleDragStart = (
    e: DragEvent<HTMLDivElement>,
    item: typeof draggedItem
  ) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    // Add a visual indicator
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    setDraggedItem(null);
    setDragOverAdminId(null);
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, adminId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverAdminId(adminId);
  };

  const handleDragLeave = () => {
    setDragOverAdminId(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetAdminId: string) => {
    e.preventDefault();
    setDragOverAdminId(null);

    if (!draggedItem) return;

    // Don't do anything if dropping on the same admin
    if (draggedItem.type === 'assigned' && draggedItem.fromAdminId === targetAdminId) {
      setDraggedItem(null);
      return;
    }

    try {
      setIsSubmitting(true);
      if (draggedItem.type === 'unassigned') {
        // Assign unassigned assistant to admin
        await assignAssistant(targetAdminId, draggedItem.id);
        toast.success(`${draggedItem.name} atribuído com sucesso!`);
      } else if (draggedItem.type === 'assigned' && draggedItem.fromAdminId) {
        // Transfer from one admin to another
        await transferAssistant(draggedItem.id, draggedItem.fromAdminId, targetAdminId);
        toast.success(`${draggedItem.name} transferido com sucesso!`);
      }
    } catch (error) {
      toast.error('Erro ao mover assistente');
      console.error(error);
    } finally {
      setIsSubmitting(false);
      setDraggedItem(null);
    }
  };

  if (isLoading) {
    return <PageSkeleton variant="cards" />;
  }

  return (
    <div className="space-y-6">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-border/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestão de Equipes</h1>
              <p className="text-muted-foreground mt-1">
                Atribua assistentes aos administradores
              </p>
            </div>
          </div>
          
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg" disabled={unassignedAssistants.length === 0}>
                <UserPlus className="h-5 w-5 mr-2" />
                Nova Atribuição
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Atribuir Assistente</DialogTitle>
                <DialogDescription>
                  Selecione o administrador e o assistente para criar a atribuição
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="admin">Administrador</Label>
                  <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o administrador" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAdmins.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-purple-500" />
                            {admin.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assistant">Assistente (Não Atribuído)</Label>
                  <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o assistente" />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedAssistants.map((assistant) => (
                        <SelectItem key={assistant.id} value={assistant.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            {assistant.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {unassignedAssistants.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Todos os assistentes já estão atribuídos
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAssign} disabled={isSubmitting || !selectedAdmin || !selectedAssistant}>
                  {isSubmitting ? 'Atribuindo...' : 'Atribuir'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Shield className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalAdmins}</p>
                <p className="text-sm text-muted-foreground">Administradores</p>
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
                <p className="text-2xl font-bold">{stats.totalAssistants}</p>
                <p className="text-sm text-muted-foreground">Assistentes Atribuídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <UserX className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unassignedCount}</p>
                <p className="text-sm text-muted-foreground">Não Atribuídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Chart */}
      {teams.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <span className="hidden sm:inline">Distribuição de Assistentes por Administrador</span>
              <span className="sm:hidden">Distribuição por Admin</span>
            </CardTitle>
            <CardDescription className="hidden sm:block">
              Visualização da quantidade de assistentes atribuídos a cada administrador
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Pie Chart */}
              <div className="h-[220px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={teams.map((team, index) => ({
                        name: team.adminName.split(' ')[0],
                        value: team.assistants.length,
                        fullName: team.adminName,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {teams.map((_, index) => {
                        const colors = [
                          'hsl(var(--primary))',
                          'hsl(142, 76%, 36%)',
                          'hsl(221, 83%, 53%)',
                          'hsl(262, 83%, 58%)',
                          'hsl(24, 95%, 53%)',
                          'hsl(340, 75%, 55%)',
                          'hsl(199, 89%, 48%)',
                          'hsl(47, 95%, 53%)',
                        ];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-2 sm:p-3 shadow-lg text-sm">
                              <p className="font-medium">{data.fullName}</p>
                              <p className="text-muted-foreground">
                                {data.value} assistente{data.value !== 1 ? 's' : ''}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Chart */}
              <div className="h-[220px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={teams.map((team) => ({
                      name: team.adminName.split(' ')[0],
                      assistentes: team.assistants.length,
                      fullName: team.adminName,
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                    <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={60} 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                      tickMargin={4}
                    />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-2 sm:p-3 shadow-lg text-sm">
                              <p className="font-medium">{data.fullName}</p>
                              <p className="text-muted-foreground">
                                {data.assistentes} assistente{data.assistentes !== 1 ? 's' : ''}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="assistentes" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por admin ou assistente..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'list' | 'kanban')}>
          <ToggleGroupItem value="list" aria-label="Visualização em lista">
            <List className="h-4 w-4 mr-2" />
            Lista
          </ToggleGroupItem>
          <ToggleGroupItem value="kanban" aria-label="Visualização Kanban">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Kanban
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Teams - Empty State */}
      {filteredTeams.length === 0 ? (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Users className="h-12 w-12 opacity-50" />
              </div>
              <p className="font-medium">Nenhuma equipe encontrada</p>
              <p className="text-sm mt-1">Ajuste a busca ou crie novas atribuições</p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="space-y-4">
          {/* Unassigned Pool at the top in Kanban */}
          {unassignedAssistants.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserX className="h-4 w-4 text-amber-500" />
                  Assistentes Não Atribuídos ({unassignedAssistants.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex flex-wrap gap-2">
                  {unassignedAssistants.map((assistant) => (
                    <div
                      key={assistant.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-card/80 cursor-grab active:cursor-grabbing hover:bg-card transition-colors"
                      draggable
                      onDragStart={(e) => handleDragStart(e, {
                        id: assistant.id,
                        name: assistant.name,
                        type: 'unassigned',
                      })}
                      onDragEnd={handleDragEnd}
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                      <Avatar className="h-6 w-6 border border-amber-500/20">
                        {assistant.avatarUrl ? <AvatarImage src={assistant.avatarUrl} alt={assistant.name} /> : null}
                        <AvatarFallback className="bg-amber-500/10 text-amber-600 text-xs">
                          {getInitials(assistant.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{assistant.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Kanban Columns */}
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4 min-w-max">
              {filteredTeams.map((team) => {
                const adminInfo = availableAdmins.find(a => a.id === team.adminId);
                const isMasterAdmin = adminInfo?.isMaster;
                
                return (
                  <div
                    key={team.adminId}
                    className={`w-72 flex-shrink-0 rounded-xl border bg-card/50 backdrop-blur transition-all duration-200 ${
                      dragOverAdminId === team.adminId 
                        ? 'ring-2 ring-primary border-primary/50 scale-[1.02]' 
                        : 'border-border/50'
                    }`}
                    onDragOver={(e) => handleDragOver(e, team.adminId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, team.adminId)}
                  >
                    {/* Column Header */}
                    <div className={`p-4 border-b border-border/50 rounded-t-xl ${
                      isMasterAdmin 
                        ? 'bg-gradient-to-r from-amber-500/10 to-transparent' 
                        : 'bg-gradient-to-r from-purple-500/5 to-transparent'
                    }`}>
                      <div className="flex items-center gap-3">
                        <Avatar className={`h-10 w-10 border-2 ${isMasterAdmin ? 'border-amber-500/30' : 'border-purple-500/20'}`}>
                          {team.adminAvatarUrl ? <AvatarImage src={team.adminAvatarUrl} alt={team.adminName} /> : null}
                          <AvatarFallback className={`text-sm font-medium ${
                            isMasterAdmin ? 'bg-amber-500/10 text-amber-600' : 'bg-purple-500/10 text-purple-600'
                          }`}>
                            {getInitials(team.adminName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{team.adminName}</p>
                            {isMasterAdmin && (
                              <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{team.adminEmail}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="mt-2">
                        {team.assistants.length} assistente{team.assistants.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    {/* Column Content */}
                    <div className={`p-3 min-h-[200px] ${
                      dragOverAdminId === team.adminId && draggedItem ? 'bg-primary/5' : ''
                    }`}>
                      {team.assistants.length === 0 ? (
                        <div className={`h-full flex items-center justify-center border-2 border-dashed rounded-lg py-8 transition-colors ${
                          dragOverAdminId === team.adminId ? 'border-primary bg-primary/5' : 'border-border/50'
                        }`}>
                          <p className="text-sm text-muted-foreground">
                            {draggedItem ? 'Solte aqui' : 'Sem assistentes'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {team.assistants.map((assistant) => (
                            <div
                              key={assistant.id}
                              className="group flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-colors"
                              draggable
                              onDragStart={(e) => handleDragStart(e, {
                                id: assistant.id,
                                name: assistant.name,
                                type: 'assigned',
                                fromAdminId: team.adminId,
                                assignmentId: assistant.assignmentId,
                              })}
                              onDragEnd={handleDragEnd}
                            >
                              <GripVertical className="h-3 w-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
                              <Avatar className="h-7 w-7 border border-border">
                                {assistant.avatarUrl ? <AvatarImage src={assistant.avatarUrl} alt={assistant.name} /> : null}
                                <AvatarFallback className="bg-blue-500/10 text-blue-600 text-xs">
                                  {getInitials(assistant.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{assistant.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{assistant.email}</p>
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                                      onClick={() => handleRemoveAssignment(assistant.assignmentId, assistant.name)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Remover</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {filteredTeams.map((team, teamIndex) => {
            const adminInfo = availableAdmins.find(a => a.id === team.adminId);
            const isMasterAdmin = adminInfo?.isMaster;
            
            return (
            <Card 
              key={team.adminId} 
              className={`border-border/50 bg-card/50 backdrop-blur overflow-hidden transition-all duration-200 ${
                dragOverAdminId === team.adminId ? 'ring-2 ring-primary border-primary/50 scale-[1.01]' : ''
              }`}
              style={{ animationDelay: `${teamIndex * 50}ms` }}
              onDragOver={(e) => handleDragOver(e, team.adminId)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, team.adminId)}
            >
              <CardHeader className={`border-b border-border/50 ${
                isMasterAdmin 
                  ? 'bg-gradient-to-r from-amber-500/10 to-transparent' 
                  : 'bg-gradient-to-r from-purple-500/5 to-transparent'
              }`}>
                <div className="flex items-center gap-4">
                  <Avatar className={`h-14 w-14 border-2 ${isMasterAdmin ? 'border-amber-500/30' : 'border-purple-500/20'}`}>
                    {team.adminAvatarUrl ? <AvatarImage src={team.adminAvatarUrl} alt={team.adminName} /> : null}
                    <AvatarFallback className={`text-lg font-medium ${
                      isMasterAdmin ? 'bg-amber-500/10 text-amber-600' : 'bg-purple-500/10 text-purple-600'
                    }`}>
                      {getInitials(team.adminName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {team.adminName}
                      {isMasterAdmin && <Crown className="h-4 w-4 text-amber-500" />}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {team.adminEmail}
                    </CardDescription>
                  </div>
                  <Badge className={`gap-1 ${
                    isMasterAdmin 
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                      : 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                  }`}>
                    {isMasterAdmin ? <Crown className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    {isMasterAdmin ? 'Master' : 'Administrador'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Assistentes ({team.assistants.length})
                  </h4>
                  {draggedItem && (
                    <span className="text-xs text-primary animate-pulse">
                      Solte aqui para atribuir
                    </span>
                  )}
                </div>
                {team.assistants.length === 0 ? (
                  <div className={`text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg transition-colors ${
                    dragOverAdminId === team.adminId ? 'border-primary bg-primary/5' : 'border-border/50'
                  }`}>
                    <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {draggedItem ? 'Solte para adicionar' : 'Nenhum assistente atribuído'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="font-semibold">Nome</TableHead>
                          <TableHead className="font-semibold">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              Email
                            </div>
                          </TableHead>
                          <TableHead className="text-right font-semibold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TooltipProvider>
                          {team.assistants.map((assistant, index) => (
                            <TableRow 
                              key={assistant.id}
                              className="group hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing"
                              style={{ animationDelay: `${index * 30}ms` }}
                              draggable
                              onDragStart={(e) => handleDragStart(e as unknown as DragEvent<HTMLDivElement>, {
                                id: assistant.id,
                                name: assistant.name,
                                type: 'assigned',
                                fromAdminId: team.adminId,
                                assignmentId: assistant.assignmentId,
                              })}
                              onDragEnd={handleDragEnd as unknown as React.DragEventHandler<HTMLTableRowElement>}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <GripVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
                                  <Avatar className="h-9 w-9 border border-border">
                                    {assistant.avatarUrl ? <AvatarImage src={assistant.avatarUrl} alt={assistant.name} /> : null}
                                    <AvatarFallback className="bg-blue-500/10 text-blue-600 text-xs">
                                      {getInitials(assistant.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{assistant.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{assistant.email}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {/* Transfer Button */}
                                  {availableAdmins.length > 1 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={() => openTransferDialog(assistant, team)}
                                        >
                                          <ArrowRightLeft className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Transferir para outro admin</TooltipContent>
                                    </Tooltip>
                                  )}
                                  
                                  {/* Remove Button */}
                                  <AlertDialog>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertDialogTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>Remover da equipe</TooltipContent>
                                    </Tooltip>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Remover assistente?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {assistant.name} será removido da equipe de {team.adminName}. 
                                          Você poderá reatribuí-lo posteriormente.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleRemoveAssignment(assistant.assignmentId, assistant.name)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Remover
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TooltipProvider>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}

      {/* Unassigned Assistants - Only show in List View */}
      {viewMode === 'list' && unassignedAssistants.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ArrowRightLeft className="h-5 w-5 text-amber-500" />
              </div>
              Assistentes Não Atribuídos
            </CardTitle>
            <CardDescription>
              Arraste para atribuir a um administrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {unassignedAssistants.map((assistant, index) => (
                <div
                  key={assistant.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/50 bg-card/80 hover:bg-card transition-colors cursor-grab active:cursor-grabbing"
                  style={{ animationDelay: `${index * 50}ms` }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, {
                    id: assistant.id,
                    name: assistant.name,
                    type: 'unassigned',
                  })}
                  onDragEnd={handleDragEnd}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                  <Avatar className="h-9 w-9 border border-amber-500/20">
                    {assistant.avatarUrl ? <AvatarImage src={assistant.avatarUrl} alt={assistant.name} /> : null}
                    <AvatarFallback className="bg-amber-500/10 text-amber-600 text-xs">
                      {getInitials(assistant.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{assistant.name}</p>
                    <p className="text-xs text-muted-foreground">{assistant.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Transferir Assistente
            </DialogTitle>
            <DialogDescription>
              {transferData && (
                <>
                  Transferir <strong>{transferData.assistantName}</strong> da equipe de{' '}
                  <strong>{transferData.fromAdminName}</strong> para outro administrador
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="target-admin">Administrador de destino</Label>
              <Select value={targetAdminId} onValueChange={setTargetAdminId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o administrador" />
                </SelectTrigger>
                <SelectContent>
                  {availableAdmins
                    .filter((admin) => admin.id !== transferData?.fromAdminId)
                    .map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-purple-500" />
                          {admin.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTransfer} disabled={isSubmitting || !targetAdminId}>
              {isSubmitting ? 'Transferindo...' : 'Transferir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterTeams;
