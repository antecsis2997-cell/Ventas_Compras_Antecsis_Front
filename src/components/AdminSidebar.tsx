import { useState, useMemo, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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

interface SidebarItem {
  title: string;
  url: string;
  icon: React.ElementType;
  moduloCodigo?: string;
  children?: { title: string; url: string }[];
  requiresSuperadmin?: boolean;
  /** Si se define, mostrar solo para estos roles (ADMIN, SOPORTE, SUPERUSUARIO) */
  rolesPermitidos?: string[];
}

function buildMenuItems(esSuperadminPlataforma: boolean): SidebarItem[] {
  const dashboardChildren = [
    ...(!esSuperadminPlataforma ? [{ title: "Plataforma sectores", url: "/plataforma-sectores" }] : []),
    { title: "Inicio", url: "/dashboard" },
    { title: "Vista Pantalla 1", url: "/vista-pantalla-1" },
    { title: "Vista Pantalla 2", url: "/vista-pantalla-2" },
  ];

  const items: SidebarItem[] = [
  // Vista general
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    moduloCodigo: "DASHBOARD",
    children: dashboardChildren,
  },
  // Catálogo
  { title: "Productos", url: "/productos", icon: Package, moduloCodigo: "PRODUCTOS" },
  { title: "Categorías", url: "/categorias", icon: Tags, moduloCodigo: "PRODUCTOS" },
  { title: "Inventario", url: "/insumos", icon: Boxes, moduloCodigo: "INVENTARIO" },
  // Operaciones (primero compras, luego ventas)
  { title: "Compras", url: "/compras", icon: Truck, moduloCodigo: "COMPRAS" },
  { title: "Ventas", url: "/ventas", icon: ShoppingCart, moduloCodigo: "VENTAS" },
  { title: "Facturación", url: "/facturacion", icon: FileText, moduloCodigo: "VENTAS" },
  // Personas
  { title: "Clientes", url: "/clientes", icon: UserCircle2, moduloCodigo: "CLIENTES" },
  { title: "Proveedores", url: "/proveedores", icon: UsersRound, moduloCodigo: "PROVEEDORES" },
  // Análisis
  {
    title: "Reportes",
    url: "/reportes",
    icon: BarChart3,
    moduloCodigo: "REPORTES",
    children: [
      { title: "Ventas Diarias", url: "/reportes/diarias" },
      { title: "Ventas Mensuales", url: "/reportes/mensuales" },
      { title: "Ventas Anuales", url: "/reportes/anuales" },
    ],
  },
  // Logística
  {
    title: "Logística",
    url: "/entregas",
    icon: Route,
    moduloCodigo: "LOGISTICA_ENTREGAS",
    children: [
      { title: "Entregas (3 a 5 días)", url: "/entregas" },
      { title: "Delivery (Inmediata)", url: "/delivery" },
      { title: "5 a 6 meses", url: "/entregas/5-6-meses" },
      { title: "Métricas entregas", url: "/logistica/metricas" },
      { title: "Informe pendientes delivery", url: "/logistica/informe-pedidos-pendientes-delivery" },
    ],
  },
  // Comunicación
  { title: "Solicitudes de stock", url: "/solicitudes", icon: ClipboardList, moduloCodigo: "SOLICITUDES_STOCK" },
  {
    title: "Mi cuenta",
    url: "/cuenta/licencia",
    icon: BadgeCheck,
    children: [
      { title: "Licencia", url: "/cuenta/licencia" },
      { title: "Bandeja del sistema", url: "/cuenta/bandeja" },
    ],
  },
  // Administración
  { title: "Usuarios", url: "/usuarios", icon: Users, moduloCodigo: "USUARIOS" },
  { title: "Solicitudes de recuperación", url: "/solicitudes-recuperacion", icon: KeyRound, rolesPermitidos: ["SUPERADMIN", "SUPERUSUARIO", "ADMIN", "SOPORTE"] },
  { title: "Sectores", url: "/sectores", icon: Building2, requiresSuperadmin: true },
  { title: "Suscripciones", url: "/suscripciones", icon: FileCheck, requiresSuperadmin: true },
  { title: "Rubros comerciales", url: "/admin/rubros-comerciales", icon: Tags, requiresSuperadmin: true },
  { title: "Config. Fiscal SUNAT", url: "/configuracion-fiscal", icon: Building2, rolesPermitidos: ["SUPERADMIN", "SUPERUSUARIO", "ADMIN"] },
  ];

  if (esSuperadminPlataforma) {
    const idx = items.findIndex((i) => i.title === "Usuarios");
    items.splice(Math.max(0, idx), 0, {
      title: "Perfil de superusuario",
      url: "/plataforma-sectores",
      icon: UserCog,
      requiresSuperadmin: true,
      children: [{ title: "Plataforma sectores", url: "/plataforma-sectores" }],
    });
  }

  return items;
}

function SidebarUser() {
  const navigate = useNavigate();
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
          {username ?? "Usuario"}
        </p>
        <p className="text-xs text-sidebar-foreground truncate">
          {rolNombre ?? ""}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs text-sidebar-foreground hover:text-sidebar-primary truncate mt-0.5"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  /** Drawer móvil (&lt; lg) */
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
  const { rolNombre, hasModule, esDueñoPlataforma } = useAuth();
  const menuItems = useMemo(() => buildMenuItems(esDueñoPlataforma), [esDueñoPlataforma]);

  // No desplegar por defecto; abrir solo la sección donde el usuario está ubicado.
  const [openMenus, setOpenMenus] = useState<string[]>(() => {
    const isActive = (url: string) => location.pathname === url;
    const isChildActive = (children?: { url: string }[]) =>
      children?.some((c) => location.pathname === c.url);
    const initial = buildMenuItems(esDueñoPlataforma);
    return initial
      .filter((item) => item.children && (isActive(item.url) || isChildActive(item.children)))
      .map((item) => item.title);
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

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (url: string) => location.pathname === url;
  const isChildActive = (children?: { url: string }[]) =>
    children?.some((c) => location.pathname === c.url);

  const drawerOpen = isDesktop || mobileOpen;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-out lg:z-40",
        "w-[min(100vw-2rem,280px)] sm:w-[260px]",
        collapsed ? "lg:w-[70px]" : "lg:w-[260px]",
        drawerOpen ? "translate-x-0 shadow-xl lg:shadow-none" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-3 sm:h-16 sm:px-4">
        {showLabels ? (
          <div className="flex min-w-0 items-center gap-2">
            <img src="/logo-antecsis.png" alt="AnTecsis" className="h-9 w-auto sm:h-12" />
          </div>
        ) : (
          <img src="/logo-antecsis.png" alt="AnTecsis" className="mx-auto h-9 w-auto" />
        )}
        <button
          type="button"
          onClick={() => (isDesktop ? onToggle() : onMobileClose())}
          className="shrink-0 rounded p-1 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label={isDesktop ? (collapsed ? "Expandir menú" : "Contraer menú") : "Cerrar menú"}
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && isDesktop ? "rotate-180" : "")}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-3 scrollbar-thin sm:px-3 sm:py-4">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.url) || isChildActive(item.children);
          const isOpen = openMenus.includes(item.title);

          if (item.children) {
            return (
              <div key={item.title}>
                <button
                  onClick={() => toggleMenu(item.title)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {showLabels && (
                    <>
                      <span className="min-w-0 flex-1 truncate text-left">{item.title}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </>
                  )}
                </button>
                {showLabels && isOpen && (
                  <div className="ml-4 mt-1 space-y-1 sm:ml-8">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.url}
                        to={child.url}
                        className={({ isActive }) =>
                          "block rounded-md px-3 py-2 text-sm transition-colors " +
                          (isActive
                            ? "bg-sidebar-accent text-sidebar-primary font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")
                        }
                      >
                        {child.title}
                      </NavLink>
                    ))}
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
              className={({ isActive }) =>
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors " +
                (isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {showLabels && <span className="truncate">{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer: user info */}
      {showLabels && (
        <div className="shrink-0 border-t border-sidebar-border p-3 sm:p-4">
          <SidebarUser />
        </div>
      )}
    </aside>
  );
}
