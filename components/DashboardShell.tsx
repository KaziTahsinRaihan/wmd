"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, Role } from "@/lib/auth";
import Logo from "./Logo";
import UserMenu from "./UserMenu";
import { ChevronRight, LogOut, Menu } from "lucide-react";

const SIDEBAR_KEY = "wmd:sidebar-collapsed";

export type NavItem = {
  label: string;
  href: string;
  icon: any;
  children?: { label: string; href: string }[];
};

export default function DashboardShell({
  role,
  nav,
  children,
}: {
  role: Role;
  nav: NavItem[];
  children: ReactNode;
}) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Foldable sidebar (desktop only). Persisted so the choice survives reloads.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_KEY) === "1") setCollapsed(true);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace(
        user.role === "student"
          ? "/student"
          : user.role === "instructor"
          ? "/instructor"
          : "/admin"
      );
    }
  }, [user, ready, role, router]);

  if (!ready || !user || user.role !== role) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 text-white/60">
        Loading workspace…
      </div>
    );
  }

  const onLogout = () => {
    logout();
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen bg-ink-950">
      <aside
        aria-hidden={collapsed}
        className={`hidden shrink-0 flex-col overflow-hidden border-r border-white/5 bg-ink-900/60 backdrop-blur transition-[width] duration-200 ease-in-out md:flex ${
          collapsed ? "w-0 border-r-0" : "w-72"
        }`}
      >
        {/* Fixed inner width so the sidebar's contents don't reflow while the
            outer container animates from w-72 → w-0. The outer overflow-hidden
            clips it during the transition. */}
        <div className="flex h-full w-72 shrink-0 flex-col">
          <div className="px-5 py-5">
            <Logo />
          </div>
          <div className="px-5 pb-4">
            <div className="rounded-xl border border-gold-500/20 bg-panel-gradient p-3">
              <p className="text-xs uppercase tracking-wide text-white/40">
                Signed in as
              </p>
              <p className="mt-0.5 truncate font-semibold">{user.name}</p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
              <span className="badge mt-2 capitalize">{user.role}</span>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-3 pb-4">
            {nav.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={`nav-link ${active ? "nav-link-active" : ""}`}
                    tabIndex={collapsed ? -1 : 0}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.children && <ChevronRight className="h-4 w-4 opacity-40" />}
                  </Link>
                  {item.children && active && (
                    <div className="ml-7 mt-1 space-y-1 border-l border-gold-500/20 pl-2">
                      {item.children.map((child) => {
                        const childActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`nav-link text-xs ${
                              childActive ? "nav-link-active" : ""
                            }`}
                            tabIndex={collapsed ? -1 : 0}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="border-t border-white/5 p-3">
            <button
              onClick={onLogout}
              className="nav-link w-full"
              tabIndex={collapsed ? -1 : 0}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-30 flex items-center justify-between gap-3 border-b border-white/5 bg-ink-900/40 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden rounded-lg p-1.5 text-white/60 transition hover:bg-white/5 hover:text-white md:inline-flex"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Small logo: always on mobile, and on desktop when the sidebar
                is collapsed (so the brand is still anchored top-left). */}
            <div className={`block ${collapsed ? "md:block" : "md:hidden"}`}>
              <Logo small />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
