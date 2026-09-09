export type FullMock = {
  id: string;
  number: number;
  title: string;
  exam: "Academic" | "General Training" | "Mixed";
  tier: "Foundation" | "Intermediate" | "Advanced" | "Recent";
  sections: 4;
  durationMin: number;
  blurb: string;
};

export const UNLOCKED_COUNT = 5;
export const TOTAL_MOCKS = 20;

export const FULL_MOCKS: FullMock[] = [
  { id: "fm-01", number: 1,  title: "Mock 01 — Academic Diagnostic", exam: "Academic",         tier: "Foundation",  sections: 4, durationMin: 165, blurb: "Find your starting band across all four modules." },
  { id: "fm-02", number: 2,  title: "Mock 02 — Academic Standard",   exam: "Academic",         tier: "Foundation",  sections: 4, durationMin: 165, blurb: "Balanced difficulty, mixed topics. Great first attempt." },
  { id: "fm-03", number: 3,  title: "Mock 03 — General Diagnostic",  exam: "General Training", tier: "Foundation",  sections: 4, durationMin: 165, blurb: "GT-specific letters, workplace listening, everyday topics." },
  { id: "fm-04", number: 4,  title: "Mock 04 — General Standard",    exam: "General Training", tier: "Foundation",  sections: 4, durationMin: 165, blurb: "Standard GT difficulty across all sections." },
  { id: "fm-05", number: 5,  title: "Mock 05 — Mixed Skills Warmup", exam: "Mixed",            tier: "Foundation",  sections: 4, durationMin: 165, blurb: "A balanced sampler before you graduate to themed mocks." },

  { id: "fm-06", number: 6,  title: "Mock 06 — Education Theme",     exam: "Academic",         tier: "Intermediate", sections: 4, durationMin: 165, blurb: "Topics across schooling, universities, and learning policy." },
  { id: "fm-07", number: 7,  title: "Mock 07 — Environment Theme",   exam: "Academic",         tier: "Intermediate", sections: 4, durationMin: 165, blurb: "Climate, biodiversity, and sustainability writing prompts." },
  { id: "fm-08", number: 8,  title: "Mock 08 — Technology Theme",    exam: "Academic",         tier: "Intermediate", sections: 4, durationMin: 165, blurb: "AI, automation, and digital society topics." },
  { id: "fm-09", number: 9,  title: "Mock 09 — Travel Theme",        exam: "General Training", tier: "Intermediate", sections: 4, durationMin: 165, blurb: "Holidays, transport, and cross-cultural prompts." },
  { id: "fm-10", number: 10, title: "Mock 10 — Workplace Theme",     exam: "General Training", tier: "Intermediate", sections: 4, durationMin: 165, blurb: "Workplace letters, office listening, career topics." },

  { id: "fm-11", number: 11, title: "Mock 11 — High Band Challenge", exam: "Academic",         tier: "Advanced",    sections: 4, durationMin: 165, blurb: "Built for band 7.5 → 8.5 push attempts." },
  { id: "fm-12", number: 12, title: "Mock 12 — Reading Stretch",     exam: "Academic",         tier: "Advanced",    sections: 4, durationMin: 165, blurb: "Dense passages with tight time pressure." },
  { id: "fm-13", number: 13, title: "Mock 13 — Writing Power",       exam: "Academic",         tier: "Advanced",    sections: 4, durationMin: 165, blurb: "Demanding Task 1 visuals + abstract Task 2 essays." },
  { id: "fm-14", number: 14, title: "Mock 14 — Speaking Intensive",  exam: "Academic",         tier: "Advanced",    sections: 4, durationMin: 165, blurb: "Sharper Part 3 questions, longer cue cards." },
  { id: "fm-15", number: 15, title: "Mock 15 — General Power Round", exam: "General Training", tier: "Advanced",    sections: 4, durationMin: 165, blurb: "Tougher GT round across all four skills." },

  { id: "fm-16", number: 16, title: "Mock 16 — Recent Past Paper",   exam: "Academic",         tier: "Recent",      sections: 4, durationMin: 165, blurb: "Reconstructed from a recent test sitting." },
  { id: "fm-17", number: 17, title: "Mock 17 — Surprise Topics",     exam: "Academic",         tier: "Recent",      sections: 4, durationMin: 165, blurb: "Topics that showed up unexpectedly this quarter." },
  { id: "fm-18", number: 18, title: "Mock 18 — Examiner's Choice",   exam: "Mixed",            tier: "Recent",      sections: 4, durationMin: 165, blurb: "Curated by senior instructors from common pitfalls." },
  { id: "fm-19", number: 19, title: "Mock 19 — Final Push, Band 8+", exam: "Academic",         tier: "Recent",      sections: 4, durationMin: 165, blurb: "For wizards aiming squarely at 8.0." },
  { id: "fm-20", number: 20, title: "Mock 20 — Band 9 Master Mock",  exam: "Academic",         tier: "Recent",      sections: 4, durationMin: 165, blurb: "The hardest set we publish. Don't say you weren't warned." },
];

export function isMockUnlocked(mock: Pick<FullMock, "number">): boolean {
  return mock.number <= UNLOCKED_COUNT;
}

export type MockResult = { band: number; date: string };
export type MockResults = Record<string, MockResult>;

const resultsKey = (userId: string) =>
  `wise-mans-doctrine:full-mock-results:${userId}`;

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

export function getMockResults(userId: string): MockResults {
  return readJSON<MockResults>(resultsKey(userId), {});
}

export function getMockResult(userId: string, mockId: string): MockResult | undefined {
  return getMockResults(userId)[mockId];
}

export function completeMock(userId: string, mockId: string, band: number): MockResult {
  const all = getMockResults(userId);
  const result: MockResult = {
    band,
    date: new Date().toISOString(),
  };
  all[mockId] = result;
  writeJSON(resultsKey(userId), all);
  return result;
}

export function clearMockResult(userId: string, mockId: string): void {
  const all = getMockResults(userId);
  delete all[mockId];
  writeJSON(resultsKey(userId), all);
}

// Pick a plausible band 5.5 – 8.5 weighted toward 6.5–7.5 for the demo.
export function rollPracticeBand(): number {
  const buckets = [
    [5.5, 0.06],
    [6.0, 0.14],
    [6.5, 0.22],
    [7.0, 0.24],
    [7.5, 0.18],
    [8.0, 0.10],
    [8.5, 0.06],
  ] as const;
  const r = Math.random();
  let acc = 0;
  for (const [band, w] of buckets) {
    acc += w;
    if (r <= acc) return band;
  }
  return 7.0;
}
