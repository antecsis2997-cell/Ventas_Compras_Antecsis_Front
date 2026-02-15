import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

const AUTH_TOKEN_KEY = "authToken";
const storage = sessionStorage;

api.interceptors.request.use((config) => {
  const token = storage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      storage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = "/login";
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

export function logout(): void {
  storage.removeItem(AUTH_TOKEN_KEY);
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
