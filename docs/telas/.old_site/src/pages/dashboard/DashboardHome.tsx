import { Navigate } from "react-router-dom";

import { useAppUser } from "@/hooks/useAppUser";
import { PageSkeleton } from "@/components/ui/animated-skeleton";

import DashboardOverview from "@/pages/dashboard/DashboardOverview";
import InspectorDashboard from "@/pages/dashboard/InspectorDashboard";
import InspectorWaiting from "@/pages/dashboard/InspectorWaiting";

export default function DashboardHome() {
  const { appUser, persona, inspector, isLoading } = useAppUser();

  if (isLoading) return <PageSkeleton variant="cards" />;
  if (!appUser) return <Navigate to="/auth" replace />;

  // Only "user" accounts must pick a persona. Admin/Master remain on the existing flow.
  if (appUser.role === "user" && !persona) {
    return <Navigate to="/welcome" replace />;
  }

  if (persona === "inspector") {
    const hasAssignment = !!inspector?.assignment?.inspector_id;
    if (!hasAssignment) return <InspectorWaiting />;
    return <InspectorDashboard />;
  }

  return <DashboardOverview />;
}

