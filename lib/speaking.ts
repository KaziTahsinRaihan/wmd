// Speaking evaluation types, persistence, and band rounding.
//
// IELTS Speaking has four equally-weighted criteria. Per-criterion scores are
// full bands only — the overall band is the average rounded by the IELTS
// fractional rule (see `roundIeltsBand`).

import { roundIeltsBand } from "@/lib/bands";

export type SpeakingCriterionKey = "fc" | "lr" | "gra" | "pron";

export type SpeakingScores = Record<SpeakingCriterionKey, number>;
export type SpeakingFeedback = Record<SpeakingCriterionKey, string>;

export type SpeakingEvaluation = {
  submissionId: string;
  scores: SpeakingScores;
  feedback: SpeakingFeedback;
  overallComment: string;
  overallBand: number;
  status: "in_progress" | "submitted";
  updatedAt: string;
  submittedAt?: string;
};

export const SPEAKING_CRITERIA: {
  key: SpeakingCriterionKey;
  label: string;
  short: string;
  placeholder: string;
}[] = [
  {
    key: "fc",
    label: "Fluency & Coherence",
    short: "FC",
    placeholder:
      "Speech rate, hesitation, self-correction, and how clearly ideas connect across the answer.",
  },
  {
    key: "lr",
    label: "Lexical Resource",
    short: "LR",
    placeholder:
      "Range and precision of vocabulary, idiomatic use, and ability to paraphrase.",
  },
  {
    key: "gra",
    label: "Grammatical Range & Accuracy",
    short: "GRA",
    placeholder:
      "Range of structures, error frequency, and how errors affect intelligibility.",
  },
  {
    key: "pron",
    label: "Pronunciation",
    short: "PRON",
    placeholder:
      "Individual sounds, word stress, sentence stress, intonation, and listener effort.",
  },
];

export function overallBandFromScores(scores: SpeakingScores): number {
  const avg = (scores.fc + scores.lr + scores.gra + scores.pron) / 4;
  return roundIeltsBand(avg);
}

export function emptyEvaluation(submissionId: string): SpeakingEvaluation {
  const scores: SpeakingScores = { fc: 6, lr: 6, gra: 6, pron: 6 };
  return {
    submissionId,
    scores,
    feedback: { fc: "", lr: "", gra: "", pron: "" },
    overallComment: "",
    overallBand: overallBandFromScores(scores),
    status: "in_progress",
    updatedAt: new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------------
// Persistence
// ----------------------------------------------------------------------------

const STORAGE_KEY = "wise-mans-doctrine:speaking-evaluations";

type Store = Record<string, SpeakingEvaluation>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getEvaluation(submissionId: string): SpeakingEvaluation | undefined {
  return readStore()[submissionId];
}

export function getAllEvaluations(): SpeakingEvaluation[] {
  return Object.values(readStore());
}

export function saveEvaluation(evaluation: SpeakingEvaluation): SpeakingEvaluation {
  const next: SpeakingEvaluation = {
    ...evaluation,
    overallBand: overallBandFromScores(evaluation.scores),
    updatedAt: new Date().toISOString(),
  };
  const store = readStore();
  store[evaluation.submissionId] = next;
  writeStore(store);
  return next;
}

export function submitEvaluation(evaluation: SpeakingEvaluation): SpeakingEvaluation {
  const now = new Date().toISOString();
  const submitted: SpeakingEvaluation = {
    ...evaluation,
    overallBand: overallBandFromScores(evaluation.scores),
    status: "submitted",
    submittedAt: now,
    updatedAt: now,
  };
  const store = readStore();
  store[evaluation.submissionId] = submitted;
  writeStore(store);
  return submitted;
}

export { roundIeltsBand };
