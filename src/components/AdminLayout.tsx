import { useCallback, useEffect, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { NotificationBell } from "./NotificationBell";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Search, Menu } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isLg = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    if (isLg) setMobileNavOpen(false);
  }, [isLg]);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  return (
    <div className="min-h-screen bg-background">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden"
          aria-label="Cerrar menú"
          onClick={closeMobileNav}
        />
      )}

      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileNavOpen}
        onMobileClose={closeMobileNav}
        isDesktop={isLg}
      />

      <div
        className={`flex min-h-screen flex-col transition-[margin] duration-300 ml-0 ${
          collapsed ? "lg:ml-[70px]" : "lg:ml-[260px]"
        }`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 shadow-sm sm:h-16 sm:px-4 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden min-w-0 flex-1 sm:block sm:max-w-md lg:max-w-sm xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar productos, clientes..."
                className="h-9 w-full min-w-0 rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <NotificationBell />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground sm:h-9 sm:w-9 sm:text-sm">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6">{children}</main>

        <footer className="shrink-0 border-t border-border bg-card/50 px-3 py-3 text-center text-[11px] text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} ANTECSIS · Todos los derechos reservados.
        </footer>
      </div>
    </div>
  );
}
