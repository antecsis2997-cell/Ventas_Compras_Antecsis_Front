import { useState, useMemo, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  Boxes,
  Building2,
  FileText,
  UserCircle2,
  UsersRound,
  ClipboardList,
  Tags,
  FileCheck,
  KeyRound,
  Route,
  BadgeCheck,
  UserCog,
} from "lucide-react";

interface SidebarChild {
  key: string;
  url: string;
  matchPaths?: string[];
}

interface SidebarItem {
  key: string;
  url: string;
  icon: React.ElementType;
  moduloCodigo?: string;
  children?: SidebarChild[];
  requiresSuperadmin?: boolean;
  rolesPermitidos?: string[];
}

function buildMenuItems(esSuperadminPlataforma: boolean): SidebarItem[] {
  const dashboardChildren: SidebarChild[] = [
    ...(!esSuperadminPlataforma
      ? [{ key: "platformSectors", url: "/plataforma-sectores" }]
      : []),
    { key: "home", url: "/dashboard" },
    { key: "screenView1", url: "/vista-pantalla-1" },
    { key: "screenView2", url: "/vista-pantalla-2" },
  ];

  const items: SidebarItem[] = [
    {
      key: "dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      moduloCodigo: "DASHBOARD",
      children: dashboardChildren,
    },
    { key: "products", url: "/productos", icon: Package, moduloCodigo: "PRODUCTOS" },
    { key: "categories", url: "/categorias", icon: Tags, moduloCodigo: "PRODUCTOS" },
    { key: "inventory", url: "/insumos", icon: Boxes, moduloCodigo: "INVENTARIO" },
    { key: "purchases", url: "/compras", icon: Truck, moduloCodigo: "COMPRAS" },
    { key: "sales", url: "/ventas", icon: ShoppingCart, moduloCodigo: "VENTAS" },
    { key: "billing", url: "/facturacion", icon: FileText, moduloCodigo: "VENTAS" },
    { key: "clients", url: "/clientes", icon: UserCircle2, moduloCodigo: "CLIENTES" },
    { key: "suppliers", url: "/proveedores", icon: UsersRound, moduloCodigo: "PROVEEDORES" },
    {
      key: "reports",
      url: "/reportes",
      icon: BarChart3,
      moduloCodigo: "REPORTES",
      children: [
        { key: "dailySales", url: "/reportes/diarias" },
        { key: "monthlySales", url: "/reportes/mensuales" },
        { key: "annualSales", url: "/reportes/anuales" },
      ],
    },
    {
      key: "logistics",
      url: "/entregas",
      icon: Route,
      moduloCodigo: "LOGISTICA_ENTREGAS",
      children: [
        {
          key: "deliveries",
          url: "/entregas",
          matchPaths: ["/delivery", "/entregas/5-6-meses"],
        },
        { key: "deliveryMetrics", url: "/logistica/metricas" },
        { key: "pendingDeliveryReport", url: "/logistica/informe-pedidos-pendientes-delivery" },
      ],
    },
    {
      key: "stockRequests",
      url: "/solicitudes",
      icon: ClipboardList,
      moduloCodigo: "SOLICITUDES_STOCK",
    },
    {
      key: "myAccount",
      url: "/cuenta/licencia",
      icon: BadgeCheck,
      children: [
        { key: "license", url: "/cuenta/licencia" },
        { key: "systemInbox", url: "/cuenta/bandeja" },
      ],
    },
    { key: "users", url: "/usuarios", icon: Users, moduloCodigo: "USUARIOS" },
    {
      key: "recoveryRequests",
      url: "/solicitudes-recuperacion",
      icon: KeyRound,
      rolesPermitidos: ["SUPERADMIN", "SUPERUSUARIO", "ADMIN", "SOPORTE"],
    },
    { key: "sectors", url: "/sectores", icon: Building2, requiresSuperadmin: true },
    { key: "subscriptions", url: "/suscripciones", icon: FileCheck, requiresSuperadmin: true },
    {
      key: "commercialRubrics",
      url: "/admin/rubros-comerciales",
      icon: Tags,
      requiresSuperadmin: true,
    },
    {
      key: "sunatFiscalConfig",
      url: "/configuracion-fiscal",
      icon: Building2,
      rolesPermitidos: ["SUPERADMIN", "SUPERUSUARIO", "ADMIN"],
    },
  ];

  if (esSuperadminPlataforma) {
    const idx = items.findIndex((i) => i.key === "users");
    items.splice(Math.max(0, idx), 0, {
      key: "superuserProfile",
      url: "/plataforma-sectores",
      icon: UserCog,
      requiresSuperadmin: true,
      children: [{ key: "platformSectors", url: "/plataforma-sectores" }],
    });
  }

  return items;
}

function SidebarUser() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { username, rolNombre } = useAuth();
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };
  const initial = username ? username.charAt(0).toUpperCase() : "U";
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
          {username ?? t("layout.user")}
        </p>
        <p className="text-xs text-sidebar-foreground truncate">{rolNombre ?? ""}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs text-sidebar-foreground hover:text-sidebar-primary truncate mt-0.5"
        >
          {t("layout.logout")}
        </button>
      </div>
    </div>
  );
}

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  isDesktop: boolean;
}

export function AdminSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  isDesktop,
}: AdminSidebarProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const { rolNombre, hasModule, esDueñoPlataforma } = useAuth();
  const menuItems = useMemo(() => buildMenuItems(esDueñoPlataforma), [esDueñoPlataforma]);

  const [openMenus, setOpenMenus] = useState<string[]>(() => {
    const isActive = (url: string) => location.pathname === url;
    const isChildActive = (children?: SidebarChild[]) =>
      children?.some((c) => location.pathname === c.url);
    const initial = buildMenuItems(esDueñoPlataforma);
    return initial
      .filter((item) => item.children && (isActive(item.url) || isChildActive(item.children)))
      .map((item) => item.key);
  });

  useEffect(() => {
    onMobileClose();
  }, [location.pathname, onMobileClose]);

  const showLabels = isDesktop ? !collapsed : true;

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.requiresSuperadmin) return esDueñoPlataforma;
    if (item.rolesPermitidos) return rolNombre != null && item.rolesPermitidos.includes(rolNombre);
    if (item.moduloCodigo) return hasModule(item.moduloCodigo);
    return true;
  });

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isActive = (url: string) => location.pathname === url;
  const isChildActive = (children?: SidebarChild[]) =>
    children?.some(
      (c) =>
        location.pathname === c.url ||
        (c.matchPaths?.includes(location.pathname) ?? false) ||
        (location.pathname !== "/" && location.pathname.startsWith(`${c.url}/`))
    );

  const drawerOpen = isDesktop || mobileOpen;
  const label = (key: string) => t(`nav.${key}`);

  return (
    <aside
      id="sidebar-nav"
      aria-label={t("layout.mainNav")}
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-out lg:z-40",
        "w-[min(100vw-2rem,280px)] sm:w-[260px]",
        collapsed ? "lg:w-[70px]" : "lg:w-[260px]",
        drawerOpen ? "translate-x-0 shadow-xl lg:shadow-none" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 border-b border-sidebar-border px-3 sm:px-4",
          collapsed && isDesktop ? "flex-col items-center gap-2 py-3" : "h-14 flex-row items-center gap-2 sm:h-16"
        )}
      >
        <NavLink
          to="/dashboard"
          end
          title={t("layout.goHome")}
          onClick={() => {
            if (!isDesktop) onMobileClose();
          }}
          className={cn(
            "flex min-w-0 items-center rounded-md px-3 py-2 outline-none ring-offset-background transition-opacity hover:bg-sidebar-accent/40 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            collapsed && isDesktop
              ? "w-full shrink-0 justify-center py-1"
              : "min-h-10 flex-1 justify-start sm:min-h-11"
          )}
        >
          <img
            src="/logo-antecsis.png"
            alt="ANTECSIS"
            draggable={false}
            className={cn(
              "w-auto shrink-0 object-contain select-none pointer-events-none",
              collapsed && isDesktop ? "max-h-8 max-w-[2.5rem]" : "h-[2.1875rem] sm:h-[2.375rem]"
            )}
          />
        </NavLink>
        <button
          type="button"
          aria-expanded={isDesktop ? !collapsed : drawerOpen}
          onClick={() => (isDesktop ? onToggle() : onMobileClose())}
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring sm:h-11 sm:w-11",
            collapsed && isDesktop && "sm:h-9 sm:w-9"
          )}
          aria-label={
            isDesktop
              ? collapsed
                ? t("layout.expandMenu")
                : t("layout.collapseMenu")
              : t("layout.closeMenu")
          }
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 transition-transform motion-reduce:transition-none",
              collapsed && isDesktop ? "rotate-180" : ""
            )}
          />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-3 scrollbar-thin sm:px-4 sm:py-4">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.url) || isChildActive(item.children);
          const isOpen = openMenus.includes(item.key);

          if (item.children) {
            return (
              <div key={item.key}>
                <button
                  onClick={() => toggleMenu(item.key)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {showLabels && (
                    <>
                      <span className="min-w-0 flex-1 truncate text-left">{label(item.key)}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </>
                  )}
                </button>
                {showLabels && isOpen && (
                  <div className="ml-4 mt-1 space-y-1 sm:ml-8">
                    {item.children.map((child) => {
                      const childPathActive =
                        location.pathname === child.url ||
                        (child.matchPaths?.includes(location.pathname) ?? false) ||
                        (location.pathname !== "/" &&
                          location.pathname.startsWith(`${child.url}/`));
                      return (
                        <NavLink
                          key={`${child.url}-${child.key}`}
                          to={child.url}
                          className={() =>
                            "block rounded-md px-3 py-2 text-sm transition-colors " +
                            (childPathActive
                              ? "bg-sidebar-accent text-sidebar-primary font-medium"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")
                          }
                        >
                          {label(child.key)}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className={({ isActive: navActive }) =>
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors " +
                (navActive
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {showLabels && <span className="truncate">{label(item.key)}</span>}
            </NavLink>
          );
        })}
      </nav>

      {showLabels && (
        <div className="shrink-0 border-t border-sidebar-border p-3 sm:p-4">
          <SidebarUser />
        </div>
      )}
    </aside>
  );
}
