import { api } from "@/lib/api";

export interface MeResponse {
  username: string | null;
  nombre?: string;
  apellido?: string;
  rolNombre: string | null;
  sedeId: number | null;
  sedeNombre: string | null;
  modulos: string[];
  /** Solo rol SUPERUSUARIO (cliente multi-bodega) */
  sectoresGestionadosIds?: number[] | null;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
}

const BASE = "/api/auth";

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>(`${BASE}/login`, { username, password }).then((r) => r.data),

  me: () =>
    api.get<MeResponse>(`${BASE}/me`).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<LoginResponse>(`${BASE}/refresh`, { refreshToken }).then((r) => r.data),

  /** Solo Superusuario cliente: cambia bodega activa para operar (ventas, etc.). */
  cambiarSedeActiva: (sectorId: number) =>
    api.put<MeResponse>("/api/mi-cuenta/sede-activa", { sectorId }).then((r) => r.data),
};
