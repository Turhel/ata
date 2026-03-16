import { useQuery } from "@tanstack/react-query";

interface DashboardMetrics {
  scope: "global" | "team";
  users: {
    pending: number;
    active: number;
    blocked: number;
  };
  orders: {
    available: number;
    inProgress: number;
    submitted: number;
    followUp: number;
    rejected: number;
    approved: number;
    batched: number;
    paid: number;
    cancelled: number;
  };
  payments: {
    open: number;
    closed: number;
    paid: number;
    cancelled: number;
  };
  imports: {
    processing: number;
    completed: number;
    partiallyCompleted: number;
    failed: number;
  };
  team: {
    assistants: number;
    orders: {
      availableToTeam: number;
      inProgress: number;
      submitted: number;
      followUp: number;
      approved: number;
      batched: number;
      paid: number;
    };
  } | null;
}

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

      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.message || "Erro desconhecido da API");
      }

      return data.dashboard;
    },
    retry: 1,
  });
}
