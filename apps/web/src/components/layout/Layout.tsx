import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { LayoutDashboard, Users, FileText, UploadCloud, LogOut, Settings, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useSession, signOut } from "../../lib/auth-client";

export function Layout() {
  const location = useLocation();
  const { data: session, isPending } = useSession();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Usuários", href: "/users", icon: Users },
    { name: "Ordens", href: "/orders", icon: FileText },
    { name: "Importação", href: "/pool-import", icon: UploadCloud },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/40">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="flex min-h-screen w-full bg-gray-50/40">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-white sm:flex">
        <div className="flex h-14 items-center border-b px-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-blue-600">
            <div className="h-6 w-6 rounded bg-blue-600 text-white flex items-center justify-center text-xs">A</div>
            ATA Portal
          </Link>
        </div>
        
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-4 text-sm font-medium">
            <div className="mb-2 px-2 text-xs font-semibold tracking-tight text-gray-500">
              Operacional
            </div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-gray-500 transition-all hover:text-gray-900 hover:bg-gray-100",
                    isActive ? "bg-gray-100 text-blue-600 font-semibold" : ""
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t p-4">
          <nav className="grid gap-1 px-2 text-sm font-medium text-gray-500">
            <Link to="/settings" className="flex items-center gap-3 rounded-md px-3 py-2 transition-all hover:text-gray-900 hover:bg-gray-100">
              <Settings className="h-4 w-4" />
              Configurações
            </Link>
            <button onClick={handleSignOut} className="flex items-center gap-3 rounded-md px-3 py-2 text-left transition-all hover:text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-64 w-full">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <div className="sm:hidden font-bold flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-blue-600 text-white flex items-center justify-center text-xs">A</div>
            ATA Portal
          </div>
          <div className="flex-1" />
          {/* Add Avatar or other top-right items here later */}
          <div className="h-8 w-8 rounded-full bg-gray-200 border border-gray-300"></div>
        </header>

        {/* Page Content */}
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
