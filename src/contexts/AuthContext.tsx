import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api, getAuthToken, setAuthToken as persistToken, logout as doLogout, getUsernameFromToken, getRoleFromToken } from "@/lib/api";

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  rolNombre: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [rolNombre, setRolNombre] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUsername(getUsernameFromToken());
    setRolNombre(getRoleFromToken());
    setReady(true);
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const { data } = await api.post<{ token: string }>("/api/auth/login", { username: user, password });
    persistToken(data.token);
    setUsername(getUsernameFromToken());
    setRolNombre(getRoleFromToken());
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setUsername(null);
    setRolNombre(null);
  }, []);

  const isAuthenticated = !!getAuthToken();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30" role="status" aria-label="Cargando">
        <span className="text-muted-foreground text-sm">Cargando...</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, rolNombre, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
