import * as React from "react";
import { setStoredToken, getStoredToken } from "@/lib/api";
import type { UserProfile } from "@/types/api";

const USER_KEY = "jobscout.user";

interface AuthContextValue {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  /** Call after a successful login or signup response */
  setAuth: (token: string, user: UserProfile) => void;
  /** Clears token, user, and candidateId from storage */
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function readUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

function writeUser(user: UserProfile | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user == null) window.localStorage.removeItem(USER_KEY);
    else window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<UserProfile | null>(null);

  // Hydrate from localStorage on client mount
  React.useEffect(() => {
    setToken(getStoredToken());
    setUser(readUser());
  }, []);

  const setAuth = React.useCallback((newToken: string, newUser: UserProfile) => {
    setStoredToken(newToken);
    writeUser(newUser);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = React.useCallback(() => {
    setStoredToken(null);
    writeUser(null);
    // Also clear candidate state from localStorage
    try {
      window.localStorage.removeItem("jobscout.candidate_id");
      window.localStorage.removeItem("jobscout.last_run_id");
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: !!token,
      setAuth,
      logout,
    }),
    [token, user, setAuth, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
