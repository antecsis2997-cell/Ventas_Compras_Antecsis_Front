import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const API_TIMEOUT_MS = 30_000;

/** Cliente axios configurado: baseURL, timeout, JSON, interceptores de auth y refresh. */
export const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

/** Respuesta de error típica del backend (campo message). */
export interface ApiErrorBody {
  message?: string;
  error?: string;
}

/** Extrae mensaje de error de una respuesta axios para mostrar al usuario. */
export function getApiErrorMessage(err: unknown): string {
  const e = err as AxiosError<ApiErrorBody>;
  const msg = e.response?.data?.message ?? e.response?.data?.error;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  if (e.code === "ECONNABORTED") return "Tiempo de espera agotado. Reintente.";
  if (e.message) return e.message;
  return "Error de conexión";
}

const AUTH_TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const storage = sessionStorage;

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(token: string | null, err: unknown) {
  failedQueue.forEach((p) => (token ? p.resolve(token) : p.reject(err)));
  failedQueue = [];
}

api.interceptors.request.use((config) => {
  const url = config.url ?? "";
  const isPublic = url.includes("/api/auth/login") || url.includes("/api/auth/refresh") || url.includes("/api/auth/puede-recuperar");
  if (!isPublic) {
    const token = storage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (err.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = storage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        storage.removeItem(AUTH_TOKEN_KEY);
        window.location.href = "/login";
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post<{ token: string; refreshToken: string }>("/api/auth/refresh", { refreshToken });
        storage.setItem(AUTH_TOKEN_KEY, data.token);
        storage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        processQueue(data.token, null);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(null, refreshErr);
        storage.removeItem(AUTH_TOKEN_KEY);
        storage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export function getAuthToken(): string | null {
  return storage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  storage.setItem(AUTH_TOKEN_KEY, token);
}

export function setRefreshToken(token: string): void {
  storage.setItem(REFRESH_TOKEN_KEY, token);
}

export function logout(): void {
  storage.removeItem(AUTH_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
}

/** Decode JWT payload to get username (no lib needed). */
export function getUsernameFromToken(): string | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || "{}"));
    return payload.sub ?? payload.username ?? null;
  } catch {
    return null;
  }
}

/** Decode JWT payload to get role. */
export function getRoleFromToken(): string | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || "{}"));
    return payload.rol ?? null;
  } catch {
    return null;
  }
}
