import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  Building2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Route,
  UploadCloud,
  Users
} from "lucide-react";
import { useSession, signOut } from "../../lib/auth-client";
import { cn } from "../../lib/utils";

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
      { name: "Rotas Admin", href: "/admin/routes", icon: Route, description: "Criação, GPX e exportações" },
      { name: "Rota", href: "/route-operational", icon: Route, description: "Sequência operacional do dia" },
      { name: "Fechamento", href: "/route-day-summary", icon: ClipboardCheck, description: "Resumo diário das rotas" },
      { name: "Importação", href: "/pool-import", icon: UploadCloud, description: "Lote via Excel" }
    ]
  }
];

export function Layout() {
  const location = useLocation();
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    await signOut();
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-glow-pulse rounded-xl bg-gradient-to-br from-primary to-sky-500 p-3">
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
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-border/50 bg-card/80 backdrop-blur-md sm:flex">
        <div className="flex h-16 items-center border-b border-border/50 px-5">
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="rounded-lg bg-gradient-to-br from-primary to-sky-500 p-1.5 shadow-[0_2px_8px_hsl(199_89%_32%/0.3)] transition-shadow group-hover:shadow-[0_2px_12px_hsl(199_89%_32%/0.5)]">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">ATA Portal</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-6 overflow-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
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
                        "group flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 pl-[10px] text-sm font-medium transition-all duration-200",
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110",
                          isActive && "text-primary"
                        )}
                      />
                      <span className="flex-1">{item.name}</span>
                      {isActive ? <ChevronRight className="h-3 w-3 text-primary/50" /> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border/50 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-lg bg-muted/40 px-2 py-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-sky-500 text-sm font-semibold text-white shadow-sm">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full rounded-lg border-l-2 border-transparent px-3 py-2 pl-[10px] text-left text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
          >
            <span className="flex items-center gap-3">
              <LogOut className="h-4 w-4" />
              Sair
            </span>
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-col sm:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/50 bg-card/80 px-4 backdrop-blur-md sm:hidden">
          <div className="flex items-center gap-2 font-bold">
            <div className="rounded-lg bg-gradient-to-br from-primary to-sky-500 p-1.5">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            ATA Portal
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
