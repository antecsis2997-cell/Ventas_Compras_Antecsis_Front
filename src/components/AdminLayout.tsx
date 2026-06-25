import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AdminSidebar } from "./AdminSidebar";
import { NotificationBell } from "./NotificationBell";
import { LanguageToggle } from "./LanguageToggle";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation();
  const { username } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isLg = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    if (isLg) setMobileNavOpen(false);
  }, [isLg]);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  const userInitial =
    username && username.trim().length > 0 ? username.trim().charAt(0).toUpperCase() : "U";

  return (
    <div className="relative min-h-screen bg-background">
      <a
        href="#main-content"
        className="pointer-events-none absolute left-1/2 top-0 z-[100] inline-flex -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-b-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground opacity-0 shadow-md outline-none ring-2 ring-ring ring-offset-2 ring-offset-background transition-[transform,opacity] duration-200 focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100"
      >
        {t("layout.skipToContent")}
      </a>
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden"
          aria-label={t("layout.closeMenu")}
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
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:gap-4">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              aria-expanded={mobileNavOpen}
              aria-controls="sidebar-nav"
              aria-label={t("layout.openMenu")}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageToggle variant="header" />
            <NotificationBell />
            <Link
              to="/cuenta/licencia"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-9 sm:w-9 sm:text-sm"
              title={username ?? t("layout.myAccount")}
              aria-label={
                username
                  ? t("layout.goToAccountUser", { user: username })
                  : t("layout.goToAccount")
              }
            >
              {userInitial}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-x-hidden p-3 outline-none scroll-mt-14 sm:p-4 sm:scroll-mt-16 lg:p-6"
        >
          {children}
        </main>

        <footer className="shrink-0 border-t border-border bg-card/50 px-3 py-3 text-center text-xs leading-snug text-muted-foreground sm:px-6">
          {t("layout.footer", { year: new Date().getFullYear() })}
        </footer>
      </div>
    </div>
  );
}
