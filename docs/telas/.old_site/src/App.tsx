import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAppUser } from "@/hooks/useAppUser";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// ✅ Crie/ajuste sua página Auth para renderizar o Clerk SignIn/SignUp (veja abaixo)
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";

// Dashboard Pages (Assistant)
import DashboardHome from "./pages/dashboard/DashboardHome";
import OrdersList from "./pages/dashboard/OrdersList";
import OrdersNew from "./pages/dashboard/OrdersNew";
import Performance from "./pages/dashboard/Performance";
import MyPayments from "./pages/dashboard/MyPayments";
import Settings from "./pages/dashboard/Settings";
import Manuals from "./pages/dashboard/Manuals";
import ScopeGenerator from "./pages/dashboard/ScopeGenerator";

// Admin Pages
import AdminOverview from "./pages/dashboard/admin/AdminOverview";
import AdminTeam from "./pages/dashboard/admin/AdminTeam";
import AdminWorkflows from "./pages/dashboard/admin/AdminWorkflows";
import AdminApprovals from "./pages/dashboard/admin/AdminApprovals";
import AdminPoolImport from "./pages/dashboard/admin/AdminPoolImport";
import AdminRedoOrders from "./pages/dashboard/admin/AdminRedoOrders";
import AdminTeamPerformance from "./pages/dashboard/admin/AdminTeamPerformance";
import AdminPayments from "./pages/dashboard/admin/AdminPayments";
import AdminPaymentsHistory from "./pages/dashboard/admin/AdminPaymentsHistory";
import AdminOrderCleanup from "./pages/dashboard/admin/AdminOrderCleanup";

// Master Pages
import MasterOverview from "./pages/dashboard/master/MasterOverview";
import MasterInspectors from "./pages/dashboard/master/MasterInspectors";
import MasterInvitations from "./pages/dashboard/master/MasterInvitations";
import MasterTeams from "./pages/dashboard/master/MasterTeams";
import MasterAuditLogs from "./pages/dashboard/master/MasterAuditLogs";
import MasterWorkTypes from "./pages/dashboard/master/MasterWorkTypes";
import MasterPricing from "./pages/dashboard/master/MasterPricing";

function RequireNotInspector({ children }: { children: ReactNode }) {
  const { persona, isLoading } = useAppUser();
  if (isLoading) return null;
  if (persona === "inspector") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RequireSignedIn({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/" replace />
      </SignedOut>
    </>
  );
}

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />

            {/* Auth route */}
            <Route
              path="/auth/*"
              element={
                <>
                  <SignedOut>
                    <Auth />
                  </SignedOut>
                  <SignedIn>
                    <Navigate to="/dashboard" replace />
                  </SignedIn>
                </>
              }
            />

            <Route
              path="/welcome"
              element={
                <RequireSignedIn>
                  <Welcome />
                </RequireSignedIn>
              }
            />

            {/* Protected routes (any signed-in user) */}
            <Route
              path="/dashboard"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <DashboardHome />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/dashboard/orders"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <RequireNotInspector>
                      <OrdersList />
                    </RequireNotInspector>
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/dashboard/orders/new"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <RequireNotInspector>
                      <OrdersNew />
                    </RequireNotInspector>
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/dashboard/performance"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <RequireNotInspector>
                      <Performance />
                    </RequireNotInspector>
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/dashboard/payments"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <RequireNotInspector>
                      <MyPayments />
                    </RequireNotInspector>
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/dashboard/manuals"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <RequireNotInspector>
                      <Manuals />
                    </RequireNotInspector>
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/dashboard/scopes"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <RequireNotInspector>
                      <ScopeGenerator />
                    </RequireNotInspector>
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />

            {/* Admin routes (temporariamente só "SignedIn") */}
            {/* Quando sua API /api/me estiver pronta, a gente troca por RequireRole */}
            <Route
              path="/admin"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <AdminOverview />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/admin/team"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <AdminTeam />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/admin/approvals"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <AdminApprovals />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/admin/pool-import"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <AdminPoolImport />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/admin/redo-orders"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <AdminRedoOrders />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/admin/performance"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <AdminTeamPerformance />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <AdminPayments />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/admin/payments/history"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <AdminPaymentsHistory />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/admin/cleanup"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <AdminOrderCleanup />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/admin/workflows"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <AdminWorkflows />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />

            {/* Master routes (temporariamente só "SignedIn") */}
            <Route
              path="/master"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <MasterOverview />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/master/inspectors"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <MasterInspectors />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/master/work-types"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <MasterWorkTypes />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/master/pricing"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <MasterPricing />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/master/invitations"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <MasterInvitations />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/master/teams"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <MasterTeams />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />
            <Route
              path="/master/audit-logs"
              element={
                <RequireSignedIn>
                  <DashboardLayout>
                    <MasterAuditLogs />
                  </DashboardLayout>
                </RequireSignedIn>
              }
            />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
