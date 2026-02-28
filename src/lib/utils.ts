import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Moneda = "PEN" | "USD";

const SIMBOLOS: Record<Moneda, string> = {
  PEN: "S/",
  USD: "$",
};

export function formatMoney(valor: number, moneda: Moneda = "PEN"): string {
  return `${SIMBOLOS[moneda]} ${Number(valor).toFixed(2)}`;
}

export function simboloMoneda(moneda: Moneda = "PEN"): string {
  return SIMBOLOS[moneda];
}
