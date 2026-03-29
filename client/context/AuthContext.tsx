"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { setAccessToken, clearAccessToken } from "@/lib/api";
import { useRouter } from "next/navigation";

interface User {
  id: string; name: string; email: string;
  avatar: string | null; provider: string;
  isVerified: boolean; plan: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router                = useRouter();

  // Try to restore session on mount using refresh token cookie
  useEffect(() => {
    const restore = async () => {
      try {
        const me = await api.get("/auth/me");
        setUser(me.data.user);
      } catch {
        // No valid session — user needs to log in
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    router.push("/dashboard");
  }, [router]);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch {}
    clearAccessToken();
    setUser(null);
    router.push("/auth/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);