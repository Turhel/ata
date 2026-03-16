import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Users } from "./pages/Users";
import { Orders } from "./pages/Orders";
import { PoolImport } from "./pages/PoolImport";
import { RoutesAdmin } from "./pages/RoutesAdmin";
import { RouteOperational } from "./pages/RouteOperational";
import { RouteDaySummary } from "./pages/RouteDaySummary";
import Auth from "./pages/Auth";
import { NotFoundPage } from "./pages/ErrorPage";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="orders" element={<Orders />} />
            <Route path="admin/routes" element={<RoutesAdmin />} />
            <Route path="route-operational" element={<RouteOperational />} />
            <Route path="route-day-summary" element={<RouteDaySummary />} />
            <Route path="pool-import" element={<PoolImport />} />
          </Route>
          {/* Qualquer rota não mapeada cai na tela de erro com botão "Voltar ao início" */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
