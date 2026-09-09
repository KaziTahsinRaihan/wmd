// LocalStorage-backed store for "Record your response" speaking practice.
//
// Each recording is the full speaking-session audio captured via MediaRecorder
// and saved as a base64 data URL. localStorage has a per-origin quota (~5MB on
// most browsers); a 14-min compressed audio recording typically fits well under
// that, but `saveRecording` returns a result type so the caller can surface a
// friendly error if the quota is exceeded.

"use client";

import { useEffect, useState } from "react";

export type SpeakingRecording = {
  id: string;
  userId: string;
  examId: string;
  examTitle: string;
  createdAt: string;
  durationSec: number;
  mime: string;
  dataUrl: string;
};

const KEY = (userId: string) => `wmd:speaking-recordings:${userId}`;
const EVT = "wmd:speaking-recordings:changed";

function read(userId: string): SpeakingRecording[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY(userId));
    return raw ? (JSON.parse(raw) as SpeakingRecording[]) : [];
  } catch {
    return [];
  }
}

function write(userId: string, arr: SpeakingRecording[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY(userId), JSON.stringify(arr));
  window.dispatchEvent(new Event(EVT));
}

export function listRecordings(userId: string): SpeakingRecording[] {
  return read(userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type SaveResult =
  | { ok: true; recording: SpeakingRecording }
  | { ok: false; reason: string };

export function saveRecording(input: {
  userId: string;
  examId: string;
  examTitle: string;
  durationSec: number;
  mime: string;
  dataUrl: string;
}): SaveResult {
  const rec: SpeakingRecording = {
    id: `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: input.userId,
    examId: input.examId,
    examTitle: input.examTitle,
    durationSec: input.durationSec,
    mime: input.mime,
    dataUrl: input.dataUrl,
    createdAt: new Date().toISOString(),
  };
  try {
    const all = [rec, ...read(input.userId)];
    write(input.userId, all);
    return { ok: true, recording: rec };
  } catch (err) {
    return {
      ok: false,
      reason:
        err instanceof DOMException && err.name === "QuotaExceededError"
          ? "Recording is too large for the browser's local storage. Try a shorter session."
          : "Failed to save the recording locally.",
    };
  }
}

export function deleteRecording(userId: string, id: string): void {
  write(userId, read(userId).filter((r) => r.id !== id));
}

export function useRecordings(userId: string | undefined): SpeakingRecording[] {
  const [list, setList] = useState<SpeakingRecording[]>([]);
  useEffect(() => {
    if (!userId) return;
    const refresh = () => setList(listRecordings(userId));
    refresh();
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [userId]);
  return list;
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Failed to read blob"));
    reader.onerror = () => reject(reader.error ?? new Error("Read error"));
    reader.readAsDataURL(blob);
  });
}
