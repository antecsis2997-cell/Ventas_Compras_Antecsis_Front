import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api, getAuthToken, setAuthToken as persistToken, setRefreshToken as persistRefreshToken, getUsernameFromToken, getRoleFromToken, logout as doLogout } from "@/lib/api";

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  rolNombre: string | null;
  modulos: Set<string>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasModule: (codigo: string) => boolean;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [rolNombre, setRolNombre] = useState<string | null>(null);
  const [modulos, setModulos] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get("/api/auth/me");
      setUsername(data.username ?? null);
      setRolNombre(data.rolNombre ?? null);
      setModulos(new Set(data.modulos ?? []));
    } catch {
      setUsername(getUsernameFromToken());
      setRolNombre(getRoleFromToken());
      setModulos(new Set());
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchMe().finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [fetchMe]);

  const login = useCallback(async (user: string, password: string) => {
    const { data } = await api.post<{ token: string; refreshToken: string }>("/api/auth/login", { username: user, password });
    persistToken(data.token);
    persistRefreshToken(data.refreshToken);
    await fetchMe();
  }, [fetchMe]);

  const logout = useCallback(() => {
    doLogout();
    setUsername(null);
    setRolNombre(null);
    setModulos(new Set());
  }, []);

  const hasModule = useCallback((codigo: string) => {
    if (rolNombre === "SUPERUSUARIO") return true;
    if (modulos.has("*")) return true;
    return modulos.has(codigo);
  }, [rolNombre, modulos]);

  const isAuthenticated = !!getAuthToken();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30" role="status" aria-label="Cargando">
        <span className="text-muted-foreground text-sm">Cargando...</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, rolNombre, modulos, login, logout, hasModule, refreshMe: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
