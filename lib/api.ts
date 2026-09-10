// Thin fetch wrapper for the Express/MySQL backend (see /server).
//
// Dev: NEXT_PUBLIC_API_URL is unset, so requests stay relative ("/api/...")
// and next.config.js's rewrite proxies them to the backend.
// Production (static export): rewrites don't run, so NEXT_PUBLIC_API_URL
// must be set at BUILD time to the backend's public URL (e.g.
// https://api.yourdomain.com) — see server/DEPLOYMENT.md.

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

const TOKEN_KEY = "wise-mans-doctrine:token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, cache: "no-store" });
  } catch {
    throw new ApiError("Can't reach the server. Is the backend running?", 0);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok || !json?.ok) {
    if (res.status === 401) {
      setToken(null);
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    throw new ApiError(json?.error || res.statusText || "Request failed", res.status);
  }
  return json as T;
}
