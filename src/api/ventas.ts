import { api } from "@/lib/api";

export interface VentaItemResponse {
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface VentaResponse {
  id: number;
  clienteId: number;
  clienteNombre: string;
  usuarioNombre: string;
  sectorId: number | null;
  sectorNombre: string | null;
  metodoPagoNombre: string | null;
  fecha: string;
  total: number;
  estado: string;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  moneda: string;
  items: VentaItemResponse[];
  [key: string]: unknown;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  number: number;
  size: number;
  totalElements: number;
}

const BASE = "/api/ventas";

export const ventasApi = {
  listar: (params: { page?: number; size?: number; sectorId?: number | null }) =>
    api.get<PageResponse<VentaResponse>>(BASE, { params }).then((r) => r.data),

  obtener: (id: number) =>
    api.get<VentaResponse>(`${BASE}/${id}`).then((r) => r.data),

  crear: (body: {
    clienteId: number;
    metodoPagoId?: number | null;
    tipoDocumento?: string | null;
    numeroDocumento?: string | null;
    moneda?: string;
    conCuotas?: boolean | null;
    requiereDelivery?: boolean;
    tipoEntrega?: string | null;
    direccionEntrega?: string | null;
    dniCmr?: string | null;
    yapeTelefono?: string | null;
    yapeOtp?: string | null;
    observaciones?: string | null;
    items: Array<{ productoId: number; cantidad: number; precioUnitario?: number }>;
  }) => api.post<VentaResponse>(BASE, body).then((r) => r.data),

  siguienteNumeroComprobante: (tipoDocumento: string) =>
    api.get<{ siguienteNumero: string }>(`${BASE}/siguiente-numero-comprobante`, { params: { tipoDocumento } }).then((r) => r.data),
};
