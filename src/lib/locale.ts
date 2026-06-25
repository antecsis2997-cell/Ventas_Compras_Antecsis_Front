import i18n from "@/i18n";

/** Locale BCP 47 para fechas y números según idioma de la UI */
export function getAppLocale(): string {
  return i18n.language === "en" ? "en-US" : "es-PE";
}

export function formatAppDate(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString(getAppLocale(), options);
}

export function formatAppDateTime(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleString(getAppLocale(), options);
}
