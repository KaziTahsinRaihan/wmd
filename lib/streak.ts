// Per-student daily streak.
//
// A "visit" is counted at most once per local calendar day. Visiting on the
// next consecutive day increments the streak; skipping a day resets the
// current streak to 1. Bonus mocks earned are tracked off the *longest* streak
// ever achieved, so once a milestone is hit the reward is kept even if the
// streak later breaks.

"use client";

import { useEffect, useState } from "react";

export const BONUS_STREAK_MILESTONE = 90;

export type StreakState = {
  current: number;
  longest: number;
  lastVisit: string; // YYYY-MM-DD (local)
};

const KEY = (userId: string) => `wmd:streak:${userId}`;
const EVT = "wmd:streak:changed";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / 86_400_000);
}

function emptyState(): StreakState {
  return { current: 0, longest: 0, lastVisit: "" };
}

function read(userId: string): StreakState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(KEY(userId));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as StreakState;
    return {
      current: parsed.current ?? 0,
      longest: parsed.longest ?? 0,
      lastVisit: parsed.lastVisit ?? "",
    };
  } catch {
    return emptyState();
  }
}

function write(userId: string, state: StreakState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY(userId), JSON.stringify(state));
  window.dispatchEvent(new Event(EVT));
}

export function recordVisit(userId: string): StreakState {
  const t = todayKey();
  const prev = read(userId);
  if (prev.lastVisit === t) return prev;

  let nextCurrent = 1;
  if (prev.lastVisit) {
    const gap = daysBetween(prev.lastVisit, t);
    if (gap === 1) nextCurrent = prev.current + 1;
    // gap > 1: streak broken → reset to 1
  }

  const next: StreakState = {
    current: nextCurrent,
    longest: Math.max(prev.longest, nextCurrent),
    lastVisit: t,
  };
  write(userId, next);
  return next;
}

export function getStreak(userId: string): StreakState {
  return read(userId);
}

// Number of bonus full mocks the student has earned through streaks. Based on
// the longest streak ever — bonuses are NOT revoked if the current streak
// later resets.
export function bonusMocksEarned(state: StreakState): number {
  return Math.floor((state.longest || 0) / BONUS_STREAK_MILESTONE);
}

export function daysToNextBonus(state: StreakState): number {
  const c = state.current || 0;
  return BONUS_STREAK_MILESTONE - (c % BONUS_STREAK_MILESTONE);
}

// React hook — records today's visit once on mount, then keeps the returned
// state in sync with same-tab and cross-tab changes.
export function useStreak(userId: string | undefined): StreakState {
  const [state, setState] = useState<StreakState>(emptyState);

  useEffect(() => {
    if (!userId) return;
    setState(recordVisit(userId));
    const onChange = () => setState(read(userId));
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [userId]);

  return state;
}
