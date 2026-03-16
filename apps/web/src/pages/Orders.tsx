import { useState } from "react";
import { useOrders } from "../hooks/useOrders";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Search, Loader2 } from "lucide-react";

export function Orders() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // Debounced for API
  const [status, setStatus] = useState("all");

  const { data, isLoading, isError, error } = useOrders({
    page,
    pageSize: 15,
    search: searchTerm,
    status
  });

  const handleSearchClick = () => {
    setPage(1);
    setSearchTerm(search);
  };

  const statusMap: Record<string, string> = {
    available: "Disponível",
    in_progress: "Em Execução",
    submitted: "Em Análise",
    follow_up: "Follow-up",
    approved: "Aprovada",
    rejected: "Devolvida",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Ordens de Serviço</h1>
        <p className="text-gray-500 text-sm">Gerencie, acompanhe e filtre as O.S importadas na base.</p>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por WOrder ou endereço..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
                className="pl-9 bg-gray-50 text-gray-900"
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
              <option value="all">Todos Status</option>
              <option value="available">Disponíveis</option>
              <option value="in_progress">Em Execução</option>
              <option value="submitted">Em Análise</option>
              <option value="follow_up">Follow Up</option>
              <option value="approved">Aprovadas</option>
            </select>
            <Button onClick={handleSearchClick}>Buscar</Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border border-gray-200 mt-2">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="font-semibold">Código</TableHead>
                  <TableHead className="font-semibold">Endereço</TableHead>
                  <TableHead className="font-semibold">Cidade</TableHead>
                  <TableHead className="font-semibold">Categoria</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-gray-500">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                      Carregando ordens...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-red-500">
                      Erro: {error?.message}
                    </TableCell>
                  </TableRow>
                ) : data?.orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-gray-500">
                      Nenhuma ordem encontrada para os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">{order.externalId || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-gray-600" title={order.address1 || ""}>
                        {order.address1 || "S/ Endereço"}
                      </TableCell>
                      <TableCell className="text-gray-600">{order.city || "-"}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-200">
                          {order.category || "Regular"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200 font-medium">
                          {statusMap[order.status || ""] || order.status || "Desconhecido"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {data && data.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">
                Apresentando página {data.meta.page} de {data.meta.totalPages} ({data.meta.total} itens)
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
                  onClick={() => setPage(p => Math.min(data.meta.totalPages, p + 1))}
                  disabled={page >= data.meta.totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
