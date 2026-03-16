import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useTheme } from "next-themes";

import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ArrowUpTrayIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowLeftStartOnRectangleIcon,
  UsersIcon,
  CheckCircleIcon,
  TableCellsIcon,
  CircleStackIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  TicketIcon,
  UserPlusIcon,
  DocumentTextIcon,
  BookOpenIcon,
  Squares2X2Icon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  StarIcon,
  MapPinIcon,
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon,
} from "@heroicons/react/24/outline";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar-context";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/apiClient";

import { useAuth } from "@/hooks/useAuth";
import { useAppUser } from "@/hooks/useAppUser";
import { useUserRole } from "@/hooks/useUserRole";
import { usePendingOrders } from "@/hooks/usePendingOrders";

import { UserButton, useClerk, useUser } from "@clerk/clerk-react";

import logoBlack from "@/assets/logo-black.png";
import logoWhite from "@/assets/logo-white.png";



type IconType = ComponentType<{ className?: string }>;

type MenuItem = {
  title: string;
  url: string;
  icon: IconType;
  description?: string;
  badge?: number;
  suffix?: string;
  secondary?: string;
  /** para esconder por permissão sem gambi */
  when?: boolean;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

type PanelKey = "assistant" | "admin" | "master" | "inspector";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

/** match consistente: root = exato; subrotas = startsWith */
function isPathActive(currentPath: string, itemPath: string) {
  const roots = ["/dashboard", "/admin", "/master"];
  if (roots.includes(itemPath)) return currentPath === itemPath;
  return currentPath === itemPath || currentPath.startsWith(itemPath + "/") || currentPath.startsWith(itemPath);
}

function BetaTooltipContent() {
  return (
    <div className="space-y-2 max-w-[260px]">
      <div className="text-sm font-semibold">BETA</div>
      <div className="text-xs text-muted-foreground leading-relaxed">
        Este portal ainda está em evolução. Algumas telas podem mudar sem aviso.
      </div>
      <ul className="text-xs space-y-1">
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Novos recursos chegando aos poucos
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Layout e rotas podem ser reorganizados
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          O portal pode ficar instável durante atualizações (mas prometemos avisar quando for o caso)
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Feedbacks são super bem-vindos (e respondidos):{" "} <a href="https://forms.gle/Eri7agGxXro5CG7x9" target="_blank" rel="noopener noreferrer" className="text-primary underline">Formulário de Feedback</a>
        </li>
      </ul>
      <div className="text-[11px] text-muted-foreground">
        Dica: passe o mouse nos ícones com o sidebar colapsado pra ver descrições.
      </div>
    </div>
  );
}

function PanelBadge({ panel }: { panel: PanelKey }) {
  const label =
    panel === "master" ? "Master" :
    panel === "admin" ? "Admin" :
    panel === "inspector" ? "Inspetor" :
    "Assistente";

  return (
    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
      {label}
    </Badge>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const { theme, setTheme, resolvedTheme } = useTheme();

  const { user, signOut, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const clerk = useClerk();

  const { appUser, persona } = useAppUser();
  const { isAdmin, isMaster } = useUserRole();

  const isOnboarding = appUser?.role === "user" && !persona;
  const enableAssistantFeatures = !isOnboarding && persona !== "inspector";

  const { pendingCount, dueDateOrders, returnedOrders, ordersDueToday } = usePendingOrders(enableAssistantFeatures);

  const [openBalance, setOpenBalance] = useState<number | null>(null);
  const [openOrdersCount, setOpenOrdersCount] = useState<number | null>(null);

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isMasterRoute = location.pathname.startsWith("/master");

  const panel: PanelKey =
    persona === "inspector"
      ? "inspector"
      : isMasterRoute && isMaster
        ? "master"
        : isAdminRoute && (isAdmin || isMaster)
          ? "admin"
          : "assistant";

  const logo = resolvedTheme === "dark" ? logoWhite : logoBlack;

  const displayName =
    appUser?.full_name || user?.user_metadata?.full_name || user?.email || "Usuário";
  const avatarUrl = clerkUser?.imageUrl ?? null;

  const roleLabel = useMemo(() => {
    if (isMaster) return "Master";
    if (isAdmin) return "Administrador";
    if (persona === "inspector") return "Inspetor";
    return "Assistente";
  }, [isAdmin, isMaster, persona]);

  // Dados financeiros (assistente)
  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!user) return;
      if (!enableAssistantFeatures) return;
      if (isAdmin || isMaster) return;

      try {
        const res = await apiFetch<{ ok: true; total: number; count: number }>(
          { getToken },
          "/api/payments/open-balance"
        );
        if (!alive) return;
        setOpenBalance(res.total ?? 0);
        setOpenOrdersCount(res.count ?? 0);
      } catch (e) {
        console.error("Error loading open balance:", e);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [user, getToken, enableAssistantFeatures, isAdmin, isMaster]);

  const menus = useMemo(() => {
    const assistant: MenuGroup[] = [
      {
        label: "Operacional",
        items: [
          {
            title: "Visão Geral",
            url: "/dashboard",
            icon: HomeIcon,
            badge: pendingCount > 0 ? pendingCount : undefined,
            description: "Resumo diário e alertas",
          },
          {
            title: "Minhas Ordens",
            url: "/dashboard/orders",
            icon: ClipboardDocumentListIcon,
            description: "Status e histórico",
          },
          {
            title: "Inserir Ordens",
            url: "/dashboard/orders/new",
            icon: ArrowUpTrayIcon,
            description: "Nova ordem manual ou lote",
          },
        ],
      },
      {
        label: "Gestão",
        items: [
          {
            title: "Desempenho",
            url: "/dashboard/performance",
            icon: ChartBarIcon,
            description: "Métricas e relatórios",
          },
          {
            title: "Meus Pagamentos",
            url: "/dashboard/payments",
            icon: CurrencyDollarIcon,
            description: "A receber e histórico",
            suffix: openBalance !== null ? formatCurrency(openBalance) : undefined,
            secondary: openOrdersCount !== null ? `${openOrdersCount} ordens` : undefined,
          },
        ],
      },
      {
        label: "Config",
        items: [
          { title: "Manuais", url: "/dashboard/manuals", icon: BookOpenIcon, description: "Materiais de apoio" },
          { title: "Gerador de Escopos", url: "/dashboard/scopes", icon: DocumentTextIcon, description: "Modelos para ILIS" },
        ],
      },
    ];

    const inspector: MenuGroup[] = [
      {
        label: "Inspetor",
        items: [
          {
            title: "Início",
            url: "/dashboard",
            icon: HomeIcon,
            description: "Buscar escopo",
          },
        ],
      },
    ];

    const adminMenu: MenuGroup[] = [
      {
        label: "Operacional",
        items: [
          { title: "Visão Geral", url: "/admin", icon: HomeIcon, description: "Resumo do time" },
          { title: "Aprovar Ordens", url: "/admin/approvals", icon: CheckCircleIcon, description: "Validação e follow-ups" },
          { title: "Ordens Refeitas", url: "/admin/redo-orders", icon: ArrowPathIcon, description: "Correções e exceções" },
          { title: "Importar Demandas", url: "/admin/pool-import", icon: TableCellsIcon, description: "CSV do pool" },
        ],
      },
      {
        label: "Gestão",
        items: [
          { title: "Minha Equipe", url: "/admin/team", icon: UsersIcon, description: "Assistentes e metas" },
          { title: "Desempenho da Equipe", url: "/admin/performance", icon: ChartBarIcon, description: "KPIs por equipe" },
          { title: "Pagamentos", url: "/admin/payments", icon: CurrencyDollarIcon, description: "Fechamentos semanais" },
        ],
      },
      {
        label: "Config",
        items: [
          { title: "Limpeza de Dados", url: "/admin/cleanup", icon: CircleStackIcon, description: "Rotinas e manutenção" },
        ],
      },
    ];

    const masterMenu: MenuGroup[] = [
      {
        label: "Gestão",
        items: [
          { title: "Visão Geral", url: "/master", icon: HomeIcon, description: "Métricas globais" },
          { title: "Gestão de Equipes", url: "/master/teams", icon: UserPlusIcon, description: "Estrutura de times" },
          { title: "Inspetores", url: "/master/inspectors", icon: UsersIcon, description: "Cadastro de inspetores" },
          { title: "Tipos e Preços", url: "/master/work-types", icon: CurrencyDollarIcon, description: "Tabela de serviços" },
        ],
      },
      {
        label: "Config",
        items: [
          { title: "Códigos de Convite", url: "/master/invitations", icon: TicketIcon, description: "Novos usuários" },
          { title: "Logs de Auditoria", url: "/master/audit-logs", icon: DocumentTextIcon, description: "Ações e eventos" },
        ],
      },
    ];

    const byPanel: Record<PanelKey, MenuGroup[]> = {
      assistant,
      admin: adminMenu,
      master: masterMenu,
      inspector,
    };

    // remove itens com when=false e grupos vazios
    return byPanel[panel]
      .map((g) => ({ ...g, items: g.items.filter((i) => i.when ?? true) }))
      .filter((g) => g.items.length > 0);
  }, [panel, pendingCount, openBalance, openOrdersCount]);

  const canSwitchPanels = isAdmin || isMaster;
  const showPanelSwitcher = canSwitchPanels; // fácil de desligar depois

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      {/* HEADER */}
      <SidebarHeader className={cn("p-4", isCollapsed && "flex flex-col items-center")}>
        <Link
          to={panel === "master" ? "/master" : panel === "admin" ? "/admin" : "/dashboard"}
          className={cn("flex items-center gap-2", isCollapsed && "w-full justify-center")}
        >
          <img
            src={logo}
            alt="ATA Management"
            className={cn("h-8 w-auto", isCollapsed && "h-7 max-w-[32px] object-contain")}
          />

          {!isCollapsed && (
            <div className="flex items-center gap-1">
              <PanelBadge panel={panel} />

              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help">
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase tracking-wide border-amber-500/50 text-amber-600"
                      >
                        Beta
                      </Badge>
                    </span>
                  </TooltipTrigger>

                  <TooltipContent
                    side="bottom"
                    align="start"
                    className="z-50 max-w-[320px] bg-popover text-popover-foreground border border-border shadow-md"
                  >
                    <BetaTooltipContent />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

            </div>
          )}
        </Link>

        {isCollapsed && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help">
                  <Badge
                    variant="outline"
                    className="mt-2 self-center text-[9px] uppercase tracking-wide border-amber-500/50 text-amber-600"
                  >
                    Beta
                  </Badge>
                </span>
              </TooltipTrigger>

              <TooltipContent
                side="right"
                align="center"
                className="z-50 max-w-[320px] bg-popover text-popover-foreground border border-border shadow-md"
              >
                <BetaTooltipContent />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

        )}
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent>
        {/* Status do dia */}
        {enableAssistantFeatures && (
          <div className={cn("px-4 pb-2", isCollapsed && "px-2")}>
            {!isCollapsed ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Squares2X2Icon className="h-4 w-4" />
                  Status do dia
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 rounded-md bg-background/70 p-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-rose-600" />
                        <div>
                          <div className="text-xs w-1 text-muted-foreground">Pendências</div>
                          <div className="text-xs font-semibold">{returnedOrders.length}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 rounded-md bg-background/70 p-2">
                        <CalendarDaysIcon className="h-5 w-5 text-amber-600" />
                        <div>
                          <div className="text-xs text-muted-foreground">Prazos</div>
                          <div className="text-sm font-semibold">{ordersDueToday.length}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
              <div className="flex flex-col items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-muted/50">
                        <ExclamationTriangleIcon className="h-5 w-5 text-rose-600" />
                        {returnedOrders.length > 0 && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500 shadow-sm" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">Pendências: {returnedOrders.length}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-muted/50">
                        <CalendarDaysIcon className="h-5 w-5 text-amber-600" />
                        {ordersDueToday.length > 0 && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 shadow-sm" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">Prazos: {ordersDueToday.length}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        )}

        {/* Troca de painel (única, sem duplicar UI) */}
        {showPanelSwitcher && (
          <div className={cn("px-4 pb-2", isCollapsed && "px-2")}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-between",
                    isCollapsed && "w-full justify-center px-0"
                  )}
                >
                  <span className={cn("flex items-center gap-2", isCollapsed && "gap-0")}>
                    <MapPinIcon className="h-5 w-5" />
                    {!isCollapsed && <span className="text-sm">Alternar Painel</span>}
                  </span>
                  {!isCollapsed && <StarIcon className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuLabel>Modo de trabalho</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center gap-2">
                    <ClipboardDocumentListIcon className="h-5 w-5" />
                    <div className="flex flex-col">
                      <span className="text-sm">Assistente</span>
                      <span className="text-xs text-muted-foreground">Operação diária</span>
                    </div>
                    {panel === "assistant" && (
                      <Badge variant="secondary" className="ml-auto text-[10px]">Atual</Badge>
                    )}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/admin" className="flex items-center gap-2">
                    <UsersIcon className="h-5 w-5" />
                    <div className="flex flex-col">
                      <span className="text-sm">Admin</span>
                      <span className="text-xs text-muted-foreground">Aprovações e equipe</span>
                    </div>
                    {panel === "admin" && (
                      <Badge variant="secondary" className="ml-auto text-[10px]">Atual</Badge>
                    )}
                  </Link>
                </DropdownMenuItem>

                {isMaster && (
                  <DropdownMenuItem asChild>
                    <Link to="/master" className="flex items-center gap-2">
                      <StarIcon className="h-5 w-5 text-accent" />
                      <div className="flex flex-col">
                        <span className="text-sm">Master</span>
                        <span className="text-xs text-muted-foreground">Config global</span>
                      </div>
                      {panel === "master" && (
                        <Badge variant="secondary" className="ml-auto text-[10px]">Atual</Badge>
                      )}
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Menus */}
        {menus.map((group, groupIndex) => (
          <SidebarGroup key={`${group.label}-${groupIndex}`}>
            {!isCollapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isPathActive(location.pathname, item.url);

                  const tooltipContent = (
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      )}
                      {item.secondary && (
                        <div className="text-[11px] text-muted-foreground">{item.secondary}</div>
                      )}
                      {typeof item.badge === "number" && isCollapsed && (
                        <div className="text-[11px] text-muted-foreground">
                          Pendências: {item.badge}
                        </div>
                      )}
                    </div>
                  );

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={{ children: tooltipContent }}
                        className="menu-item-hover overflow-visible"
                      >
                        <Link
                          to={item.url}
                          className={cn(
                            "relative group flex items-center justify-between w-full overflow-visible",
                            isCollapsed && "justify-center"
                          )}
                        >
                          <span className={cn("flex items-center gap-2", isCollapsed && "gap-0")}>
                            <item.icon className="h-5 w-5" />
                            {!isCollapsed && <span>{item.title}</span>}
                          </span>

                          {/* badge */}
                          {typeof item.badge === "number" && item.badge > 0 && isCollapsed && (
                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-sm" />
                          )}

                          {typeof item.badge === "number" && item.badge > 0 && !isCollapsed && (
                            <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5 text-xs animate-pulse">
                              {item.badge}
                            </Badge>
                          )}

                          {/* suffix */}
                          {item.suffix && !isCollapsed && (
                            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                              {item.suffix}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>

            {groupIndex < menus.length - 1 && <SidebarSeparator />}
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter className="p-3 border-t border-border/50">
        {/* Theme Toggle */}
        <div className={cn("flex items-center mb-3", isCollapsed ? "justify-center" : "justify-between px-2")}>
          {!isCollapsed && <span className="text-xs text-muted-foreground">Tema</span>}

          <ToggleGroup
            type="single"
            value={theme || "system"}
            onValueChange={(v) => v && setTheme(v)}
            className={cn(
              "rounded-full border border-border/60 bg-background/60 p-1",
              isCollapsed && "flex flex-col items-center gap-1 p-0 border-transparent"
            )}
          >
            <ToggleGroupItem
              value="light"
              aria-label="Tema claro"
              className={cn("h-9 w-9 rounded-full data-[state=on]:bg-primary/10", isCollapsed && "h-9 w-9")}
            >
              <SunIcon className="h-5 w-5" />
            </ToggleGroupItem>

            <ToggleGroupItem
              value="dark"
              aria-label="Tema escuro"
              className={cn("h-9 w-9 rounded-full data-[state=on]:bg-primary/10", isCollapsed && "h-9 w-9")}
            >
              <MoonIcon className="h-5 w-5" />
            </ToggleGroupItem>

            <ToggleGroupItem
              value="system"
              aria-label="Tema do sistema"
              className={cn("h-9 w-9 rounded-full data-[state=on]:bg-primary/10", isCollapsed && "h-9 w-9")}
            >
              <ComputerDesktopIcon className="h-5 w-5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="my-3 h-px bg-border/60" />

        {/* Clerk + Ações */}
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
          <div className={cn("flex items-center gap-2", isCollapsed && "flex-col gap-2")}>
            {/* Clerk User Button (Account/Settings/Sign out) */}
            <UserButton
              userProfileMode="modal"
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-8 w-8",
                },
              }}
            >
              {/* Se você tiver uma rota de settings própria, deixa aqui também */}
              <UserButton.MenuItems>
                <UserButton.Action
                  label="Minha Conta"
                  labelIcon={<Cog6ToothIcon className="h-4 w-4" />}
                  onClick={() => clerk.openUserProfile()}
                />
                <UserButton.Action label="signOut" />
              </UserButton.MenuItems>
            </UserButton>

            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{displayName}</div>
                <div className="text-xs text-muted-foreground truncate">{roleLabel}</div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Ações rápidas">
                  <Cog6ToothIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Config & conta</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    clerk.openUserProfile();
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Cog6ToothIcon className="h-5 w-5" />
                    Minha Conta
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive cursor-pointer focus:text-destructive"
                >
                  <ArrowLeftStartOnRectangleIcon className="h-5 w-5 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Só pra não “sumir” o logout quando colapsado e você não quiser depender do menu do Clerk */}
        {isCollapsed && (
          <div className="mt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    aria-label="Sair"
                  >
                    <ArrowLeftStartOnRectangleIcon className="h-5 w-5 text-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
