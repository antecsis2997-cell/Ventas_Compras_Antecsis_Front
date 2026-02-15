import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api, getAuthToken, setAuthToken as persistToken, logout as doLogout, getUsernameFromToken } from "@/lib/api";

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUsername(getUsernameFromToken());
    setReady(true);
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const { data } = await api.post<{ token: string }>("/api/auth/login", { username: user, password });
    persistToken(data.token);
    setUsername(getUsernameFromToken());
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setUsername(null);
  }, []);

  const isAuthenticated = !!getAuthToken();

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
