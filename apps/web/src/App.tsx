import { useEffect, useMemo, useState } from "react";
import { approveUser, blockUser, fetchHealth, fetchMe, fetchOrders, fetchUsers, reactivateUser } from "./lib/api";
import { signInEmail, signOut } from "./lib/auth";
import { getWebEnv } from "./lib/env";

type HealthState =
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; message: string };

type MeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: Awaited<ReturnType<typeof fetchMe>> }
  | { status: "error"; message: string };

type UsersState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: Awaited<ReturnType<typeof fetchUsers>> }
  | { status: "error"; message: string };

type OrdersState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: Awaited<ReturnType<typeof fetchOrders>>; scope: "available" | "mine" | "follow-up" }
  | { status: "error"; message: string };

export function App() {
  const env = getWebEnv();
  const [healthState, setHealthState] = useState<HealthState>({ status: "loading" });
  const [meState, setMeState] = useState<MeState>({ status: "idle" });
  const [usersState, setUsersState] = useState<UsersState>({ status: "idle" });
  const [usersActionError, setUsersActionError] = useState<string | null>(null);
  const [ordersState, setOrdersState] = useState<OrdersState>({ status: "idle" });

  const [email, setEmail] = useState("admin@dev.local");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (env.apiUrlProblem && env.apiUrlSource === "env") {
        setHealthState({ status: "error", message: env.apiUrlProblem });
        return;
      }

      setHealthState({ status: "loading" });

      try {
        await fetchHealth(env.apiUrl);
        if (!cancelled) setHealthState({ status: "success" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        if (!cancelled) setHealthState({ status: "error", message });
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [env.apiUrl, env.apiUrlProblem, env.apiUrlSource]);

  const apiStatusText =
    healthState.status === "loading"
      ? "Carregando..."
      : healthState.status === "success"
        ? "Sucesso: API OK"
        : `Erro: ${healthState.message}`;

  const authUiState = useMemo(() => {
    if (meState.status !== "success") return "unknown";
    const data = meState.data;
    if (!data.ok) return "signed_out";
    return data.profileStatus === "linked" ? "linked" : "missing";
  }, [meState]);

  async function handleRefreshMe() {
    setMeState({ status: "loading" });
    try {
      const data = await fetchMe(env.apiUrl);
      setMeState({ status: "success", data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setMeState({ status: "error", message });
    }
  }

  async function handleSignIn() {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInEmail({ apiUrl: env.apiUrl, email, password });
      await handleRefreshMe();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setAuthError(message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signOut();
      await handleRefreshMe();
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleListUsers() {
    setUsersState({ status: "loading" });
    setUsersActionError(null);
    try {
      const data = await fetchUsers(env.apiUrl);
      setUsersState({ status: "success", data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setUsersState({ status: "error", message });
    }
  }

  async function handleListOrders(scope: "available" | "mine" | "follow-up") {
    setOrdersState({ status: "loading" });
    try {
      const data = await fetchOrders(env.apiUrl, scope);
      setOrdersState({ status: "success", data, scope });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setOrdersState({ status: "error", message });
    }
  }

  async function runUsersAction(fn: () => Promise<any>) {
    setUsersActionError(null);
    try {
      const res = await fn();
      if (res && typeof res === "object" && "ok" in res && (res as any).ok === false) {
        setUsersActionError((res as any).message ?? "Erro ao executar ação");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setUsersActionError(message);
    } finally {
      await handleListUsers();
      await handleRefreshMe();
    }
  }

  const meText =
    meState.status === "idle"
      ? "Desconhecido (clique em Consultar /me)"
      : meState.status === "loading"
        ? "Carregando /me..."
        : meState.status === "error"
          ? `Erro ao chamar /me: ${meState.message}`
          : authUiState === "signed_out"
            ? "Usuário deslogado"
            : authUiState === "missing"
              ? "Autenticado, mas sem profile operacional (profileStatus=missing)"
              : "Autenticado com profile operacional (profileStatus=linked)";

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1>ATA Portal</h1>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Status da API</h2>
        <p style={{ margin: "8px 0" }}>{apiStatusText}</p>

        <div style={{ fontSize: 12, opacity: 0.8 }}>
          <div>
            API URL (config): <code>{env.apiUrl}</code>
          </div>
          <div>
            Origem: <code>{env.apiUrlSource}</code>
          </div>
          {env.apiUrlProblem ? (
            <div>
              Aviso: <code>{env.apiUrlProblem}</code>
            </div>
          ) : null}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Auth (dev)</h2>

        <div style={{ marginTop: 12, display: "grid", gap: 8, maxWidth: 360 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={handleSignIn} disabled={authBusy}>
              Sign-in
            </button>
            <button onClick={handleSignOut} disabled={authBusy}>
              Sign-out
            </button>
            <button onClick={handleRefreshMe} disabled={authBusy}>
              Consultar /me
            </button>
          </div>

          {authError ? (
            <div style={{ color: "crimson", fontSize: 12 }}>
              Erro: <code>{authError}</code>
            </div>
          ) : null}

          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Em dev, as chamadas usam proxy do Vite: <code>/api/auth/*</code>, <code>/me</code> e{" "}
            <code>/users</code>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Estado atual</h3>
          <p style={{ margin: "8px 0" }}>{meText}</p>

          {meState.status === "success" ? (
            <pre
              style={{
                marginTop: 8,
                padding: 12,
                background: "#111",
                color: "#eee",
                overflow: "auto",
                fontSize: 12
              }}
            >
              {JSON.stringify(meState.data, null, 2)}
            </pre>
          ) : null}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Usuários (admin/master)</h2>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleListUsers} disabled={authBusy}>
            Listar usuários
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12 }}>
          {usersState.status === "idle"
            ? "Nenhuma requisição ainda."
            : usersState.status === "loading"
              ? "Carregando /users..."
              : usersState.status === "error"
                ? `Erro ao chamar /users: ${usersState.message}`
                : usersState.data.ok
                  ? `Usuários: ${usersState.data.users.length}`
                  : `Sem permissão: ${usersState.data.message}`}
        </div>

        {usersActionError ? (
          <div style={{ marginTop: 8, color: "crimson", fontSize: 12 }}>
            Erro: <code>{usersActionError}</code>
          </div>
        ) : null}

        {usersState.status === "success" && usersState.data.ok ? (
          <table style={{ marginTop: 8, borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                {["id", "email", "fullName", "status", "authUserId", "actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "6px 4px" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usersState.data.users.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    <code>{u.id}</code>
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>{u.email}</td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>{u.fullName}</td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    <code>{u.status}</code>
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    {u.authUserId ? <code>{u.authUserId}</code> : <span style={{ opacity: 0.7 }}>(null)</span>}
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {u.status === "pending" ? (
                        <button
                          onClick={() => runUsersAction(() => approveUser(env.apiUrl, u.id))}
                          disabled={authBusy}
                        >
                          Aprovar
                        </button>
                      ) : null}
                      {u.status !== "blocked" ? (
                        <button
                          onClick={() => runUsersAction(() => blockUser(env.apiUrl, u.id))}
                          disabled={authBusy}
                        >
                          Bloquear
                        </button>
                      ) : (
                        <button
                          onClick={() => runUsersAction(() => reactivateUser(env.apiUrl, u.id))}
                          disabled={authBusy}
                        >
                          Reativar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Ordens (assistant)</h2>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => handleListOrders("available")} disabled={authBusy}>
            Ordens disponÃ­veis
          </button>
          <button onClick={() => handleListOrders("mine")} disabled={authBusy}>
            Minhas ordens
          </button>
          <button onClick={() => handleListOrders("follow-up")} disabled={authBusy}>
            Meus follow-ups
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12 }}>
          {ordersState.status === "idle"
            ? "Nenhuma requisiÃ§Ã£o ainda."
            : ordersState.status === "loading"
              ? "Carregando /orders..."
              : ordersState.status === "error"
                ? `Erro ao chamar /orders: ${ordersState.message}`
                : ordersState.data.ok
                  ? `Scope=${ordersState.scope} â€” ordens: ${ordersState.data.orders.length}`
                  : `Sem permissÃ£o / erro: ${ordersState.data.message}`}
        </div>

        {ordersState.status === "success" && ordersState.data.ok ? (
          <table style={{ marginTop: 8, borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                {[
                  "id",
                  "externalOrderCode",
                  "sourceStatus",
                  "status",
                  "residentName",
                  "city",
                  "state",
                  "assistantUserId"
                ].map((h) => (
                  <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "6px 4px" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordersState.data.orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    <code>{o.id}</code>
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    <code>{o.externalOrderCode}</code>
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    <code>{o.sourceStatus}</code>
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    <code>{o.status}</code>
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>{o.residentName ?? ""}</td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>{o.city ?? ""}</td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>{o.state ?? ""}</td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    {o.assistantUserId ? <code>{o.assistantUserId}</code> : <span style={{ opacity: 0.7 }}>(null)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </main>
  );
}
