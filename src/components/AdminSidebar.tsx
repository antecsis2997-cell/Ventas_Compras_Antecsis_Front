import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
  MessageSquare,
  History,
  Tags,
  FileCheck,
  KeyRound,
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

const menuItems: SidebarItem[] = [
  // Vista general
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    moduloCodigo: "DASHBOARD",
    children: [
      { title: "Inicio", url: "/dashboard" },
      { title: "Vista Pantalla 1", url: "/vista-pantalla-1" },
      { title: "Vista Pantalla 2", url: "/vista-pantalla-2" },
    ],
  },
  // Catálogo
  { title: "Productos", url: "/productos", icon: Package, moduloCodigo: "PRODUCTOS" },
  { title: "Categorías", url: "/categorias", icon: Tags, moduloCodigo: "PRODUCTOS" },
  { title: "Inventario", url: "/insumos", icon: Boxes, moduloCodigo: "INVENTARIO" },
  // Operaciones (primero compras, luego ventas)
  { title: "Compras", url: "/compras", icon: Truck, moduloCodigo: "COMPRAS" },
  { title: "Ventas", url: "/ventas", icon: ShoppingCart, moduloCodigo: "VENTAS" },
  { title: "Punto de Venta", url: "/punto-venta", icon: ShoppingCart, moduloCodigo: "VENTAS" },
  { title: "Facturación", url: "/facturacion", icon: FileText, moduloCodigo: "VENTAS" },
  // Personas
  { title: "Clientes", url: "/clientes", icon: UserCircle2, moduloCodigo: "CLIENTES" },
  { title: "Proveedores", url: "/proveedores", icon: UsersRound, moduloCodigo: "PROVEEDORES" },
  // Análisis
  { title: "Historial de pedidos", url: "/historial-pedidos", icon: History, moduloCodigo: "HISTORIAL_PEDIDOS" },
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
    icon: Truck,
    moduloCodigo: "LOGISTICA_ENTREGAS",
    children: [
      { title: "Entregas (3 a 5 días)", url: "/entregas" },
      { title: "Delivery (Inmediata)", url: "/delivery" },
      { title: "5 a 6 meses", url: "/entregas/5-6-meses" },
      { title: "Métricas entregas", url: "/logistica/metricas" },
    ],
  },
  // Comunicación
  { title: "Solicitudes", url: "/solicitudes", icon: ClipboardList, moduloCodigo: "SOLICITUDES_STOCK" },
  { title: "Mensajes", url: "/mensajes", icon: MessageSquare, moduloCodigo: "MENSAJES" },
  // Administración
  { title: "Usuarios", url: "/usuarios", icon: Users, moduloCodigo: "USUARIOS" },
  { title: "Solicitudes de recuperación", url: "/solicitudes-recuperacion", icon: KeyRound, rolesPermitidos: ["SUPERUSUARIO", "ADMIN", "SOPORTE"] },
  { title: "Sectores", url: "/sectores", icon: Building2, requiresSuperadmin: true },
  { title: "Suscripciones", url: "/suscripciones", icon: FileCheck, requiresSuperadmin: true },
];

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
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const location = useLocation();
  const { rolNombre, hasModule } = useAuth();
  const isSuperusuario = rolNombre === "SUPERUSUARIO";
  const [openMenus, setOpenMenus] = useState<string[]>(["Reportes", "Logística"]);

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.requiresSuperadmin) return isSuperusuario;
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

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col ${
        collapsed ? "w-[70px]" : "w-[260px]"
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/logo-antecsis.png" alt="AnTecsis" className="h-12 w-auto" />
          </div>
        )}
        {collapsed && <img src="/logo-antecsis.png" alt="AnTecsis" className="h-9 w-auto mx-auto" />}
        <button
          onClick={onToggle}
          className="text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors p-1 rounded hover:bg-sidebar-accent"
        >
          <ChevronLeft
            className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-1">
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
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.title}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </>
                  )}
                </button>
                {!collapsed && isOpen && (
                  <div className="ml-8 mt-1 space-y-1">
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
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer: user info */}
      {!collapsed && (
        <div className="border-t border-sidebar-border p-4">
          <SidebarUser />
        </div>
      )}
    </aside>
  );
}
