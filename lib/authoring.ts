// Teacher question authoring: the authored document model, plain-text parsing
// (answer-placeholder tokens, one-option-per-line generators, answer keys with
// "/" alternatives), sequential question numbering, converters into the
// student-panel exam runtimes (so a question renders identically on both
// panels), and the /api/questions client used to save/publish.

import type { ListeningGroup, ListeningTest, Seg } from "./listening-mock";
import { htmlToPlainText } from "./rich-html";
import type { ReadingGroup, ReadingTest, PassageSection } from "./reading-mock";
import type { WritingExam, WritingTask } from "./writing-exam";
import type { SpeakingTest, SpeakingTopic } from "./speaking-mock";
import type { AnswerKey } from "./listening-mock";

export type { AnswerKey };

export type AuthoredModule = "listening" | "reading" | "writing" | "speaking";

/** Inserted by the "Add answer placeholder" tool; numbered sequentially. */
export const GAP_TOKEN = "{{gap}}";
/** A line holding only this token marks a wide heading gap in a reading passage. */
export const HEADING_TOKEN = "{{heading}}";

export type AuthoredGroupType =
  // v2 (listening): paste-first sections with explicit "12_____" placeholders
  | "pasted" // pasted text; "12_____" becomes the typed answer box for Q12
  | "special" // composite: picture + option table + drag gaps + options
  // v1 (reading, and previously saved questions)
  | "gap-text"
  | "mcq"
  | "drag-text"
  | "table"
  | "flowchart"
  | "picture"
  | "headings";

/** Which elements of a "special" section are present (each deletable). */
export type SpecialElements = { picture: boolean; table: boolean; drag: boolean; options: boolean };

export type McqVariant = "single" | "double" | "tfng" | "ynng";

export type AuthoredGroup = {
  id: string;
  type: AuthoredGroupType;
  variant?: McqVariant;
  /** Listening: which recording part (1–4) this section belongs to. Default 1. */
  part?: number;
  instructions: string;
  title?: string;
  /** Raw text containing GAP_TOKENs (gap-text / drag-text / picture). */
  text?: string;
  /**
   * Rich pasted content (sanitized HTML) for "pasted" sections — keeps bold,
   * fonts, indentation and real tables with merged cells. When present it
   * takes precedence over `text`; "12_____" placeholders work inside it.
   */
  html?: string;
  /** MCQ questions: options one per line (ignored for tfng). */
  questions?: { stem: string; options: string }[];
  /** Draggable options / headings — one per line. */
  options?: string;
  /** Flowchart boxes, each may contain GAP_TOKENs. */
  steps?: string[];
  /** Table rows — one per line. */
  rows?: string;
  /** Table column letters — one per line (defaults A–D). */
  cols?: string;
  /** data: URL locally; becomes /api/files/<id> after saving. */
  image?: string;
  // ---- "special" sections (v2) ----
  /** Text whose "12_____" placeholders become draggable-answer gaps. */
  dragText?: string;
  /** Option-generator input (one per line); "Generate" fills optionsList. */
  optionsRaw?: string;
  /** Generated draggable options (each individually deletable). */
  optionsList?: string[];
  /** Which special elements are shown; all true by default. */
  elements?: SpecialElements;
};

export type AuthoredTest = {
  id?: string; // server id once saved
  module: AuthoredModule;
  name: string;
  status: "draft" | "published";
  startNumber: number; // first question number (usually 1)
  // reading (legacy single-passage fields — used as the Part 1 fallback)
  passageTitle?: string;
  passage?: string; // paragraphs separated by blank lines; HEADING_TOKEN lines = wide gaps
  /** Reading: one passage per part (index 0 → Part 1, up to Part 3). */
  readingPassages?: { title?: string; passage?: string }[];
  // writing
  writingFormat?: "computer" | "paper";
  /** qtype: teacher-only classification — never shown inside the student exam,
   *  only used to filter the practice question list. */
  task1?: { instructions: string; prompt: string; image?: string; qtype?: string };
  task2?: { instructions: string; prompt: string; qtype?: string };
  // speaking — fixed 3-part structure (no groups)
  speaking?: {
    /** Part 1 topic 1: one question per line. */
    topic1: { title: string; questions: string };
    /** Part 1 topic 2 (optional). */
    topic2?: { title: string; questions: string };
    /** Part 2 cue card — rich pasted content (sanitized HTML). */
    cueCardHtml?: string;
    /** Part 3: one question per line. */
    part3Questions: string;
  };
  groups: AuthoredGroup[];
  /** One line per question number; alternatives separated by "/". */
  answersRaw?: string;
  audio?: string; // listening: data: URL locally; /api/files/<id> after save
};

export const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"];

/** Teacher-only Writing Task 1 question types (used for practice filtering). */
export const WRITING_TASK1_TYPES = [
  "Line chart",
  "Bar chart",
  "Pie chart",
  "Table",
  "Combined graphs or charts",
  "Maps",
  "Diagrams",
  "Letter",
];

/** Teacher-only Writing Task 2 question types (used for practice filtering). */
export const WRITING_TASK2_TYPES = [
  "Opinion essay — agree/disagree",
  "Advantage/disadvantage",
  "Problem/solution",
  "Cause/effect",
  "Cause/solution",
  "Positive/negative development",
  "Discuss both views",
  "Direct question",
];

export function newAuthoredTest(module: AuthoredModule): AuthoredTest {
  return {
    module,
    name: "",
    status: "draft",
    startNumber: 1,
    // Listening starts with one blank pasted section so the teacher lands on
    // a blank student-look page ready to paste into.
    groups: module === "listening" ? [newGroup("pasted")] : [],
    ...(module === "writing"
      ? {
          writingFormat: "computer" as const,
          task1: { instructions: "You should spend about 20 minutes on this task. Write at least 150 words.", prompt: "" },
          task2: { instructions: "You should spend about 40 minutes on this task. Write at least 250 words.", prompt: "" },
        }
      : {}),
    ...(module === "speaking"
      ? {
          speaking: {
            topic1: { title: "", questions: "" },
            part3Questions: "",
          },
        }
      : {}),
  };
}

export function newGroup(type: AuthoredGroupType): AuthoredGroup {
  return {
    id: `g-${Date.now()}-${Math.floor(Math.random() * 1e5)}`,
    type,
    instructions: "",
    ...(type === "mcq" ? { variant: "single" as const, questions: [{ stem: "", options: "" }] } : {}),
    ...(type === "flowchart" ? { steps: [""] } : {}),
    ...(type === "table" ? { rows: "", cols: "A\nB\nC\nD" } : {}),
    ...(type === "special"
      ? {
          cols: "A\nB\nC\nD",
          elements: { picture: true, table: true, drag: true, options: true },
        }
      : {}),
  };
}

// ----------------------------------------------------------------------------
// v2 parsing — explicit "12_____" placeholders
// ----------------------------------------------------------------------------

/** A question number followed by 3+ underscores marks that question's gap. */
export const NUM_GAP_RE = /(\d{1,3})\s*_{3,}/g;

/** Source text of a pasted section — rich HTML (as plain text) when present. */
export function pastedSourceText(g: AuthoredGroup): string {
  return g.html?.trim() ? htmlToPlainText(g.html) : (g.text ?? "");
}

/** Reading: the passage for one part, falling back to the legacy fields. */
export function readingPassageAt(test: AuthoredTest, part: number): { title: string; passage: string } {
  const p = test.readingPassages?.[part - 1];
  return {
    title: p?.title !== undefined ? p.title : part === 1 ? (test.passageTitle ?? "") : "",
    passage: p?.passage !== undefined ? p.passage : part === 1 ? (test.passage ?? "") : "",
  };
}

const passageParas = (passage: string) =>
  passage
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** Parse pasted text: "12_____" → gap 12; blank lines separate paragraphs. */
export function parseNumberedText(raw: string | undefined): { paras: Seg[][]; numbers: number[] } {
  const numbers: number[] = [];
  const paras: Seg[][] = [];
  for (const para of (raw ?? "").split(/\n\s*\n/)) {
    if (!para.trim()) continue;
    const segs: Seg[] = [];
    let last = 0;
    for (const m of para.matchAll(NUM_GAP_RE)) {
      const before = para.slice(last, m.index).replace(/\s+/g, " ");
      if (before.trim()) segs.push({ text: before });
      const n = Number(m[1]);
      numbers.push(n);
      segs.push({ gap: n });
      last = (m.index ?? 0) + m[0].length;
    }
    const rest = para.slice(last).replace(/\s+/g, " ");
    if (rest.trim()) segs.push({ text: rest });
    if (segs.length) paras.push(segs);
  }
  return { paras, numbers };
}

/** Table rows may begin with their question number: "16 Farm shop". */
export function parseTableRows(rowsRaw: string | undefined): { labels: string[]; start: number | null } {
  const ls = lines(rowsRaw);
  let start: number | null = null;
  const labels = ls.map((l, i) => {
    const m = /^(\d{1,3})[\s.):-]+(.*)$/.exec(l);
    if (m && m[2]) {
      if (i === 0) start = Number(m[1]);
      return m[2];
    }
    return l;
  });
  return { labels, start };
}

// ----------------------------------------------------------------------------
// Parsing helpers
// ----------------------------------------------------------------------------

export const lines = (s: string | undefined) =>
  (s ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export const countGaps = (s: string | undefined) => (s ?? "").split(GAP_TOKEN).length - 1;

/** Split raw text into paragraphs of segments, numbering gaps from `start`. */
export function parseGapText(raw: string | undefined, start: number): { paras: Seg[][]; next: number } {
  let n = start;
  const paras: Seg[][] = [];
  for (const para of (raw ?? "").split(/\n\s*\n/)) {
    if (!para.trim()) continue;
    const segs: Seg[] = [];
    const pieces = para.split(GAP_TOKEN);
    pieces.forEach((piece, i) => {
      const text = piece.replace(/\s+/g, " ");
      if (text) segs.push({ text });
      if (i < pieces.length - 1) segs.push({ gap: n++ });
    });
    if (segs.length) paras.push(segs);
  }
  return { paras, next: n };
}

/** Number of question numbers a legacy (v1) group consumes. */
export function groupQuestionCount(g: AuthoredGroup, test: AuthoredTest): number {
  switch (g.type) {
    case "gap-text":
    case "drag-text":
    case "picture":
      return countGaps(g.text);
    case "mcq":
      return (g.questions ?? []).length * (g.variant === "double" ? 2 : 1);
    case "table":
      return lines(g.rows).length;
    case "flowchart":
      return (g.steps ?? []).reduce((s, step) => s + countGaps(step), 0);
    case "headings": {
      // Explicit HEADING_TOKEN lines win; otherwise a gap is auto-placed
      // above every paragraph of the part's passage.
      const { passage } = readingPassageAt(test, g.part ?? 1);
      const tokens = (passage.match(new RegExp(HEADING_TOKEN.replace(/[{}]/g, "\\$&"), "g")) ?? [])
        .length;
      if (tokens > 0) return tokens;
      return passageParas(passage).filter((p) => p !== HEADING_TOKEN).length;
    }
    case "pasted":
      return parseNumberedText(pastedSourceText(g)).numbers.length;
    case "special": {
      const t = parseTableRows(g.rows);
      return t.labels.length + parseNumberedText(g.dragText).numbers.length;
    }
  }
}

/**
 * Ranges per group. v2 sections (pasted/special) take their numbers directly
 * from the pasted "12_____" placeholders / numbered table rows; legacy
 * sections are numbered sequentially from test.startNumber.
 */
export function groupRanges(test: AuthoredTest): { group: AuthoredGroup; range: [number, number] }[] {
  let autoNext = test.startNumber || 1;
  // Question numbers follow the part order (stable within a part).
  const ordered = [...test.groups].sort((a, b) => (a.part ?? 1) - (b.part ?? 1));
  return ordered.map((group) => {
    if (group.type === "pasted" || group.type === "special") {
      let nums: number[] = [];
      if (group.type === "pasted") {
        nums = parseNumberedText(pastedSourceText(group)).numbers;
      } else {
        const el = group.elements ?? { picture: true, table: true, drag: true, options: true };
        if (el.table) {
          const t = parseTableRows(group.rows);
          const start = t.start ?? autoNext;
          nums.push(...t.labels.map((_, i) => start + i));
        }
        if (el.drag) nums.push(...parseNumberedText(group.dragText).numbers);
      }
      const range: [number, number] =
        nums.length > 0 ? [Math.min(...nums), Math.max(...nums)] : [autoNext, autoNext - 1];
      if (nums.length) autoNext = Math.max(autoNext, range[1] + 1);
      return { group, range };
    }
    const count = groupQuestionCount(group, test);
    const range: [number, number] = [autoNext, Math.max(autoNext, autoNext + count - 1)];
    autoNext += count;
    return { group, range };
  });
}

/** Every question number in the test (from the converted student runtime). */
export function listQuestionNumbers(test: AuthoredTest): number[] {
  if (test.module === "writing" || test.module === "speaking") return [];
  const converted = test.module === "listening" ? authoredToListening(test) : authoredToReading(test);
  const nums = new Set<number>();
  for (const part of converted.parts as { groups: { range: [number, number] }[] }[]) {
    for (const g of part.groups) {
      for (let n = g.range[0]; n <= g.range[1]; n++) nums.add(n);
    }
  }
  return [...nums].sort((a, b) => a - b);
}

export function totalQuestions(test: AuthoredTest): number {
  if (test.module === "writing") return 0;
  if (test.module === "speaking") {
    const s = test.speaking;
    if (!s) return 0;
    const cueCard = htmlToPlainText(s.cueCardHtml ?? "").trim() ? 1 : 0;
    return lines(s.topic1.questions).length + lines(s.topic2?.questions).length + cueCard + lines(s.part3Questions).length;
  }
  return listQuestionNumbers(test).length;
}

/** Answers textarea: line i → i-th question number; alternatives on "/". */
export function parseAnswerKey(test: AuthoredTest): AnswerKey {
  const key: AnswerKey = {};
  const nums = listQuestionNumbers(test);
  const raw = (test.answersRaw ?? "").split("\n");
  raw.forEach((line, i) => {
    const n = nums[i];
    if (n === undefined) return;
    const alts = line
      .split("/")
      .map((a) => a.trim())
      .filter(Boolean);
    if (alts.length) key[n] = alts;
  });
  return key;
}

// ----------------------------------------------------------------------------
// Converters — authored → student exam runtimes
// ----------------------------------------------------------------------------

function convertGroup(
  g: AuthoredGroup,
  range: [number, number],
  start: number,
  opts?: { matchDrag?: boolean },
): ListeningGroup[] {
  switch (g.type) {
    case "pasted": {
      const { paras } = parseNumberedText(pastedSourceText(g));
      return [
        {
          kind: "pasted",
          range,
          instructions: g.instructions,
          title: g.title,
          paras,
          html: g.html?.trim() ? g.html : undefined,
        },
      ];
    }
    case "special": {
      const el = g.elements ?? { picture: true, table: true, drag: true, options: true };
      const out: ListeningGroup[] = [];
      const t = el.table ? parseTableRows(g.rows) : { labels: [], start: null };
      // Map / plan labelling: the picture renders beside the letter table.
      const imageOnTable = t.labels.length > 0 && el.picture ? g.image : undefined;
      if (t.labels.length) {
        const tStart = t.start ?? range[0];
        out.push({
          kind: "table",
          range: [tStart, tStart + t.labels.length - 1],
          instructions: g.instructions,
          rows: t.labels,
          cols: lines(g.cols).length ? lines(g.cols) : ["A", "B", "C", "D"],
          imageUrl: imageOnTable,
        });
      }
      const drag = el.drag ? parseNumberedText(g.dragText) : { paras: [], numbers: [] };
      const options = el.options ? (g.optionsList ?? []) : [];
      const hasPasted =
        drag.paras.length > 0 || (el.picture && g.image && !imageOnTable) || options.length > 0;
      if (hasPasted) {
        const dRange: [number, number] =
          drag.numbers.length > 0
            ? [Math.min(...drag.numbers), Math.max(...drag.numbers)]
            : [range[0], range[0] - 1];
        out.push({
          kind: "pasted",
          range: dRange,
          instructions: out.length ? "" : g.instructions,
          imageUrl: el.picture && !imageOnTable ? g.image : undefined,
          paras: drag.paras,
          options: options.length ? options : undefined,
        });
      }
      return out.sort((x, y) => x.range[0] - y.range[0]);
    }
    case "gap-text":
      return [
        {
          kind: "pasted",
          range,
          instructions: g.instructions,
          title: g.title,
          paras: parseGapText(g.text, range[0]).paras,
        },
      ];
    case "drag-text": {
      const paras = parseGapText(g.text, range[0]).paras;
      // Listening: an "item + one gap" list renders as the native matching
      // layout (items and option bank side by side, like the built-in tests).
      const isItemList =
        paras.length > 0 &&
        paras.every((p) => p.length === 2 && "text" in p[0] && "gap" in p[1]);
      if (opts?.matchDrag && isItemList) {
        return [
          {
            kind: "match-drag",
            range,
            instruction: g.instructions,
            title: g.title,
            items: paras.map((p) => ("text" in p[0] ? p[0].text.trim() : "")),
            options: lines(g.options),
          },
        ];
      }
      return [
        {
          kind: "pasted",
          range,
          instructions: g.instructions,
          title: g.title,
          paras,
          options: lines(g.options),
        },
      ];
    }
    case "picture":
      return [
        {
          kind: "pasted",
          range,
          instructions: g.instructions,
          title: g.title,
          imageUrl: g.image,
          paras: parseGapText(g.text, range[0]).paras,
          options: lines(g.options).length ? lines(g.options) : undefined,
        },
      ];
    case "table":
      return [{ kind: "table", range, instructions: g.instructions, rows: lines(g.rows), cols: lines(g.cols) }];
    case "flowchart": {
      let n = range[0];
      const steps: Seg[][] = (g.steps ?? []).map((step) => {
        const r = parseGapText(step, n);
        n = r.next;
        return r.paras[0] ?? [{ text: step }];
      });
      return [
        {
          kind: "flowchart",
          range,
          instruction: g.instructions,
          title: g.title ?? "",
          steps,
          options: lines(g.options),
        } as ListeningGroup,
      ];
    }
    case "mcq": {
      const qs = g.questions ?? [];
      if (g.variant === "double") {
        let n = range[0];
        return qs.map((q) => {
          const r: [number, number] = [n, n + 1];
          n += 2;
          return {
            kind: "mcq-multi",
            range: r,
            instruction: g.instructions || "Choose TWO answers.",
            stem: q.stem,
            options: lines(q.options),
          } as ListeningGroup;
        });
      }
      let n = start;
      return [
        {
          kind: "mcq",
          range,
          instruction: g.instructions || "Choose the correct answer.",
          questions: qs.map((q) => ({
            number: n++,
            stem: q.stem,
            options: g.variant === "tfng" ? TFNG_OPTIONS : lines(q.options),
          })),
        } as ListeningGroup,
      ];
    }
    default:
      return [];
  }
}

export function authoredToListening(test: AuthoredTest, serverId?: string): ListeningTest {
  // Sections carry a part number (1–4, default 1) so a full test renders with
  // the same per-part banners and nav as the built-in tests.
  const byPart = new Map<number, ListeningGroup[]>();
  for (const { group, range } of groupRanges(test)) {
    const part = group.part ?? 1;
    const arr = byPart.get(part) ?? [];
    arr.push(...convertGroup(group, range, range[0], { matchDrag: true }));
    byPart.set(part, arr);
  }
  const partNumbers = [...byPart.keys()].sort((a, b) => a - b);
  return {
    id: `authored-${serverId ?? test.id ?? "new"}`,
    title: test.name || "Teacher question",
    audioSrc: test.audio,
    parts: partNumbers.length
      ? partNumbers.map((number) => ({
          number,
          // v2 numbering is explicit — order groups by their first question number.
          groups: (byPart.get(number) ?? []).sort((x, y) => x.range[0] - y.range[0]),
        }))
      : [{ number: 1, groups: [] }],
  };
}

export function authoredToReading(test: AuthoredTest, serverId?: string): ReadingTest {
  const ranges = groupRanges(test);
  const parts: ReadingTest["parts"] = [];

  for (const pn of [1, 2, 3]) {
    const inPart = ranges.filter((r) => (r.group.part ?? 1) === pn);
    const { title, passage } = readingPassageAt(test, pn);
    if (inPart.length === 0 && !passage.trim() && !title.trim()) continue;

    const groups: ReadingGroup[] = [];
    const headingsEntry = inPart.find((r) => r.group.type === "headings");

    for (const { group: g, range } of inPart) {
      switch (g.type) {
        case "headings":
          groups.push({ kind: "headings", range, options: lines(g.options) });
          break;
        case "mcq": {
          const qs = g.questions ?? [];
          if (g.variant === "tfng" || g.variant === "ynng") {
            groups.push({
              kind: "tfng",
              range,
              variant: g.variant === "ynng" ? "yn" : "tf",
              statements: qs.map((q) => q.stem),
            });
          } else if (g.variant === "double") {
            let n = range[0];
            groups.push({
              kind: "mcq-multi-set",
              range,
              items: qs.map((q) => {
                const r: [number, number] = [n, n + 1];
                n += 2;
                return { range: r, stem: q.stem, options: lines(q.options) };
              }),
            });
          } else {
            let n = range[0];
            groups.push({
              kind: "mcq",
              range,
              questions: qs.map((q) => ({ number: n++, stem: q.stem, options: lines(q.options) })),
            });
          }
          break;
        }
        default:
          // pasted / gap-text / drag-text / picture / table / flowchart map like listening
          groups.push(...(convertGroup(g, range, range[0]) as unknown as ReadingGroup[]));
      }
    }

    // Passage sections. With a headings group: explicit HEADING_TOKEN lines
    // place the gaps; with no tokens, a draggable heading gap is auto-placed
    // above every paragraph.
    const paras = passageParas(passage);
    const hasTokens = paras.some((p) => p === HEADING_TOKEN);
    const sections: PassageSection[] = [];
    let headingN = headingsEntry?.range[0] ?? 0;
    if (headingsEntry && !hasTokens) {
      for (const p of paras) {
        const gap = headingN <= headingsEntry.range[1] ? headingN++ : undefined;
        sections.push({ gap, paras: [p.replace(/\s+/g, " ")] });
      }
    } else {
      let cur: PassageSection = { paras: [] };
      for (const p of paras) {
        if (p === HEADING_TOKEN) {
          if (cur.paras.length || cur.gap !== undefined) sections.push(cur);
          cur = headingsEntry ? { gap: headingN++, paras: [] } : { paras: [] };
        } else {
          cur.paras.push(p.replace(/\s+/g, " "));
        }
      }
      if (cur.paras.length || cur.gap !== undefined) sections.push(cur);
    }
    if (sections.length === 0) sections.push({ paras: [] });

    parts.push({ number: pn, passageTitle: title, sections, groups });
  }

  if (parts.length === 0) {
    parts.push({ number: 1, passageTitle: "", sections: [{ paras: [] }], groups: [] });
  }

  return {
    id: `authored-${serverId ?? test.id ?? "new"}`,
    title: test.name || "Teacher question",
    parts,
  };
}

export function authoredToSpeaking(test: AuthoredTest, serverId?: string): SpeakingTest {
  const s = test.speaking;
  const part1: SpeakingTopic[] = [];
  if (s) {
    const t1 = lines(s.topic1.questions);
    if (t1.length) part1.push({ title: s.topic1.title || undefined, questions: t1 });
    const t2 = lines(s.topic2?.questions);
    if (t2.length) part1.push({ title: s.topic2?.title || undefined, questions: t2 });
  }
  return {
    id: `authored-${serverId ?? test.id ?? "new"}`,
    title: test.name || "Teacher question",
    part1,
    part2: {
      cueCardHtml: s?.cueCardHtml?.trim() ? s.cueCardHtml : undefined,
      prepSeconds: 60,
      speakSeconds: 120,
    },
    part3: lines(s?.part3Questions),
  };
}

export function authoredToWriting(test: AuthoredTest, serverId?: string): WritingExam {
  const mk = (taskNumber: 1 | 2): WritingTask => {
    const t = taskNumber === 1 ? test.task1 : test.task2;
    return {
      taskNumber,
      instruction:
        t?.instructions ||
        (taskNumber === 1
          ? "You should spend about 20 minutes on this task. Write at least 150 words."
          : "You should spend about 40 minutes on this task. Write at least 250 words."),
      minWords: taskNumber === 1 ? 150 : 250,
      promptParas: (t?.prompt ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
      imageUrl: taskNumber === 1 ? test.task1?.image : undefined,
    };
  };
  return {
    id: `authored-${serverId ?? test.id ?? "new"}`,
    title: test.name || "Teacher question",
    durationMin: 60,
    task1: mk(1),
    task2: mk(2),
  };
}

// ----------------------------------------------------------------------------
// API client (/api/questions) — payloads are marked __authored for filtering
// ----------------------------------------------------------------------------

export type SavedAuthoredQuestion = {
  id: string;
  module: AuthoredModule;
  name: string;
  createdAt: string;
  payload: { __authored: true; test: AuthoredTest };
};

export async function listAuthored(): Promise<SavedAuthoredQuestion[]> {
  const res = await fetch("/api/questions", { cache: "no-store" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Failed to load questions");
  return (json.questions as SavedAuthoredQuestion[]).filter((q) => q.payload?.__authored);
}

export async function saveAuthored(test: AuthoredTest): Promise<SavedAuthoredQuestion> {
  const body = test.id
    ? { op: "updateQuestion", id: test.id, name: test.name, payload: { __authored: true, test } }
    : {
        op: "saveQuestion",
        module: test.module,
        name: test.name || "Untitled question",
        payload: { __authored: true, test },
      };
  const res = await fetch("/api/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Save failed");
  return json.question;
}

export async function deleteAuthored(id: string): Promise<void> {
  await fetch("/api/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "deleteQuestion", id }),
  });
}

// ----------------------------------------------------------------------------
// Question-type menus per module (kept in sync with the student panel)
// ----------------------------------------------------------------------------

export type ModuleTypeOption = {
  /** Unique menu value (several entries can share one AuthoredGroupType). */
  key: string;
  type: AuthoredGroupType;
  label: string;
  /** Applied on top of newGroup() when this menu entry is added. */
  preset?: Partial<AuthoredGroup>;
};

const LABEL_ELEMENTS: SpecialElements = { picture: true, table: true, drag: false, options: false };

export const MODULE_TYPES: Record<AuthoredModule, ModuleTypeOption[]> = {
  listening: [
    { key: "notes", type: "pasted", label: "Notes / form / sentence completion (12_____ = answer box)" },
    { key: "table", type: "pasted", label: "Table completion (paste a formatted table, 12_____ in cells)" },
    { key: "mcq-single", type: "mcq", label: "Multiple choice — single answer", preset: { variant: "single" } },
    { key: "mcq-double", type: "mcq", label: "Multiple choice — choose TWO", preset: { variant: "double" } },
    { key: "matching", type: "drag-text", label: "Matching — drag options to items" },
    {
      key: "map",
      type: "special",
      label: "Map labelling — picture + letter table",
      preset: { elements: LABEL_ELEMENTS, cols: "A\nB\nC\nD\nE\nF\nG\nH" },
    },
    {
      key: "diagram",
      type: "special",
      label: "Diagram labelling — picture + letter table",
      preset: { elements: LABEL_ELEMENTS, cols: "A\nB\nC\nD\nE" },
    },
    { key: "flowchart", type: "flowchart", label: "Flowchart completion" },
    { key: "special", type: "special", label: "Special type (picture / option table / draggables)" },
  ],
  reading: [
    {
      key: "notes",
      type: "pasted",
      label: "Notes / summary / sentence / short answers (12_____ = answer box)",
    },
    { key: "table-completion", type: "pasted", label: "Table completion (paste a formatted table, 12_____ in cells)" },
    { key: "tfng", type: "mcq", label: "TRUE / FALSE / NOT GIVEN", preset: { variant: "tfng" } },
    { key: "ynng", type: "mcq", label: "YES / NO / NOT GIVEN", preset: { variant: "ynng" } },
    { key: "mcq-single", type: "mcq", label: "Multiple choice — single answer", preset: { variant: "single" } },
    { key: "mcq-double", type: "mcq", label: "Multiple choice — choose TWO", preset: { variant: "double" } },
    { key: "headings", type: "headings", label: "Matching headings (gaps auto-placed above each paragraph)" },
    {
      key: "match-info",
      type: "table",
      label: "Matching information / features / people (letter table)",
      preset: { cols: "A\nB\nC\nD\nE\nF\nG" },
    },
    { key: "match-endings", type: "drag-text", label: "Sentence endings / summary from a box (drag options)" },
    { key: "diagram", type: "picture", label: "Diagram labelling (picture)" },
    { key: "flowchart", type: "flowchart", label: "Flowchart completion" },
  ],
  writing: [],
  speaking: [],
};
