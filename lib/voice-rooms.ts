// Voice-practice rooms for the student chatroom.
//
// Six fixed rooms — three male-only, three female-only — each with a small
// capacity so groups stay practice-sized. Presence (who is in which room
// + their mute state) is mirrored through localStorage so the demo feels
// multi-user across tabs/windows on the same machine.
//
// Gender enforcement is the load-bearing rule: `joinRoom` refuses any user
// whose declared gender doesn't match the room's gender, and the UI never
// renders a join control for a mismatched room.

"use client";

import { useEffect, useState } from "react";
import type { Gender } from "./auth";

export type { Gender } from "./auth";

export type VoiceRoom = {
  id: string;
  name: string;
  gender: Gender;
  capacity: number;
};

export type VoicePresence = {
  roomId: string;
  userId: string;
  userName: string;
  gender: Gender;
  joinedAt: string;
  muted: boolean;
};

export const VOICE_ROOMS: VoiceRoom[] = [
  { id: "vr-m-1", name: "Roundtable 1", gender: "male", capacity: 6 },
  { id: "vr-m-2", name: "Roundtable 2", gender: "male", capacity: 6 },
  { id: "vr-m-3", name: "Roundtable 3", gender: "male", capacity: 6 },
  { id: "vr-f-1", name: "Roundtable 1", gender: "female", capacity: 6 },
  { id: "vr-f-2", name: "Roundtable 2", gender: "female", capacity: 6 },
  { id: "vr-f-3", name: "Roundtable 3", gender: "female", capacity: 6 },
];

const KEY = "wmd:voice-rooms:presence";
const EVT = "wmd:voice-rooms:changed";

function read(): VoicePresence[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VoicePresence[]) : [];
  } catch {
    return [];
  }
}

function write(arr: VoicePresence[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(arr));
  window.dispatchEvent(new Event(EVT));
}

export function listPresence(): VoicePresence[] {
  return read();
}

export function presenceInRoom(roomId: string): VoicePresence[] {
  return read()
    .filter((p) => p.roomId === roomId)
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

export function currentRoomOf(userId: string): string | null {
  const p = read().find((p) => p.userId === userId);
  return p ? p.roomId : null;
}

export type JoinResult =
  | { ok: true; presence: VoicePresence }
  | { ok: false; reason: string };

export function joinRoom(input: {
  userId: string;
  userName: string;
  gender: Gender;
  roomId: string;
}): JoinResult {
  const room = VOICE_ROOMS.find((r) => r.id === input.roomId);
  if (!room) return { ok: false, reason: "Room not found." };
  if (room.gender !== input.gender) {
    return {
      ok: false,
      reason: `This room is ${room.gender}-only.`,
    };
  }
  const others = read().filter((p) => p.userId !== input.userId);
  const inRoom = others.filter((p) => p.roomId === input.roomId);
  if (inRoom.length >= room.capacity) {
    return { ok: false, reason: "This room is full." };
  }
  const presence: VoicePresence = {
    roomId: input.roomId,
    userId: input.userId,
    userName: input.userName,
    gender: input.gender,
    joinedAt: new Date().toISOString(),
    muted: true,
  };
  write([...others, presence]);
  return { ok: true, presence };
}

export function leaveRoom(userId: string): void {
  write(read().filter((p) => p.userId !== userId));
}

export function setMuted(userId: string, muted: boolean): void {
  const all = read();
  const idx = all.findIndex((p) => p.userId === userId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], muted };
  write(all);
}

export function roomsByGender(gender: Gender): VoiceRoom[] {
  return VOICE_ROOMS.filter((r) => r.gender === gender);
}

// Reactive hook — returns the full presence list, kept in sync with same-tab
// and cross-tab changes.
export function useVoicePresence(): VoicePresence[] {
  const [presence, setPresence] = useState<VoicePresence[]>([]);
  useEffect(() => {
    const refresh = () => setPresence(read());
    refresh();
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return presence;
}
