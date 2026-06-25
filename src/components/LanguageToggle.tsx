import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type LanguageToggleProps = {
  className?: string;
  /** Variante clara para login / fondos claros */
  variant?: "default" | "header";
};

export function LanguageToggle({ className, variant = "default" }: LanguageToggleProps) {
  const { i18n, t } = useTranslation();
  const current = i18n.language?.startsWith("en") ? "en" : "es";

  const setLang = (lng: "es" | "en") => {
    if (lng !== current) void i18n.changeLanguage(lng);
  };

  const baseBtn =
    variant === "header"
      ? "min-w-[2rem] rounded px-2 py-1 text-xs font-semibold transition-colors"
      : "min-w-[2.25rem] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors";

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border p-0.5",
        variant === "header"
          ? "border-border bg-muted/50"
          : "border-border bg-background shadow-sm",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setLang("es")}
        className={cn(
          baseBtn,
          current === "es"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        aria-pressed={current === "es"}
      >
        {t("language.es")}
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn(
          baseBtn,
          current === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        aria-pressed={current === "en"}
      >
        {t("language.en")}
      </button>
    </div>
  );
}
