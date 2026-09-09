// Writing evaluation types, persistence, and IELTS band rounding.
//
// Evaluations are stored per-submission in localStorage so the instructor's
// annotations + scores survive a refresh and can be loaded read-only on the
// student side once submitted.

import { roundIeltsBand } from "@/lib/bands";
export { roundIeltsBand };

export type Point = { x: number; y: number };
export type BaseAnn = { id: string; color: string };
export type PenAnn = BaseAnn & { tool: "pen"; width: number; points: Point[] };
export type HighlightAnn = BaseAnn & {
  tool: "highlighter";
  height: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};
export type ArrowAnn = BaseAnn & {
  tool: "arrow";
  width: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};
export type CircleAnn = BaseAnn & {
  tool: "circle";
  width: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};
export type TextAnn = BaseAnn & {
  tool: "text";
  x: number;
  y: number;
  size: number;
  text: string;
  // Box dimensions in surface pixels. Optional for backward compatibility with
  // annotations saved before text boxes were resizable; the renderer falls back
  // to sensible defaults when absent.
  w?: number;
  h?: number;
};
export type Annotation = PenAnn | HighlightAnn | ArrowAnn | CircleAnn | TextAnn;

export type CriterionKey = "tr" | "cc" | "lr" | "gra";

export type CriterionScores = Record<CriterionKey, number>;
export type CriterionFeedback = Record<CriterionKey, string>;

export type TaskEvaluation = {
  scores: CriterionScores;
  feedback: CriterionFeedback;
  annotations: Annotation[];
};

export type WritingEvaluation = {
  submissionId: string;
  task1: TaskEvaluation;
  task2: TaskEvaluation;
  task1Band: number;
  task2Band: number;
  moduleScore: number;
  overallComment: string;
  status: "in_progress" | "submitted";
  updatedAt: string;
  submittedAt?: string;
};

export const CRITERIA: { key: CriterionKey; label: string; short: string; placeholder: string }[] = [
  {
    key: "tr",
    label: "Task Response",
    short: "TR",
    placeholder:
      "Did the student address all parts of the prompt with a clear position and developed ideas?",
  },
  {
    key: "cc",
    label: "Coherence & Cohesion",
    short: "CC",
    placeholder:
      "Are paragraphs logically organised? Are cohesive devices used naturally and accurately?",
  },
  {
    key: "lr",
    label: "Lexical Resource",
    short: "LR",
    placeholder:
      "Vocabulary range, precision, collocation, and any inappropriate word choices to flag.",
  },
  {
    key: "gra",
    label: "Grammatical Range & Accuracy",
    short: "GRA",
    placeholder:
      "Range of structures, error frequency, and how errors affect communication.",
  },
];

export function taskBandFromScores(scores: CriterionScores): number {
  const avg = (scores.tr + scores.cc + scores.lr + scores.gra) / 4;
  return roundIeltsBand(avg);
}

// IELTS Writing module: Task 2 is weighted twice — (T1 + T2 + T2) / 3
export function moduleScoreFromTasks(task1Band: number, task2Band: number): number {
  return roundIeltsBand((task1Band + task2Band + task2Band) / 3);
}

export function emptyTaskEvaluation(): TaskEvaluation {
  return {
    scores: { tr: 6, cc: 6, lr: 6, gra: 6 },
    feedback: { tr: "", cc: "", lr: "", gra: "" },
    annotations: [],
  };
}

export function emptyEvaluation(submissionId: string): WritingEvaluation {
  const task1 = emptyTaskEvaluation();
  const task2 = emptyTaskEvaluation();
  const task1Band = taskBandFromScores(task1.scores);
  const task2Band = taskBandFromScores(task2.scores);
  return {
    submissionId,
    task1,
    task2,
    task1Band,
    task2Band,
    moduleScore: moduleScoreFromTasks(task1Band, task2Band),
    overallComment: "",
    status: "in_progress",
    updatedAt: new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------------
// Persistence
// ----------------------------------------------------------------------------

const STORAGE_KEY = "wise-mans-doctrine:writing-evaluations";

type Store = Record<string, WritingEvaluation>;

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

export function getEvaluation(submissionId: string): WritingEvaluation | undefined {
  return readStore()[submissionId];
}

export function getAllEvaluations(): WritingEvaluation[] {
  return Object.values(readStore());
}

export function saveEvaluation(evaluation: WritingEvaluation): WritingEvaluation {
  const store = readStore();
  const next: WritingEvaluation = {
    ...evaluation,
    task1Band: taskBandFromScores(evaluation.task1.scores),
    task2Band: taskBandFromScores(evaluation.task2.scores),
    moduleScore: moduleScoreFromTasks(
      taskBandFromScores(evaluation.task1.scores),
      taskBandFromScores(evaluation.task2.scores),
    ),
    updatedAt: new Date().toISOString(),
  };
  store[evaluation.submissionId] = next;
  writeStore(store);
  return next;
}

export function submitEvaluation(evaluation: WritingEvaluation): WritingEvaluation {
  const now = new Date().toISOString();
  const submitted: WritingEvaluation = {
    ...evaluation,
    task1Band: taskBandFromScores(evaluation.task1.scores),
    task2Band: taskBandFromScores(evaluation.task2.scores),
    moduleScore: moduleScoreFromTasks(
      taskBandFromScores(evaluation.task1.scores),
      taskBandFromScores(evaluation.task2.scores),
    ),
    status: "submitted",
    submittedAt: now,
    updatedAt: now,
  };
  const store = readStore();
  store[evaluation.submissionId] = submitted;
  writeStore(store);
  return submitted;
}
