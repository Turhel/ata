import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  UploadCloud,
  LogOut,
  Loader2,
  Building2,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useSession, signOut } from "../../lib/auth-client";

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  description?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Operacional",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard, description: "Visão geral e métricas" },
      { name: "Usuários", href: "/users", icon: Users, description: "Gestão de acessos" },
      { name: "Ordens", href: "/orders", icon: FileText, description: "Status e histórico" },
      { name: "Importação", href: "/pool-import", icon: UploadCloud, description: "Lote via Excel" },
    ],
  },
];

export function Layout() {
  const location = useLocation();
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    await signOut();
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary to-sky-500 rounded-xl animate-glow-pulse">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const userEmail = session.user?.email ?? "";
  const userName = session.user?.name ?? userEmail.split("@")[0] ?? "Usuário";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col sm:flex border-r border-border/50 bg-card/80 backdrop-blur-md">
        {/* Header */}
        <div className="flex h-16 items-center px-5 border-b border-border/50">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 bg-gradient-to-br from-primary to-sky-500 rounded-lg shadow-[0_2px_8px_hsl(199_89%_32%/0.3)] group-hover:shadow-[0_2px_12px_hsl(199_89%_32%/0.5)] transition-shadow">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">ATA Portal</span>
          </Link>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-auto py-4 px-3 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== "/" && location.pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary border-l-2 border-primary pl-[10px]"
                          : "text-muted-foreground hover:bg-primary/5 hover:text-foreground border-l-2 border-transparent pl-[10px]"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110", isActive && "text-primary")} />
                      <span className="flex-1">{item.name}</span>
                      {isActive && <ChevronRight className="h-3 w-3 text-primary/50" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border/50 p-3">
          {/* User info */}
          <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg bg-muted/40">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary to-sky-500 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive border-l-2 border-transparent pl-[10px]"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col sm:pl-64 w-full min-h-screen">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/50 bg-card/80 backdrop-blur-md px-4 sm:hidden">
          <div className="font-bold flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-primary to-sky-500 rounded-lg">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            ATA Portal
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
