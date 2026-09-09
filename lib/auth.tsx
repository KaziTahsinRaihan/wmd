"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

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
    role: Role;
    gender?: Gender;
  }) => User;
  login: (email: string, role: Role) => User | null;
  logout: () => void;
  updateProfile: (patch: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "wise-mans-doctrine:user";
const REGISTRY_KEY = "wise-mans-doctrine:users";

function readRegistry(): User[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeRegistry(users: User[]) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(users));
}

const seedUsers: User[] = [
  {
    id: "u-demo-student",
    name: "Aisha Rahman",
    email: "student@demo.io",
    role: "student",
    onboarded: true,
    gender: "female",
    targetMonth: "August",
    targetYear: 2026,
    targetScore: 7.5,
  },
  {
    id: "u-demo-instructor",
    name: "Mr. Daniel Cole",
    email: "instructor@demo.io",
    role: "instructor",
    onboarded: true,
  },
  {
    id: "u-demo-admin",
    name: "Admin Office",
    email: "admin@demo.io",
    role: "admin",
    onboarded: true,
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = readRegistry();
    if (existing.length === 0) writeRegistry(seedUsers);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        /* noop */
      }
    }
    setReady(true);
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    if (typeof window !== "undefined") {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    }
  };

  const signup: AuthContextValue["signup"] = ({ name, email, password, role, gender }) => {
    const users = readRegistry();
    const existing = users.find((u) => u.email === email);
    if (existing) {
      persist(existing);
      return existing;
    }
    const newUser: User = {
      id: `u-${Date.now()}`,
      name,
      email,
      role,
      onboarded: role !== "student",
      ...(gender ? { gender } : {}),
    };
    writeRegistry([...users, newUser]);
    persist(newUser);
    return newUser;
  };

  const login: AuthContextValue["login"] = (email, role) => {
    const users = readRegistry();
    const found = users.find((u) => u.email === email && u.role === role);
    if (!found) return null;
    persist(found);
    return found;
  };

  const logout = () => persist(null);

  const updateProfile: AuthContextValue["updateProfile"] = (patch) => {
    if (!user) return;
    const updated = { ...user, ...patch };
    persist(updated);
    const users = readRegistry();
    writeRegistry(users.map((u) => (u.id === updated.id ? updated : u)));
  };

  return (
    <AuthContext.Provider value={{ user, ready, signup, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
