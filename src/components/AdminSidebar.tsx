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
  Store,
  Boxes,
  Building2,
  MapPin,
  FileText,
  UserCircle2,
  UsersRound,
  ClipboardList,
  MessageSquare,
  History,
} from "lucide-react";

interface SidebarItem {
  title: string;
  url: string;
  icon: React.ElementType;
  children?: { title: string; url: string }[];
  requiresAdmin?: boolean;
  requiresSuperadmin?: boolean;
}

const menuItems: SidebarItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Productos", url: "/productos", icon: Package },
  { title: "Ventas", url: "/ventas", icon: ShoppingCart },
  { title: "Compras", url: "/compras", icon: Truck },
  { title: "Insumos", url: "/insumos", icon: Boxes },
  { title: "Usuarios", url: "/usuarios", icon: Users, requiresAdmin: true },
  { title: "Clientes", url: "/clientes", icon: UserCircle2 },
  { title: "Sectores", url: "/sectores", icon: Building2, requiresSuperadmin: true },
  { title: "Proveedores", url: "/proveedores", icon: UsersRound },
  { title: "Localización", url: "/localizacion", icon: MapPin },
  { title: "Solicitudes", url: "/solicitudes", icon: ClipboardList },
  { title: "Mensajes", url: "/mensajes", icon: MessageSquare },
  { title: "Historial de pedidos", url: "/historial-pedidos", icon: History },
  {
    title: "Reportes",
    url: "/reportes",
    icon: BarChart3,
    children: [
      { title: "Ventas Diarias", url: "/reportes/diarias" },
      { title: "Ventas Mensuales", url: "/reportes/mensuales" },
      { title: "Ventas Anuales", url: "/reportes/anuales" },
    ],
  },
  { title: "Facturación", url: "/facturacion", icon: FileText },
];

function SidebarUser() {
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
        A
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
          Admin
        </p>
        <p className="text-xs text-sidebar-foreground truncate">
          Administrador
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
  const { rolNombre } = useAuth();
  const canManageUsers = rolNombre === "SUPERUSUARIO" || rolNombre === "ADMIN";
  const canManageSectores = rolNombre === "SUPERUSUARIO";
  const [openMenus, setOpenMenus] = useState<string[]>(["Reportes"]);

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.requiresSuperadmin) return canManageSectores;
    if (item.requiresAdmin) return canManageUsers;
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
            <Store className="h-7 w-7 text-sidebar-primary" />
            <span className="text-lg font-bold text-sidebar-accent-foreground">
              BodegasPro
            </span>
          </div>
        )}
        {collapsed && <Store className="h-7 w-7 text-sidebar-primary mx-auto" />}
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

      {/* Footer: user from JWT */}
      {!collapsed && (
        <div className="border-t border-sidebar-border p-4">
          <SidebarUser />
        </div>
      )}
    </aside>
  );
}
