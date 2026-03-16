import { useQuery } from "@tanstack/react-query";
import { fetchOperationalRouteCurrent } from "../lib/api";
import { getWebEnv } from "../lib/env";

export function useOperationalRoute(routeDate?: string) {
  const env = getWebEnv();

  return useQuery({
    queryKey: ["routes", "operational", routeDate ?? "today"],
    queryFn: () => fetchOperationalRouteCurrent(env.apiUrl, routeDate),
    retry: 1
  });
}
