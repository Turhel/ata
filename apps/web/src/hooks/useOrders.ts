import { useQuery } from "@tanstack/react-query";

export interface Order {
  id: string;
  externalId: string | null;
  status: string | null;
  category: string | null;
  dueDate: string | null;
  createdAt: string | null;
  address1: string | null;
  city: string | null;
}

export interface OrdersListResponse {
  ok: boolean;
  orders: Order[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useOrders(params: { page: number; pageSize: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: async (): Promise<OrdersListResponse> => {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const searchParams = new URLSearchParams();
      searchParams.set("page", params.page.toString());
      searchParams.set("pageSize", params.pageSize.toString());
      if (params.status && params.status !== "all") {
        searchParams.set("status", params.status);
      }
      if (params.search) {
        searchParams.set("search", params.search);
      }

      const response = await fetch(`${baseUrl}/orders?${searchParams.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Falha ao buscar as ordens");
      }

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.message || "Erro retornado pela API");
      }

      return data;
    },
  });
}
