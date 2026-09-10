"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { apiFetch, ApiError, getToken, setToken } from "./api";

export type Role = "student" | "instructor" | "admin";

export type Gender = "male" | "female";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  // Used to gate access to the gender-only voice rooms. Set the first time
  // a student tries to enter one; persisted on the profile thereafter.
  gender?: Gender;
  targetMonth?: string;
  targetYear?: number;
  targetScore?: number;
  targetCountry?: string;
  onboarded?: boolean;
  avatar?: string;
};

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    role: "student" | "instructor";
    gender?: Gender;
  }) => Promise<User>;
  login: (email: string, password: string, role: Role) => Promise<User>;
  logout: () => void;
  updateProfile: (patch: Partial<User>) => void;
  changeCredentials: (data: {
    currentPassword: string;
    newEmail?: string;
    newPassword?: string;
  }) => Promise<User>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_CACHE_KEY = "wise-mans-doctrine:user";

function readCachedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const persist = (u: User | null) => {
    setUser(u);
    if (typeof window === "undefined") return;
    try {
      if (u) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
      else localStorage.removeItem(USER_CACHE_KEY);
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getToken();
      if (!token) {
        setReady(true);
        return;
      }
      // Show the cached profile immediately, then confirm against the
      // server (catches revoked/expired sessions and picks up any changes
      // made from another device).
      const cached = readCachedUser();
      if (cached) setUser(cached);
      try {
        const { user: fresh } = await apiFetch<{ user: User }>("/api/auth/me");
        if (!cancelled) persist(fresh);
      } catch {
        if (!cancelled) {
          setToken(null);
          persist(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signup: AuthContextValue["signup"] = async ({ name, email, password, role, gender }) => {
    const { user: u, token } = await apiFetch<{ user: User; token: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role, gender }),
    });
    setToken(token);
    persist(u);
    return u;
  };

  const login: AuthContextValue["login"] = async (email, password, role) => {
    const { user: u, token } = await apiFetch<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });
    setToken(token);
    persist(u);
    return u;
  };

  const logout = () => {
    // Best-effort server-side revoke; local session is cleared regardless.
    apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setToken(null);
    persist(null);
  };

  const updateProfile: AuthContextValue["updateProfile"] = (patch) => {
    if (!user) return;
    // Optimistic local update so the UI feels instant; reconciled with the
    // server's response (e.g. a data: URL avatar becomes a /api/files/id URL).
    persist({ ...user, ...patch });
    apiFetch<{ user: User }>("/api/me", { method: "PATCH", body: JSON.stringify(patch) })
      .then(({ user: fresh }) => persist(fresh))
      .catch((err) => {
        console.error("Failed to save profile changes", err);
      });
  };

  const changeCredentials: AuthContextValue["changeCredentials"] = async (data) => {
    const { user: u, token } = await apiFetch<{ user: User; token: string }>("/api/me/credentials", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setToken(token);
    persist(u);
    return u;
  };

  return (
    <AuthContext.Provider value={{ user, ready, signup, login, logout, updateProfile, changeCredentials }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export { ApiError };
