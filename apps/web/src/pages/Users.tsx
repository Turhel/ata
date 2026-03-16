import { useEffect, useState } from "react";
import { getWebEnv } from "../lib/env";
import { fetchUsers, fetchMe, approveUser, blockUser, reactivateUser } from "../lib/api";

export function Users() {
  const env = getWebEnv();
  const [usersState, setUsersState] = useState<any>({ status: "loading" });

  const loadUsers = async () => {
    setUsersState({ status: "loading" });
    try {
      const data = await fetchUsers(env.apiUrl);
      setUsersState({ status: "success", data });
    } catch (err) {
      setUsersState({ status: "error", message: String(err) });
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAction = async (fn: () => Promise<any>) => {
    try {
      await fn();
      await loadUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <button onClick={loadUsers} className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors">
          Atualizar
        </button>
      </div>

      <div className="rounded-md border bg-card">
        {usersState.status === "loading" && <div className="p-4 text-center text-sm text-muted-foreground">Carregando usuários...</div>}
        {usersState.status === "error" && <div className="p-4 text-center text-sm text-destructive">{usersState.message}</div>}
        {usersState.status === "success" && !usersState.data.ok && (
          <div className="p-4 text-center text-sm text-destructive">{usersState.data.message}</div>
        )}
        
        {usersState.status === "success" && usersState.data.ok && (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">ID</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nome</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {usersState.data.users.map((u: any) => (
                  <tr key={u.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle font-mono text-xs">{u.id}</td>
                    <td className="p-4 align-middle">{u.email}</td>
                    <td className="p-4 align-middle">{u.fullName}</td>
                    <td className="p-4 align-middle">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        u.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex gap-2">
                        {u.status === "pending" && (
                          <button onClick={() => handleAction(() => approveUser(env.apiUrl, u.id))} className="text-xs font-medium text-green-600 hover:text-green-700 dark:text-green-500 hover:underline">Aprovar</button>
                        )}
                        {u.status !== "blocked" ? (
                          <button onClick={() => handleAction(() => blockUser(env.apiUrl, u.id))} className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-500 hover:underline">Bloquear</button>
                        ) : (
                          <button onClick={() => handleAction(() => reactivateUser(env.apiUrl, u.id))} className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-500 hover:underline">Reativar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {usersState.data.users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
