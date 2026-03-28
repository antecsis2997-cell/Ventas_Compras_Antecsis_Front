import type { CSSProperties } from "react";

/**
 * Marco / retoque visual de imágenes de producto (referencia Marketing).
 * Valores en HEX; RGB entre paréntesis para hojas de estilo o diseño.
 */
export const MARCA_IMG_PRODUCTO = {
  /** rgb(15, 52, 96) */
  azulMarco: "#0f3460",
  /** rgb(56, 189, 248) */
  acentoCian: "#38bdf8",
  /** rgb(30, 58, 95) */
  azulSombra: "#1e3a5f",
  /** rgb(15, 23, 42) — fondo detrás de la foto en POS oscuro */
  fondoMatte: "#0f172a",
} as const;

/** POS / fondos oscuros: anillo azul marca + halo cian suave */
export function estiloMarcoImagenPOS(): CSSProperties {
  const { azulMarco } = MARCA_IMG_PRODUCTO;
  return {
    boxShadow: `0 0 0 2px ${azulMarco}, 0 4px 22px rgba(30, 58, 95, 0.55), 0 0 28px rgba(56, 189, 248, 0.18)`,
  };
}

/** Lista productos (tema claro): marco más discreto */
export function estiloMarcoImagenClaro(): CSSProperties {
  const { azulMarco } = MARCA_IMG_PRODUCTO;
  return {
    boxShadow: `0 0 0 2px ${azulMarco}, 0 2px 10px rgba(30, 58, 95, 0.2)`,
  };
}

/** Recuadro de la imagen ampliada (hover) */
export function estiloContenedorPreviewHover(): CSSProperties {
  const { azulMarco, acentoCian } = MARCA_IMG_PRODUCTO;
  return {
    backgroundColor: "#05080f",
    boxShadow: `inset 0 0 0 2px ${azulMarco}, 0 0 32px rgba(56, 189, 248, 0.12)`,
    borderBottom: `3px solid ${acentoCian}`,
  };
}
