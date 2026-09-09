import type { MockResult, MockResults } from "./full-mocks";

const DEMO_KEY = "wise-mans-doctrine:leaderboard-demo";
const FULL_MOCK_PREFIX = "wise-mans-doctrine:full-mock-results:";

type DemoStudent = {
  id: string;
  name: string;
  bestBand: number;
  mocksTaken: number;
};

const DEMO_SEED: DemoStudent[] = [
  { id: "lb-mira",   name: "Mira Khan",       bestBand: 8.5, mocksTaken: 12 },
  { id: "lb-liam",   name: "Liam Chen",       bestBand: 8.5, mocksTaken: 10 },
  { id: "lb-sofia",  name: "Sofia Rojas",     bestBand: 8.0, mocksTaken: 9  },
  { id: "lb-diego",  name: "Diego Singh",     bestBand: 8.0, mocksTaken: 7  },
  { id: "lb-anya",   name: "Anya Petrov",     bestBand: 7.5, mocksTaken: 8  },
  { id: "lb-noah",   name: "Noah Tanaka",     bestBand: 7.5, mocksTaken: 6  },
  { id: "lb-zara",   name: "Zara Ahmed",      bestBand: 7.5, mocksTaken: 5  },
  { id: "lb-ethan",  name: "Ethan Yamamoto",  bestBand: 7.0, mocksTaken: 8  },
  { id: "lb-kavya",  name: "Kavya Iyer",      bestBand: 7.0, mocksTaken: 4  },
  { id: "lb-oliver", name: "Oliver Brown",    bestBand: 7.0, mocksTaken: 3  },
  { id: "lb-hana",   name: "Hana Park",       bestBand: 6.5, mocksTaken: 5  },
  { id: "lb-carlos", name: "Carlos Mendoza",  bestBand: 6.5, mocksTaken: 3  },
];

function readDemo(): DemoStudent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as DemoStudent[]) : [];
  } catch {
    return [];
  }
}

function writeDemo(list: DemoStudent[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEMO_KEY, JSON.stringify(list));
  }
}

export function seedLeaderboardIfEmpty(): void {
  if (typeof window === "undefined") return;
  if (readDemo().length > 0) return;
  writeDemo(DEMO_SEED);
}

export type LeaderboardEntry = {
  userId: string;
  name: string;
  band: number;
  mocksTaken: number;
  isYou: boolean;
};

// Try to look up the real display name for a user-id key in the registry.
function findRealUserName(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("wise-mans-doctrine:users");
    if (!raw) return null;
    const users = JSON.parse(raw) as { id: string; name: string }[];
    return users.find((u) => u.id === userId)?.name ?? null;
  } catch {
    return null;
  }
}

function readRealMockResults(): { userId: string; results: MockResults }[] {
  if (typeof window === "undefined") return [];
  const out: { userId: string; results: MockResults }[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(FULL_MOCK_PREFIX)) continue;
    const userId = key.slice(FULL_MOCK_PREFIX.length);
    try {
      const results = JSON.parse(
        window.localStorage.getItem(key) || "{}",
      ) as MockResults;
      out.push({ userId, results });
    } catch {
      /* ignore */
    }
  }
  return out;
}

function reduceBest(results: MockResults): { band: number; count: number } {
  const list = Object.values(results) as MockResult[];
  if (list.length === 0) return { band: 0, count: 0 };
  return {
    band: list.reduce((a, b) => Math.max(a, b.band), 0),
    count: list.length,
  };
}

export function getLeaderboard(myUserId: string | undefined, limit = 10): LeaderboardEntry[] {
  seedLeaderboardIfEmpty();

  const demo: LeaderboardEntry[] = readDemo().map((d) => ({
    userId: d.id,
    name: d.name,
    band: d.bestBand,
    mocksTaken: d.mocksTaken,
    isYou: false,
  }));

  const realEntries: LeaderboardEntry[] = readRealMockResults()
    .map(({ userId, results }) => {
      const { band, count } = reduceBest(results);
      if (band === 0) return null;
      const name = findRealUserName(userId) ?? "Wizard";
      return {
        userId,
        name,
        band,
        mocksTaken: count,
        isYou: userId === myUserId,
      };
    })
    .filter((x): x is LeaderboardEntry => x !== null);

  const combined = [...demo, ...realEntries].sort((a, b) => {
    if (b.band !== a.band) return b.band - a.band;
    return b.mocksTaken - a.mocksTaken;
  });

  return combined.slice(0, limit);
}

// Get the current user's overall best band, even if outside the top 10.
export function getMyRank(
  myUserId: string,
): { rank: number; total: number; entry: LeaderboardEntry } | null {
  seedLeaderboardIfEmpty();
  const all = [...readDemo().map<LeaderboardEntry>((d) => ({
    userId: d.id,
    name: d.name,
    band: d.bestBand,
    mocksTaken: d.mocksTaken,
    isYou: false,
  })), ...readRealMockResults()
    .map(({ userId, results }): LeaderboardEntry | null => {
      const { band, count } = reduceBest(results);
      if (band === 0) return null;
      const name = findRealUserName(userId) ?? "Wizard";
      return { userId, name, band, mocksTaken: count, isYou: userId === myUserId };
    })
    .filter((x): x is LeaderboardEntry => x !== null)]
    .sort((a, b) => {
      if (b.band !== a.band) return b.band - a.band;
      return b.mocksTaken - a.mocksTaken;
    });

  const idx = all.findIndex((e) => e.userId === myUserId);
  if (idx === -1) return null;
  return { rank: idx + 1, total: all.length, entry: all[idx] };
}
