import { api } from "@/lib/api";

export interface SectorResponse {
  id: number;
  nombreSector: string;
  telefono: string | null;
  direccion: string | null;
  videoPromocionalUrl: string | null;
  /** Si false, la bodega no aparece en plataforma ni en listados de clientes. */
  activo: boolean;
}

export interface SectorPlataformaResponse {
  id: number;
  nombreSector: string;
  telefono: string | null;
  direccion: string | null;
  videoPromocionalUrl: string | null;
  activo: boolean;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  number: number;
  size: number;
  totalElements: number;
}

export interface SectorRequest {
  nombreSector: string;
  telefono?: string | null;
  direccion?: string | null;
  videoPromocionalUrl?: string | null;
}

const BASE = "/api/sectores";

export const sectoresApi = {
  listar: (params: { page?: number; size?: number }) =>
    api.get<PageResponse<SectorResponse>>(BASE, { params }).then((r) => r.data),

  obtener: (id: number) =>
    api.get<SectorResponse>(`${BASE}/${id}`).then((r) => r.data),

  crear: (body: SectorRequest) =>
    api.post<SectorResponse>(BASE, body).then((r) => r.data),

  actualizar: (id: number, body: SectorRequest) =>
    api.put<SectorResponse>(`${BASE}/${id}`, body).then((r) => r.data),

  /** Solo SUPERADMIN. Activa o desactiva la bodega (plataforma y operación). */
  cambiarActivo: (id: number, activo: boolean) =>
    api.patch<SectorResponse>(`${BASE}/${id}/activo`, { activo }).then((r) => r.data),

  eliminar: (id: number) =>
    api.delete(`${BASE}/${id}`),

  /** Tarjetas de sede (superusuario: todas; resto: su sede). */
  plataforma: () =>
    api.get<SectorPlataformaResponse[]>(`${BASE}/plataforma`).then((r) => r.data),
};
