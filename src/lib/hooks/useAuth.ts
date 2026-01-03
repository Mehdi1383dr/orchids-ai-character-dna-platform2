"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AuthSession, AuthUser } from "@/lib/types/auth";

interface UseAuthReturn {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (session: AuthSession) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const SESSION_KEY = "auth_session";
const REFRESH_THRESHOLD = 5 * 60 * 1000;

function getSessionFromStorage(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AuthSession;
      if (parsed.expiresAt > Date.now()) {
        return parsed;
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
  return null;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadedSession = getSessionFromStorage();
    setSession(loadedSession);
    setIsLoading(false);

    const handleStorageChange = () => {
      const newSession = getSessionFromStorage();
      setSession(newSession);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth-change", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth-change", handleStorageChange);
    };
  }, []);

  const refreshSessionFn = useCallback(async (): Promise<boolean> => {
    const currentSession = getSessionFromStorage();
    if (!currentSession?.refreshToken) return false;

    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
      });

      if (!res.ok) {
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
        return false;
      }

      const data = await res.json();
      if (data.session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
        setSession(data.session);
        window.dispatchEvent(new CustomEvent("auth-change"));
        return true;
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
    }
    return false;
  }, []);

  useEffect(() => {
    if (!session) return;

    const timeUntilRefresh = session.expiresAt - Date.now() - REFRESH_THRESHOLD;
    if (timeUntilRefresh <= 0) {
      refreshSessionFn();
      return;
    }

    const timer = setTimeout(() => {
      refreshSessionFn();
    }, timeUntilRefresh);

    return () => clearTimeout(timer);
  }, [session, refreshSessionFn]);

  const login = useCallback((newSession: AuthSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
    window.dispatchEvent(new CustomEvent("auth-change"));
  }, []);

  const logout = useCallback(async () => {
    try {
      const currentSession = getSessionFromStorage();
      if (currentSession?.refreshToken) {
        await fetch("/api/auth/signout", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentSession.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
        });
      }
    } catch {
    } finally {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
      window.dispatchEvent(new CustomEvent("auth-change"));
      router.push("/auth/login");
    }
  }, [router]);

  return {
    user: session?.user ?? null,
    session,
    isLoading,
    isAuthenticated: !!session && session.expiresAt > Date.now(),
    login,
    logout,
    refreshSession: refreshSessionFn,
  };
}

export function getStoredSession(): AuthSession | null {
  return getSessionFromStorage();
}

export function getAccessToken(): string | null {
  const session = getStoredSession();
  return session?.accessToken ?? null;
}
