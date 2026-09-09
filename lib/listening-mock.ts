// Listening test model + demo content for the Mock Practice section.
//
// The demo test mirrors the official IELTS computer-delivered listening demo:
//   Part 1 — note completion (typed answers)
//   Part 2 — matching (drag & drop) + map labelling (drag & drop)
//   Part 3 — multiple choice (incl. a two-answer question that shares one
//            slot in the bottom navigation) + flowchart completion (drag & drop)
//   Part 4 — note completion (typed answers)
//
// Question numbers are global (1–40). A "gap" segment renders as the numbered
// answer box for that question.

export type Seg = { text: string } | { gap: number };

export type NoteRow = {
  /** Hanging label in the left column, e.g. "Dining table:". */
  label?: string;
  /** One entry per bullet line; each line is a list of text/gap segments. */
  lines: Seg[][];
};

export type NotesGroup = {
  kind: "notes";
  range: [number, number];
  /** Bolded constraint inside "Complete the notes. Write … for each answer." */
  constraint: string;
  title?: string;
  heading?: string;
  /** true → round bullets (Part 4); false → dash lines (Part 1). */
  bulleted?: boolean;
  rows: NoteRow[];
};

export type MatchDragGroup = {
  kind: "match-drag";
  range: [number, number];
  instruction: string;
  title?: string;
  /** One item per question number, in order. */
  items: string[];
  options: string[];
};

export type MapBox = {
  /** Percent-based geometry inside the map container. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Fixed label text — mutually exclusive with `gap`. */
  label?: string;
  /** Question number of a droppable gap. */
  gap?: number;
};

export type MapDragGroup = {
  kind: "map-drag";
  range: [number, number];
  instruction: string;
  title?: string;
  options: string[];
  boxes: MapBox[];
  /** Pixel height of the map area. */
  height: number;
};

export type McqGroup = {
  kind: "mcq";
  range: [number, number];
  instruction: string;
  questions: { number: number; stem: string; options: string[] }[];
};

/** Two-answer multiple choice; both question numbers share one nav slot. */
export type McqMultiGroup = {
  kind: "mcq-multi";
  range: [number, number];
  instruction: string;
  stem: string;
  options: string[];
};

export type FlowchartGroup = {
  kind: "flowchart";
  range: [number, number];
  instruction: string;
  title: string;
  steps: Seg[][];
  options: string[];
};

/**
 * Teacher-authored pasted content: free paragraphs with numbered gaps, an
 * optional picture (maps / diagram labelling), and — when `options` is set —
 * bold draggable chips that fill the gaps instead of typed answers.
 */
export type PastedGroup = {
  kind: "pasted";
  range: [number, number];
  instructions: string;
  title?: string;
  imageUrl?: string;
  paras: Seg[][];
  options?: string[];
  /**
   * Rich pasted content (sanitized HTML) — bold, fonts, indentation and real
   * tables with merged cells. When present it is rendered instead of `paras`;
   * "12_____" placeholders inside it become answer boxes.
   */
  html?: string;
};

/** Option-selection table: one question per row, one letter column per option. */
export type TableGroup = {
  kind: "table";
  range: [number, number];
  instructions: string;
  rows: string[];
  cols: string[];
  /** Map / plan labelling: the picture shown to the left of the letter table. */
  imageUrl?: string;
};

export type ListeningGroup =
  | NotesGroup
  | MatchDragGroup
  | MapDragGroup
  | McqGroup
  | McqMultiGroup
  | FlowchartGroup
  | PastedGroup
  | TableGroup;

export type ListeningPart = {
  number: number;
  groups: ListeningGroup[];
};

export type ListeningTest = {
  id: string;
  title: string;
  /** Optional audio track; the header shows "Audio is Playing" regardless. */
  audioSrc?: string;
  parts: ListeningPart[];
};

// ----------------------------------------------------------------------------
// Navigation slots — one per answer box, except a two-answer MCQ which is one
// joint slot covering both question numbers.
// ----------------------------------------------------------------------------

export type NavSlot = { partIndex: number; numbers: number[] };

export function buildSlots(test: ListeningTest): NavSlot[] {
  const slots: NavSlot[] = [];
  test.parts.forEach((part, partIndex) => {
    for (const group of part.groups) {
      if (group.kind === "mcq-multi") {
        const numbers = [];
        for (let n = group.range[0]; n <= group.range[1]; n++) numbers.push(n);
        slots.push({ partIndex, numbers });
      } else {
        for (let n = group.range[0]; n <= group.range[1]; n++) {
          slots.push({ partIndex, numbers: [n] });
        }
      }
    }
  });
  return slots;
}

export function partQuestionCount(part: ListeningPart): number {
  return part.groups.reduce(
    (sum, g) => sum + (g.range[1] - g.range[0] + 1),
    0,
  );
}

// ----------------------------------------------------------------------------
// Answer-key scoring (teacher-authored tests)
// ----------------------------------------------------------------------------

/** Per question number: accepted answers (a line split on "/"). */
export type AnswerKey = Record<number, string[]>;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const letterAt = (i: number) => String.fromCharCode(97 + i);

function optionMatch(value: string, alts: string[], options: string[] | null): boolean {
  const nv = norm(value);
  if (alts.includes(nv)) return true;
  if (options) {
    const idx = options.findIndex((o) => norm(o) === nv);
    if (idx >= 0 && alts.includes(letterAt(idx))) return true;
  }
  return false;
}

export function scoreListening(
  test: ListeningTest,
  answers: Record<number, string>,
  multi: Record<number, string[]>,
  key: AnswerKey,
): { correct: number; total: number } {
  let correct = 0;
  let total = 0;
  for (const part of test.parts) {
    for (const g of part.groups) {
      if (g.kind === "mcq-multi") {
        const [a, b] = g.range;
        total += b - a + 1;
        const chosen = multi[a] ?? [];
        const used = new Set<number>();
        for (let n = a; n <= b; n++) {
          const alts = (key[n] ?? []).map(norm);
          if (!alts.length) continue;
          const idx = chosen.findIndex(
            (c, i) => !used.has(i) && optionMatch(c, alts, g.options),
          );
          if (idx >= 0) {
            used.add(idx);
            correct++;
          }
        }
        continue;
      }
      const options: string[] | null =
        g.kind === "mcq"
          ? null // per-question below
          : g.kind === "table"
            ? g.cols
            : g.kind === "match-drag" || g.kind === "map-drag" || g.kind === "flowchart"
              ? g.options
              : g.kind === "pasted"
                ? (g.options ?? null)
                : null;
      for (let n = g.range[0]; n <= g.range[1]; n++) {
        total++;
        const v = answers[n];
        if (!v?.trim()) continue;
        const alts = (key[n] ?? []).map(norm);
        if (!alts.length) continue;
        const opts =
          g.kind === "mcq" ? (g.questions.find((q) => q.number === n)?.options ?? null) : options;
        if (optionMatch(v, alts, opts)) correct++;
      }
    }
  }
  return { correct, total };
}

// ----------------------------------------------------------------------------
// Demo test
// ----------------------------------------------------------------------------

const t = (text: string): Seg => ({ text });
const g = (gap: number): Seg => ({ gap });

export const DEMO_LISTENING_TEST: ListeningTest = {
  id: "listening-demo-1",
  title: "Listening — Demo Test",
  // Placeholder silent track — swap for the real recording when adding content.
  audioSrc: "/listening-demo-audio.wav",
  parts: [
    {
      number: 1,
      groups: [
        {
          kind: "notes",
          range: [1, 10],
          constraint: "ONE WORD AND/OR A NUMBER",
          title: "Phone call about second-hand furniture",
          heading: "Items:",
          rows: [
            {
              label: "Dining table:",
              lines: [
                [g(1), t(" shape")],
                [t("medium size")],
                [g(2), t(" old")],
                [t("price: £25.00")],
              ],
            },
            {
              label: "Dining chairs:",
              lines: [
                [t("set of "), g(3), t(" chairs")],
                [t("seats covered in "), g(4), t(" material")],
                [t("in "), g(5), t(" condition")],
                [t("price: £20.00")],
              ],
            },
            {
              label: "Desk:",
              lines: [
                [t("length: 1 metre 20")],
                [t("3 drawers, and one has a "), g(6)],
                [t("made of "), g(7), t(" wood")],
                [t("price: £"), g(8)],
              ],
            },
            {
              label: "Address:",
              lines: [[t("41 "), g(9), t(" Road")]],
            },
            {
              label: "Viewing time:",
              lines: [[t("any day after "), g(10), t(" p.m.")]],
            },
          ],
        },
      ],
    },
    {
      number: 2,
      groups: [
        {
          kind: "match-drag",
          range: [11, 15],
          instruction:
            "Who is responsible for each area? Choose the correct answer and move it into the gap.",
          title: "Holiday camp staff",
          items: [
            "Mary Brown",
            "John Stevens",
            "Alison Jones",
            "Tim Smith",
            "Jenny James",
          ],
          options: [
            "Finance",
            "Food",
            "Health",
            "Kids' Counselling",
            "Organisation",
            "Rooms",
            "Sport",
            "Trips",
          ],
        },
        {
          kind: "map-drag",
          range: [16, 20],
          instruction:
            "Label the map. Choose the correct answer and move it into the gap.",
          options: [
            "Cookery room",
            "Games room",
            "Kitchen",
            "Pottery room",
            "Library",
          ],
          height: 430,
          boxes: [
            { x: 6, y: 4, w: 20, h: 14, gap: 16 },
            { x: 30, y: 2, w: 17, h: 17, label: "Staff Lounge" },
            { x: 51, y: 6, w: 20, h: 12, gap: 17 },
            { x: 2, y: 30, w: 17, h: 17, label: "Girls' Accommodation" },
            { x: 31, y: 36, w: 19, h: 12, gap: 18 },
            { x: 62, y: 29, w: 15, h: 16, label: "Art Room" },
            { x: 2, y: 56, w: 17, h: 17, label: "Boys' Accommodation" },
            { x: 62, y: 54, w: 15, h: 16, label: "Craft Room" },
            { x: 31, y: 62, w: 19, h: 12, gap: 19 },
            { x: 54, y: 82, w: 22, h: 12, gap: 20 },
            { x: 20, y: 84, w: 18, h: 10, label: "Reception" },
          ],
        },
      ],
    },
    {
      number: 3,
      groups: [
        {
          kind: "mcq-multi",
          range: [21, 22],
          instruction: "Choose TWO answers.",
          stem: "Which TWO facilities does the science centre currently offer?",
          options: [
            "a games area",
            "a lecture theatre",
            "a planetarium",
            "a science library",
            "a shop",
          ],
        },
        {
          kind: "mcq",
          range: [23, 25],
          instruction: "Choose the correct answer.",
          questions: [
            {
              number: 23,
              stem: "The new exhibition will mainly focus on",
              options: ["space travel.", "robotics.", "the human body."],
            },
            {
              number: 24,
              stem: "Visitors on the guided tour must",
              options: [
                "book a place in advance.",
                "arrive before midday.",
                "pay an additional fee.",
              ],
            },
            {
              number: 25,
              stem: "What do the students decide to do first?",
              options: [
                "watch a demonstration",
                "attend a workshop",
                "visit the exhibition hall",
              ],
            },
          ],
        },
        {
          kind: "flowchart",
          range: [26, 30],
          instruction:
            "Complete the flowchart. Choose the correct answer and move it into the gap.",
          title: "Procedure for detecting life on another planet",
          steps: [
            [t("A spacecraft lands on a planet and sends out a rover.")],
            [
              t("The rover is directed to a "),
              g(26),
              t(" which has organic material."),
            ],
            [
              t(
                "It collects a sample from below the surface (in order to avoid the effects of ",
              ),
              g(27),
              t(")."),
            ],
            [t("The soil and rocks are checked to look for evidence of fossils.")],
            [t("The sample is converted to powder.")],
            [t("The sample is subjected to "), g(28), t(".")],
            [
              t(
                "A mass spectrometer is used to search for potential proof of life, e.g. ",
              ),
              g(29),
              t("."),
            ],
            [
              t("The "),
              g(30),
              t(" are compared with existing data from Earth."),
            ],
          ],
          options: [
            "contamination",
            "vehicle",
            "heat",
            "results",
            "radiation",
            "site",
            "microbes",
            "water",
          ],
        },
      ],
    },
    {
      number: 4,
      groups: [
        {
          kind: "notes",
          range: [31, 37],
          constraint: "ONE WORD ONLY",
          title: "Student support services",
          heading: "Current services",
          bulleted: true,
          rows: [
            {
              lines: [
                [t("A drop-in "), g(31), t(" desk in the main library.")],
                [t("One-to-one sessions with a study "), g(32), t(".")],
                [t("Weekly workshops on writing and "), g(33), t(" skills.")],
                [t("An online "), g(34), t(" of frequently asked questions.")],
                [t("A quiet "), g(35), t(" room open every evening.")],
                [t("Free "), g(36), t(" classes for international students.")],
                [t("A telephone "), g(37), t(" service at weekends.")],
              ],
            },
          ],
        },
        {
          kind: "notes",
          range: [38, 40],
          constraint: "ONE WORD ONLY",
          heading: "Recommendations",
          bulleted: true,
          rows: [
            {
              lines: [
                [
                  t(
                    "Ask new students to complete questionnaires to gauge their level of ",
                  ),
                  g(38),
                  t("."),
                ],
                [t("Train selected students to act as "), g(39), t(".")],
                [t("Outside office hours, offer "), g(40), t(" help.")],
              ],
            },
          ],
        },
      ],
    },
  ],
};
