import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  /** Clave bajo pages.* en locales, ej. "products", "reportDaily" */
  pageKey: string;
  className?: string;
  titleExtra?: React.ReactNode;
};

export function PageHeader({ pageKey, className, titleExtra }: PageHeaderProps) {
  const { t } = useTranslation();
  const base = `pages.${pageKey}`;

  return (
    <div className={cn("page-header", className)}>
      <h1 className="page-title">
        {titleExtra}
        {t(`${base}.title`)}
      </h1>
      <p className="page-subtitle">{t(`${base}.subtitle`)}</p>
    </div>
  );
}
