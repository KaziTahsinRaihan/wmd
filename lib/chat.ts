export type ChatRole = "student" | "admin";

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  role: ChatRole;
  text: string;
  at: string;
};

const MESSAGES_KEY = "wise-mans-doctrine:chatroom-messages";
const SEED_KEY = "wise-mans-doctrine:chatroom-seeded";
const MAX_MESSAGES = 500;

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getMessages(): ChatMessage[] {
  return readJSON<ChatMessage[]>(MESSAGES_KEY, []);
}

export function postMessage(input: Omit<ChatMessage, "id" | "at">): ChatMessage[] {
  const next: ChatMessage = {
    ...input,
    id: `m-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    at: new Date().toISOString(),
  };
  const all = [...getMessages(), next].slice(-MAX_MESSAGES);
  writeJSON(MESSAGES_KEY, all);
  return all;
}

export function deleteMessage(id: string): ChatMessage[] {
  const all = getMessages().filter((m) => m.id !== id);
  writeJSON(MESSAGES_KEY, all);
  return all;
}

export function clearMessages(): void {
  writeJSON(MESSAGES_KEY, []);
}

// Seed a handful of demo messages on first load so the room feels lived-in.
export function seedChatroomIfEmpty(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SEED_KEY) === "1") return;
  if (getMessages().length > 0) {
    window.localStorage.setItem(SEED_KEY, "1");
    return;
  }
  const now = Date.now();
  const seed: ChatMessage[] = [
    {
      id: "m-seed-1",
      userId: "u-seed-aisha",
      userName: "Aisha Rahman",
      role: "student",
      text: "Hello wizards! Anyone got tips for IELTS reading pace? I keep running out of time on Passage 3.",
      at: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: "m-seed-2",
      userId: "u-seed-rohan",
      userName: "Rohan Kapoor",
      role: "student",
      text: "I time-box: 17 min per passage, then move on no matter what. Come back if there's time left.",
      at: new Date(now - 1000 * 60 * 60 * 1.5).toISOString(),
    },
    {
      id: "m-seed-3",
      userId: "u-seed-mei",
      userName: "Mei Lin",
      role: "student",
      text: "For Writing Task 2, the discussion essay clicked for me when I started writing the conclusion first. Acts like a thesis statement.",
      at: new Date(now - 1000 * 60 * 45).toISOString(),
    },
    {
      id: "m-seed-4",
      userId: "u-seed-aisha",
      userName: "Aisha Rahman",
      role: "student",
      text: "@Rohan — going to try the 17-min rule next mock. Thanks!",
      at: new Date(now - 1000 * 60 * 20).toISOString(),
    },
  ];
  writeJSON(MESSAGES_KEY, seed);
  window.localStorage.setItem(SEED_KEY, "1");
}
