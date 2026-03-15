import type {
  AdminDashboardResponse,
  AssistantDashboardResponse,
  ClientsListResponse,
  HealthResponse,
  InspectorAccountsListResponse,
  InspectorsListResponse,
  MeResponse,
  OrderEventsListResponse,
  OrderGetResponse,
  OrderNoteCreateRequest,
  OrderNoteCreateResponse,
  OrderNotesListResponse,
  PoolImportBatchGetResponse,
  PoolImportFailuresGetResponse,
  PoolImportItemReprocessResponse,
  OrdersListResponse,
  UserStatusMutationResponse,
  UsersListResponse,
  WorkTypesListResponse
} from "@ata-portal/contracts";

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}

function getBaseUrl(apiUrl: string) {
  return import.meta.env.DEV ? "" : apiUrl;
}

async function apiFetch(apiUrl: string, path: string, init: RequestInit = {}) {
  const baseUrl = getBaseUrl(apiUrl);
  const url = baseUrl === "" ? path : joinUrl(baseUrl, path);

  const response = await fetch(url, {
    credentials: "include",
    ...init
  });

  return response;
}

export async function fetchHealth(apiUrl: string): Promise<HealthResponse> {
  const response = await apiFetch(apiUrl, "/health", {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao chamar /health`);
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data == null ||
    !("ok" in data) ||
    (data as any).ok !== true
  ) {
    throw new Error("Resposta inválida de /health (esperado { ok: true })");
  }

  return data as HealthResponse;
}

export async function fetchMe(apiUrl: string): Promise<MeResponse> {
  const response = await apiFetch(apiUrl, "/me", {
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as MeResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /me`
    };
  }

  return data as MeResponse;
}

export async function fetchUsers(apiUrl: string): Promise<UsersListResponse> {
  const response = await apiFetch(apiUrl, "/users", {
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as UsersListResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /users`
    };
  }

  return data as UsersListResponse;
}

export async function fetchAdminDashboard(apiUrl: string): Promise<AdminDashboardResponse> {
  const response = await apiFetch(apiUrl, "/dashboard/admin", {
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as AdminDashboardResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /dashboard/admin`
    };
  }

  return data as AdminDashboardResponse;
}

export async function fetchAssistantDashboard(apiUrl: string): Promise<AssistantDashboardResponse> {
  const response = await apiFetch(apiUrl, "/dashboard/assistant", {
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as AssistantDashboardResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /dashboard/assistant`
    };
  }

  return data as AssistantDashboardResponse;
}

export async function fetchClients(apiUrl: string): Promise<ClientsListResponse> {
  const response = await apiFetch(apiUrl, "/clients", {
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as ClientsListResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /clients`
    };
  }

  return data as ClientsListResponse;
}

export async function fetchWorkTypes(apiUrl: string): Promise<WorkTypesListResponse> {
  const response = await apiFetch(apiUrl, "/work-types", {
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as WorkTypesListResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /work-types`
    };
  }

  return data as WorkTypesListResponse;
}

export async function fetchInspectors(apiUrl: string): Promise<InspectorsListResponse> {
  const response = await apiFetch(apiUrl, "/inspectors", {
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as InspectorsListResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /inspectors`
    };
  }

  return data as InspectorsListResponse;
}

export async function fetchInspectorAccounts(apiUrl: string): Promise<InspectorAccountsListResponse> {
  const response = await apiFetch(apiUrl, "/inspector-accounts", {
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as InspectorAccountsListResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /inspector-accounts`
    };
  }

  return data as InspectorAccountsListResponse;
}

export async function fetchOrders(apiUrl: string, scope?: "available" | "mine" | "follow-up"): Promise<OrdersListResponse> {
  const qs = scope ? `?scope=${encodeURIComponent(scope)}` : "";
  const response = await apiFetch(apiUrl, `/orders${qs}`, {
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as OrdersListResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /orders`
    };
  }

  return data as OrdersListResponse;
}

export async function fetchOrderById(apiUrl: string, orderId: string): Promise<OrderGetResponse> {
  const response = await apiFetch(apiUrl, `/orders/${encodeURIComponent(orderId)}`, {
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as OrderGetResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /orders/:id`
    };
  }

  return data as OrderGetResponse;
}

export async function fetchOrderEvents(apiUrl: string, orderId: string): Promise<OrderEventsListResponse> {
  const response = await apiFetch(apiUrl, `/orders/${encodeURIComponent(orderId)}/events`, {
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as OrderEventsListResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /orders/:id/events`
    };
  }

  return data as OrderEventsListResponse;
}

export async function fetchOrderNotes(apiUrl: string, orderId: string): Promise<OrderNotesListResponse> {
  const response = await apiFetch(apiUrl, `/orders/${encodeURIComponent(orderId)}/notes`, {
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as OrderNotesListResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /orders/:id/notes`
    };
  }

  return data as OrderNotesListResponse;
}

export async function createOrderNote(
  apiUrl: string,
  orderId: string,
  payload: OrderNoteCreateRequest
): Promise<OrderNoteCreateResponse> {
  const response = await apiFetch(apiUrl, `/orders/${encodeURIComponent(orderId)}/notes`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as OrderNoteCreateResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /orders/:id/notes`
    };
  }

  return data as OrderNoteCreateResponse;
}

export async function fetchPoolImportBatch(
  apiUrl: string,
  batchId: string
): Promise<PoolImportBatchGetResponse> {
  const response = await apiFetch(apiUrl, `/pool-import/batches/${encodeURIComponent(batchId)}`, {
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as PoolImportBatchGetResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /pool-import/batches/:id`
    };
  }

  return data as PoolImportBatchGetResponse;
}

export async function fetchPoolImportFailures(
  apiUrl: string,
  batchId: string
): Promise<PoolImportFailuresGetResponse> {
  const response = await apiFetch(
    apiUrl,
    `/pool-import/batches/${encodeURIComponent(batchId)}/failures`,
    {
      headers: { Accept: "application/json" }
    }
  );

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as PoolImportFailuresGetResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /pool-import/batches/:id/failures`
    };
  }

  return data as PoolImportFailuresGetResponse;
}

export async function reprocessPoolImportItem(
  apiUrl: string,
  itemId: string
): Promise<PoolImportItemReprocessResponse> {
  const response = await apiFetch(apiUrl, `/pool-import/items/${encodeURIComponent(itemId)}/reprocess`, {
    method: "POST",
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as PoolImportItemReprocessResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar /pool-import/items/:id/reprocess`
    };
  }

  return data as PoolImportItemReprocessResponse;
}

async function postUsersAction(apiUrl: string, path: string): Promise<UserStatusMutationResponse> {
  const response = await apiFetch(apiUrl, path, {
    method: "POST",
    headers: { Accept: "application/json" }
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (typeof data === "object" && data != null) {
      return data as UserStatusMutationResponse;
    }
    return {
      ok: false,
      error: "INTERNAL_ERROR",
      message: `HTTP ${response.status} ao chamar ${path}`
    };
  }

  return data as UserStatusMutationResponse;
}

export function approveUser(apiUrl: string, id: string) {
  return postUsersAction(apiUrl, `/users/${id}/approve`);
}

export function blockUser(apiUrl: string, id: string) {
  return postUsersAction(apiUrl, `/users/${id}/block`);
}

export function reactivateUser(apiUrl: string, id: string) {
  return postUsersAction(apiUrl, `/users/${id}/reactivate`);
}
