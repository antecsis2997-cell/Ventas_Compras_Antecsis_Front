/**
 * Capa API tipada sobre axios.
 * Uso: import { ventasApi, authApi, sectoresApi } from "@/api";
 */

export { authApi } from "./auth";
export type { LoginResponse, MeResponse } from "./auth";

export { sectoresApi } from "./sectores";
export type {
  SectorRequest,
  SectorResponse,
  SectorPlataformaResponse,
  PageResponse as SectoresPageResponse,
} from "./sectores";

export { ventasApi } from "./ventas";
export type { VentaResponse, VentaItemResponse, PageResponse as VentasPageResponse } from "./ventas";
