import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/LanguageToggle";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-2 text-xl text-muted-foreground">{t("pages.notFound.title")}</p>
        <p className="mb-4 text-sm text-muted-foreground">{t("pages.notFound.subtitle")}</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          {t("pages.notFound.returnHome")}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
