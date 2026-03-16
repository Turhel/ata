import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RoleCode, UsersListResponse } from "@ata-portal/contracts";

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function useUsers(params: { page: number; pageSize: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async (): Promise<UsersListResponse> => {
      const searchParams = new URLSearchParams();
      searchParams.set("page", params.page.toString());
      searchParams.set("pageSize", params.pageSize.toString());
      if (params.status && params.status !== "all") {
        searchParams.set("status", params.status);
      }
      if (params.search) {
        searchParams.set("search", params.search);
      }

      const response = await fetch(`${baseUrl}/users?${searchParams.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Falha ao buscar os usuários");
      }

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.message || "Erro retornado pela API");
      }

      return data;
    },
  });
}

export function useApproveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`${baseUrl}/users/${userId}/approve`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Erro ao aprovar");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`${baseUrl}/users/${userId}/block`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Erro ao bloquear");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`${baseUrl}/users/${userId}/reactivate`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Erro ao reativar");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useChangeUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, roleCode }: { userId: string; roleCode: RoleCode }) => {
      const response = await fetch(`${baseUrl}/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleCode }),
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Erro ao alterar cargo");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
