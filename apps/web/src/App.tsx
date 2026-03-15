import { useEffect, useMemo, useState } from "react";
import {
  approveUser,
  blockUser,
  createOrderNote,
  fetchAdminDashboard,
  fetchAssistantDashboard,
  fetchClients,
  fetchHealth,
  fetchInspectorAccounts,
  fetchInspectors,
  fetchMe,
  fetchOrderById,
  fetchOrderEvents,
  fetchOrderNotes,
  fetchOrders,
  fetchPoolImportBatch,
  fetchPoolImportFailures,
  fetchUsers,
  fetchWorkTypes,
  reactivateUser,
  reprocessPoolImportItem
} from "./lib/api";
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

type PoolImportState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      batchId: string;
      batch: Awaited<ReturnType<typeof fetchPoolImportBatch>>;
      failures: Awaited<ReturnType<typeof fetchPoolImportFailures>>;
    }
  | { status: "error"; message: string };

type OrderDetailState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      orderId: string;
      detail: Awaited<ReturnType<typeof fetchOrderById>>;
      events: Awaited<ReturnType<typeof fetchOrderEvents>>;
      notes: Awaited<ReturnType<typeof fetchOrderNotes>>;
    }
  | { status: "error"; message: string };

type CatalogsState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      clients: Awaited<ReturnType<typeof fetchClients>>;
      workTypes: Awaited<ReturnType<typeof fetchWorkTypes>>;
      inspectors: Awaited<ReturnType<typeof fetchInspectors>>;
      inspectorAccounts: Awaited<ReturnType<typeof fetchInspectorAccounts>>;
    }
  | { status: "error"; message: string };

type DashboardsState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      admin: Awaited<ReturnType<typeof fetchAdminDashboard>> | null;
      assistant: Awaited<ReturnType<typeof fetchAssistantDashboard>> | null;
      mode: "admin" | "assistant";
    }
  | { status: "error"; message: string };

export function App() {
  const env = getWebEnv();
  const [healthState, setHealthState] = useState<HealthState>({ status: "loading" });
  const [meState, setMeState] = useState<MeState>({ status: "idle" });
  const [usersState, setUsersState] = useState<UsersState>({ status: "idle" });
  const [usersActionError, setUsersActionError] = useState<string | null>(null);
  const [ordersState, setOrdersState] = useState<OrdersState>({ status: "idle" });
  const [poolImportState, setPoolImportState] = useState<PoolImportState>({ status: "idle" });
  const [poolImportActionError, setPoolImportActionError] = useState<string | null>(null);
  const [batchIdInput, setBatchIdInput] = useState("");
  const [poolImportBusy, setPoolImportBusy] = useState(false);
  const [orderDetailState, setOrderDetailState] = useState<OrderDetailState>({ status: "idle" });
  const [orderDetailActionError, setOrderDetailActionError] = useState<string | null>(null);
  const [orderIdInput, setOrderIdInput] = useState("");
  const [orderNoteContent, setOrderNoteContent] = useState("");
  const [orderNoteType, setOrderNoteType] = useState("general");
  const [orderNoteInternal, setOrderNoteInternal] = useState(true);
  const [orderDetailBusy, setOrderDetailBusy] = useState(false);
  const [catalogsState, setCatalogsState] = useState<CatalogsState>({ status: "idle" });
  const [dashboardsState, setDashboardsState] = useState<DashboardsState>({ status: "idle" });

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

  async function handleLoadPoolImportBatch() {
    const batchId = batchIdInput.trim();
    if (!batchId) {
      setPoolImportState({ status: "error", message: "Informe um batchId" });
      return;
    }

    setPoolImportState({ status: "loading" });
    setPoolImportActionError(null);

    try {
      const [batch, failures] = await Promise.all([
        fetchPoolImportBatch(env.apiUrl, batchId),
        fetchPoolImportFailures(env.apiUrl, batchId)
      ]);

      setPoolImportState({
        status: "success",
        batchId,
        batch,
        failures
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setPoolImportState({ status: "error", message });
    }
  }

  async function handleReprocessPoolImportItem(itemId: string) {
    setPoolImportBusy(true);
    setPoolImportActionError(null);

    try {
      const result = await reprocessPoolImportItem(env.apiUrl, itemId);
      if (!result.ok) {
        setPoolImportActionError(result.message);
        return;
      }

      await handleLoadPoolImportBatch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setPoolImportActionError(message);
    } finally {
      setPoolImportBusy(false);
    }
  }

  async function handleLoadOrderDetail() {
    const orderId = orderIdInput.trim();
    if (!orderId) {
      setOrderDetailState({ status: "error", message: "Informe um orderId" });
      return;
    }

    setOrderDetailState({ status: "loading" });
    setOrderDetailActionError(null);

    try {
      const [detail, events, notes] = await Promise.all([
        fetchOrderById(env.apiUrl, orderId),
        fetchOrderEvents(env.apiUrl, orderId),
        fetchOrderNotes(env.apiUrl, orderId)
      ]);

      setOrderDetailState({
        status: "success",
        orderId,
        detail,
        events,
        notes
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setOrderDetailState({ status: "error", message });
    }
  }

  async function handleCreateOrderNote() {
    const orderId = orderIdInput.trim();
    const content = orderNoteContent.trim();

    if (!orderId) {
      setOrderDetailActionError("Informe um orderId");
      return;
    }

    if (!content) {
      setOrderDetailActionError("Informe o conteúdo da nota");
      return;
    }

    setOrderDetailBusy(true);
    setOrderDetailActionError(null);

    try {
      const result = await createOrderNote(env.apiUrl, orderId, {
        noteType: orderNoteType,
        content,
        isInternal: orderNoteInternal
      });

      if (!result.ok) {
        setOrderDetailActionError(result.message);
        return;
      }

      setOrderNoteContent("");
      await handleLoadOrderDetail();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setOrderDetailActionError(message);
    } finally {
      setOrderDetailBusy(false);
    }
  }

  async function handleLoadCatalogs() {
    setCatalogsState({ status: "loading" });

    try {
      const [clients, workTypes, inspectors, inspectorAccounts] = await Promise.all([
        fetchClients(env.apiUrl),
        fetchWorkTypes(env.apiUrl),
        fetchInspectors(env.apiUrl),
        fetchInspectorAccounts(env.apiUrl)
      ]);

      setCatalogsState({
        status: "success",
        clients,
        workTypes,
        inspectors,
        inspectorAccounts
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setCatalogsState({ status: "error", message });
    }
  }

  async function handleLoadDashboard(mode: "admin" | "assistant") {
    setDashboardsState({ status: "loading" });

    try {
      if (mode === "admin") {
        const admin = await fetchAdminDashboard(env.apiUrl);
        setDashboardsState({ status: "success", admin, assistant: null, mode });
        return;
      }

      const assistant = await fetchAssistantDashboard(env.apiUrl);
      setDashboardsState({ status: "success", admin: null, assistant, mode });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setDashboardsState({ status: "error", message });
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

      <section style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Pool import (admin/master)</h2>

        <div style={{ marginTop: 12, display: "grid", gap: 8, maxWidth: 720 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Batch ID</span>
            <input value={batchIdInput} onChange={(e) => setBatchIdInput(e.target.value)} />
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={handleLoadPoolImportBatch} disabled={authBusy || poolImportBusy}>
              Carregar batch
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12 }}>
          {poolImportState.status === "idle"
            ? "Nenhum batch consultado ainda."
            : poolImportState.status === "loading"
              ? "Carregando batch e falhas..."
              : poolImportState.status === "error"
                ? `Erro: ${poolImportState.message}`
                : !poolImportState.batch.ok
                  ? `Erro no batch: ${poolImportState.batch.message}`
                  : !poolImportState.failures.ok
                    ? `Erro nas falhas: ${poolImportState.failures.message}`
                    : `Batch ${poolImportState.batch.batch.fileName} carregado. Falhas: ${poolImportState.failures.failures.length}`}
        </div>

        {poolImportActionError ? (
          <div style={{ marginTop: 8, color: "crimson", fontSize: 12 }}>
            Erro: <code>{poolImportActionError}</code>
          </div>
        ) : null}

        {poolImportState.status === "success" && poolImportState.batch.ok ? (
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <div>
              <strong>Status:</strong> <code>{poolImportState.batch.batch.status}</code>
            </div>
            <div>
              <strong>Counters:</strong>{" "}
              <code>{JSON.stringify(poolImportState.batch.batch, null, 0)}</code>
            </div>
          </div>
        ) : null}

        {poolImportState.status === "success" && poolImportState.failures.ok ? (
          <table style={{ marginTop: 8, borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                {["line", "externalOrderCode", "failureCategory", "unresolvedReferences", "errorMessage", "actions"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "6px 4px" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {poolImportState.failures.failures.map((failure) => (
                <tr key={failure.id}>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    {failure.lineNumber}
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    <code>{failure.externalOrderCode}</code>
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    <code>{failure.failureCategory}</code>
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    {failure.unresolvedReferences.length > 0 ? (
                      <code>{failure.unresolvedReferences.join(", ")}</code>
                    ) : (
                      <span style={{ opacity: 0.7 }}>(none)</span>
                    )}
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    {failure.errorMessage ? <code>{failure.errorMessage}</code> : <span style={{ opacity: 0.7 }}>(null)</span>}
                  </td>
                  <td style={{ padding: "6px 4px", borderBottom: "1px solid #f0f0f0" }}>
                    <button
                      onClick={() => handleReprocessPoolImportItem(failure.id)}
                      disabled={authBusy || poolImportBusy}
                    >
                      Reprocessar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Order detail / events / notes</h2>

        <div style={{ marginTop: 12, display: "grid", gap: 8, maxWidth: 720 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Order ID</span>
            <input value={orderIdInput} onChange={(e) => setOrderIdInput(e.target.value)} />
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={handleLoadOrderDetail} disabled={authBusy || orderDetailBusy}>
              Carregar detalhe
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12 }}>
          {orderDetailState.status === "idle"
            ? "Nenhuma order consultada ainda."
            : orderDetailState.status === "loading"
              ? "Carregando detalhe, events e notes..."
              : orderDetailState.status === "error"
                ? `Erro: ${orderDetailState.message}`
                : !orderDetailState.detail.ok
                  ? `Erro no detalhe: ${orderDetailState.detail.message}`
                  : !orderDetailState.events.ok
                    ? `Erro nos events: ${orderDetailState.events.message}`
                    : !orderDetailState.notes.ok
                      ? `Erro nas notes: ${orderDetailState.notes.message}`
                      : `Order ${orderDetailState.detail.order.externalOrderCode} carregada. Events: ${orderDetailState.events.events.length}. Notes: ${orderDetailState.notes.notes.length}.`}
        </div>

        {orderDetailActionError ? (
          <div style={{ marginTop: 8, color: "crimson", fontSize: 12 }}>
            Erro: <code>{orderDetailActionError}</code>
          </div>
        ) : null}

        {orderDetailState.status === "success" && orderDetailState.detail.ok ? (
          <pre
            style={{
              marginTop: 12,
              padding: 12,
              background: "#111",
              color: "#eee",
              overflow: "auto",
              fontSize: 12
            }}
          >
            {JSON.stringify(orderDetailState.detail, null, 2)}
          </pre>
        ) : null}

        <div style={{ marginTop: 12, display: "grid", gap: 8, maxWidth: 720 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Nova nota</span>
            <textarea rows={4} value={orderNoteContent} onChange={(e) => setOrderNoteContent(e.target.value)} />
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>noteType</span>
              <input value={orderNoteType} onChange={(e) => setOrderNoteType(e.target.value)} />
            </label>

            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
              <input
                type="checkbox"
                checked={orderNoteInternal}
                onChange={(e) => setOrderNoteInternal(e.target.checked)}
              />
              isInternal
            </label>

            <button onClick={handleCreateOrderNote} disabled={authBusy || orderDetailBusy}>
              Criar nota
            </button>
          </div>
        </div>

        {orderDetailState.status === "success" && orderDetailState.events.ok ? (
          <div style={{ marginTop: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Events</h3>
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
              {JSON.stringify(orderDetailState.events.events, null, 2)}
            </pre>
          </div>
        ) : null}

        {orderDetailState.status === "success" && orderDetailState.notes.ok ? (
          <div style={{ marginTop: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Notes</h3>
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
              {JSON.stringify(orderDetailState.notes.notes, null, 2)}
            </pre>
          </div>
        ) : null}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Catálogos operacionais</h2>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleLoadCatalogs} disabled={authBusy}>
            Carregar catálogos
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12 }}>
          {catalogsState.status === "idle"
            ? "Nenhuma requisição ainda."
            : catalogsState.status === "loading"
              ? "Carregando catálogos..."
              : catalogsState.status === "error"
                ? `Erro: ${catalogsState.message}`
                : !catalogsState.clients.ok
                  ? `Erro em clients: ${catalogsState.clients.message}`
                  : !catalogsState.workTypes.ok
                    ? `Erro em work-types: ${catalogsState.workTypes.message}`
                    : !catalogsState.inspectors.ok
                      ? `Erro em inspectors: ${catalogsState.inspectors.message}`
                      : !catalogsState.inspectorAccounts.ok
                        ? `Erro em inspector-accounts: ${catalogsState.inspectorAccounts.message}`
                        : `Clients: ${catalogsState.clients.clients.length} | Work types: ${catalogsState.workTypes.workTypes.length} | Inspectors: ${catalogsState.inspectors.inspectors.length} | Inspector accounts: ${catalogsState.inspectorAccounts.inspectorAccounts.length}`}
        </div>

        {catalogsState.status === "success" &&
        catalogsState.clients.ok &&
        catalogsState.workTypes.ok &&
        catalogsState.inspectors.ok &&
        catalogsState.inspectorAccounts.ok ? (
          <>
            <div style={{ marginTop: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>Clients</h3>
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
                {JSON.stringify(catalogsState.clients.clients, null, 2)}
              </pre>
            </div>

            <div style={{ marginTop: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>Work types</h3>
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
                {JSON.stringify(catalogsState.workTypes.workTypes, null, 2)}
              </pre>
            </div>

            <div style={{ marginTop: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>Inspectors</h3>
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
                {JSON.stringify(catalogsState.inspectors.inspectors, null, 2)}
              </pre>
            </div>

            <div style={{ marginTop: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>Inspector accounts</h3>
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
                {JSON.stringify(catalogsState.inspectorAccounts.inspectorAccounts, null, 2)}
              </pre>
            </div>
          </>
        ) : null}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Dashboards</h2>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => handleLoadDashboard("admin")} disabled={authBusy}>
            Dashboard admin
          </button>
          <button onClick={() => handleLoadDashboard("assistant")} disabled={authBusy}>
            Dashboard assistant
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12 }}>
          {dashboardsState.status === "idle"
            ? "Nenhum dashboard carregado ainda."
            : dashboardsState.status === "loading"
              ? "Carregando dashboard..."
              : dashboardsState.status === "error"
                ? `Erro: ${dashboardsState.message}`
                : dashboardsState.mode === "admin"
                  ? dashboardsState.admin?.ok
                    ? "Dashboard admin carregado."
                    : `Erro dashboard admin: ${dashboardsState.admin?.message}`
                  : dashboardsState.assistant?.ok
                    ? "Dashboard assistant carregado."
                    : `Erro dashboard assistant: ${dashboardsState.assistant?.message}`}
        </div>

        {dashboardsState.status === "success" && dashboardsState.mode === "admin" && dashboardsState.admin?.ok ? (
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
            {JSON.stringify(dashboardsState.admin.dashboard, null, 2)}
          </pre>
        ) : null}

        {dashboardsState.status === "success" &&
        dashboardsState.mode === "assistant" &&
        dashboardsState.assistant?.ok ? (
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
            {JSON.stringify(dashboardsState.assistant.dashboard, null, 2)}
          </pre>
        ) : null}
      </section>
    </main>
  );
}
