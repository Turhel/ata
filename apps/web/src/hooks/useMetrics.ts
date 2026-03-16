import { useQuery } from "@tanstack/react-query";
import type { AdminDashboardResponse } from "@ata-portal/contracts";

type DashboardMetrics = Extract<AdminDashboardResponse, { ok: true }>["dashboard"];

export function useMetrics() {
  return useQuery({
    queryKey: ["dashboard", "admin-metrics"],
    queryFn: async (): Promise<DashboardMetrics> => {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${baseUrl}/dashboard/admin`, {
        credentials: "include", // Require cookies for better auth across ports
      });

      if (!response.ok) {
        throw new Error("Falha ao carregar as métricas do dashboard");
      }

      const data = (await response.json()) as AdminDashboardResponse;
      if (!data.ok) {
        throw new Error(data.message || "Erro desconhecido da API");
      }

      return data.dashboard;
    },
    retry: 1,
  });
}
