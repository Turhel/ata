import { useState } from "react";
import { Search, Loader2, ShieldCheck, Ban, ShieldAlert } from "lucide-react";
import type { RoleCode, UsersListItem } from "@ata-portal/contracts";
import { useUsers, useApproveUser, useBlockUser, useReactivateUser, useChangeUserRole } from "../hooks/useUsers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

export function Users() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("all");

  const { data, isLoading, isError, error } = useUsers({
    page,
    pageSize: 15,
    search: searchTerm,
    status
  });

  const approveMutation = useApproveUser();
  const blockMutation = useBlockUser();
  const reactivateMutation = useReactivateUser();
  const roleMutation = useChangeUserRole();
  const users = data?.ok ? data.users : [];
  const meta = data?.ok ? data.meta : null;

  const handleSearchClick = () => {
    setPage(1);
    setSearchTerm(search);
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendente", color: "bg-amber-100 text-amber-800 border-amber-200" },
    active: { label: "Ativo", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    blocked: { label: "Bloqueado", color: "bg-rose-100 text-rose-800 border-rose-200" },
    inactive: { label: "Inativo", color: "bg-gray-100 text-gray-800 border-gray-200" },
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto mt-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestão de Usuários</h1>
        <p className="text-gray-500 text-sm">Administre os acessos da plataforma, aprove contas e defina papéis.</p>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros de Acesso</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
                className="pl-9 bg-gray-50 text-gray-900 border-gray-300"
              />
            </div>
            <select
              className="flex h-10 w-full sm:w-[200px] items-center justify-between rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes de Avaliação</option>
              <option value="active">Usuários Ativos</option>
              <option value="blocked">Bloqueados</option>
            </select>
            <Button onClick={handleSearchClick} className="bg-gray-900 text-white hover:bg-gray-800">Filtrar</Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border border-gray-200 mt-2 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow>
                  <TableHead className="font-semibold w-[250px]">Usuário</TableHead>
                  <TableHead className="font-semibold">Perfil / Cargo</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-right">Ações Administrativas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-gray-500">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                      Carregando Diretório...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-red-500">
                      Erro: {error?.message}
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-gray-500 bg-gray-50/30">
                      Nenhum usuário encontrado para os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user: UsersListItem) => (
                    <TableRow key={user.id} className="hover:bg-blue-50/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{user.fullName}</span>
                          <span className="text-sm text-gray-500">{user.email}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <select
                          className="flex h-9 w-full max-w-[200px] items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                          value={user.roleCode || ""}
                          disabled={roleMutation.isPending && roleMutation.variables?.userId === user.id}
                          onChange={(e) => {
                            if (e.target.value) {
                              roleMutation.mutate({ userId: user.id, roleCode: e.target.value as RoleCode });
                            }
                          }}
                        >
                          <option value="" disabled>Sem papel</option>
                          <option value="assistant">Assistente (Backoffice)</option>
                          <option value="inspector">Inspetor (Campo)</option>
                          <option value="admin">Administrador</option>
                          <option value="master">Master</option>
                        </select>
                      </TableCell>

                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMap[user.status]?.color || "bg-gray-100 text-gray-800 border-gray-200"}`}>
                          {statusMap[user.status]?.label || user.status}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {user.status === "pending" && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => approveMutation.mutate(user.id)}
                              disabled={approveMutation.isPending && approveMutation.variables === user.id}
                            >
                              {approveMutation.isPending && approveMutation.variables === user.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                              Aprovar
                            </Button>
                          )}
                          
                          {user.status === "active" && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                              onClick={() => blockMutation.mutate(user.id)}
                              disabled={blockMutation.isPending && blockMutation.variables === user.id}
                            >
                              {blockMutation.isPending && blockMutation.variables === user.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
                              Bloquear
                            </Button>
                          )}

                          {user.status === "blocked" && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                              onClick={() => reactivateMutation.mutate(user.id)}
                              disabled={reactivateMutation.isPending && reactivateMutation.variables === user.id}
                            >
                              {reactivateMutation.isPending && reactivateMutation.variables === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <ShieldAlert className="h-4 w-4 mr-1" />
                              )}
                              Reativar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500 font-medium">
                Página {meta.page} de {meta.totalPages} ({meta.total} usuários)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
