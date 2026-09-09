"use client";

// MongoSyncProvider — makes the whole app persist to MongoDB without rewriting
// any of the existing localStorage-based modules.
//
// On startup it pulls every stored key from /api/kv and writes them into
// localStorage, THEN renders the app (so every module reads already-hydrated
// data on mount). It also patches localStorage.setItem/removeItem so each
// subsequent write is mirrored to MongoDB.
//
// Device/session-only keys (the current login session, theme, sidebar state)
// are intentionally NOT synced — they're per-browser preferences, not shared
// application data. Everything else (users registry, question bank, attempts,
// evaluations, chat, courses, streaks, leaderboard, …) is stored in MongoDB.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const APP_PREFIXES = ["wise-mans-doctrine:", "ielts-prep:", "wmd:"];

// Per-browser keys that must stay local (syncing them would make every user
// share one login / theme / sidebar).
const LOCAL_ONLY = new Set<string>([
  "wise-mans-doctrine:user", // active login session
  "wise-mans-doctrine:theme", // colour theme preference
  "wmd:sidebar-collapsed", // sidebar collapse preference
]);

// Keys that used to live in localStorage but now persist via dedicated APIs
// (/api/questions, /api/attempts). They embed audio/images and overflow the
// storage quota, so they must never touch localStorage again.
const LEGACY_DB_KEYS = ["ielts-prep:question-bank:v1", "ielts-prep:attempts:v1"];

function shouldSync(key: string): boolean {
  if (LOCAL_ONLY.has(key)) return false;
  if (LEGACY_DB_KEYS.includes(key)) return false;
  return APP_PREFIXES.some((p) => key.startsWith(p));
}

type SyncState = { ready: boolean; online: boolean };
const Ctx = createContext<SyncState>({ ready: false, online: false });

export function useMongoSync() {
  return useContext(Ctx);
}

export function MongoSyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SyncState>({ ready: false, online: false });

  useEffect(() => {
    let cancelled = false;

    // Capture the originals before patching so hydration writes (and the
    // mirror itself) don't recurse through the patched versions.
    const origSet = window.localStorage.setItem.bind(window.localStorage);
    const origRemove = window.localStorage.removeItem.bind(window.localStorage);

    // One-time cleanup: drop any oversized legacy bank/attempts blobs left in
    // localStorage by older versions, freeing the quota that caused save errors.
    for (const k of LEGACY_DB_KEYS) {
      try {
        origRemove(k);
      } catch {
        /* ignore */
      }
    }

    // Debounced per-key PUTs so rapid writes (e.g. typing) collapse to one call.
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const flushKey = (key: string, value: string) => {
      const t = timers.get(key);
      if (t) clearTimeout(t);
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          fetch("/api/kv", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value }),
            keepalive: true,
          }).catch(() => {});
        }, 250),
      );
    };

    // Patch once (guard against React StrictMode double-invoke / HMR).
    const w = window as typeof window & { __kvPatched?: boolean };
    if (!w.__kvPatched) {
      w.__kvPatched = true;
      window.localStorage.setItem = (key: string, value: string) => {
        origSet(key, value);
        if (shouldSync(key)) flushKey(key, value);
      };
      window.localStorage.removeItem = (key: string) => {
        origRemove(key);
        if (shouldSync(key)) {
          fetch(`/api/kv?key=${encodeURIComponent(key)}`, {
            method: "DELETE",
            keepalive: true,
          }).catch(() => {});
        }
      };
    }

    // Pull every stored key from MongoDB into localStorage. Returns whether the
    // DB was reachable. Safe to call repeatedly (server is the source of truth).
    let pulling = false;
    const pull = async (): Promise<boolean> => {
      if (pulling) return state.online;
      pulling = true;
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch("/api/kv", { cache: "no-store", signal: ctrl.signal });
        clearTimeout(timeout);
        const json = (await res.json()) as { ok: boolean; data?: Record<string, string> };
        if (json.ok && json.data) {
          for (const [key, value] of Object.entries(json.data)) {
            if (shouldSync(key) && window.localStorage.getItem(key) !== value) {
              origSet(key, value); // bypass the mirror
            }
          }
          // Nudge hooks that re-read on the storage event (question bank,
          // attempts, etc.) so newly-pulled data shows without a reload.
          window.dispatchEvent(new Event("storage"));
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        pulling = false;
      }
    };

    // Initial hydration, then release the app.
    pull().then((online) => {
      if (!cancelled) setState({ ready: true, online });
    });

    // Re-sync when the user returns to the tab, so an already-open student sees
    // questions an instructor just saved (and vice-versa).
    const resync = () => {
      if (document.visibilityState !== "visible") return;
      pull().then((online) => {
        if (!cancelled) setState((s) => (s.online === online ? s : { ready: true, online }));
      });
    };
    window.addEventListener("focus", resync);
    document.addEventListener("visibilitychange", resync);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", resync);
      document.removeEventListener("visibilitychange", resync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state.ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 text-white/70">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-gold-400" />
          <p className="text-sm">Loading your data…</p>
        </div>
      </div>
    );
  }

  return (
    <Ctx.Provider value={state}>
      {children}
      {!state.online && <OfflineBanner />}
    </Ctx.Provider>
  );
}

// Shown when the database is unreachable: the app still works on local data,
// but the instructor needs to know their saves aren't reaching MongoDB (and so
// won't reach students on other devices) until the connection is restored.
function OfflineBanner() {
  return (
    <div className="fixed bottom-4 left-1/2 z-[200] -translate-x-1/2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-1.5 text-xs font-medium text-amber-200 shadow-lg backdrop-blur">
      Not connected to the database — changes are saved on this device only.
    </div>
  );
}
