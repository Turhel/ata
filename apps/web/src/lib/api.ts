import type {
  HealthResponse,
  MeResponse,
  OrdersListResponse,
  UserStatusMutationResponse,
  UsersListResponse
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
