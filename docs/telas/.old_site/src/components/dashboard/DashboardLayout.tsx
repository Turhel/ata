// Dashboard layout wrapper - v2
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { DashboardHeader } from './DashboardHeader';
import { PageTransition } from '@/components/ui/page-transition';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Use location key to trigger animation on route change
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col transition-[width] duration-200 ease-linear">
          <DashboardHeader />
          <main className="flex-1 p-3 md:p-6 pb-6 overflow-y-auto overflow-x-hidden">
            <PageTransition key={location.pathname}>
              {children}
            </PageTransition>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
