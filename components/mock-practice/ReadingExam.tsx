"use client";

// Full-screen IELTS computer-delivered Reading test interface for the Mock
// Practice section, modelled on the official Inspera player:
//
//  - top bar: IELTS logotype, "Test taker ID", status icons, settings menu
//  - split view: passage left, questions right, draggable ↔ divider between,
//    both panes scrolling independently (scrollbars hidden but functional)
//  - TRUE/FALSE/NOT GIVEN + YES/NO/NOT GIVEN radios, typed note/summary gaps,
//    single MCQs, two-answer MCQs (each pair shares one joint "22–23" slot in
//    the bottom bar), and section headings dragged from the question pane
//    across into gaps inside the passage (undo by clicking the placed heading)
//  - bottom part navigation identical to Listening: answered numbers get a
//    green underline, the active part expands, finished parts collapse to
//    "✔ Part N", unfinished ones to "x of N"
//  - the shared Highlight/Note toolbar and Delete Highlight popover

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SIZE_PX, THEMES, type SizeKey, type ThemeKey } from "@/lib/exam-theme";
import {
  buildHighlights,
  DropGap,
  ExamHLCtx,
  gapInputWidth,
  getDragPayload,
  getSelectionPieces,
  HelpLink,
  HighlightPopover,
  HL,
  NotesPanel,
  OptionBank,
  OptionsScreen,
  removeHighlight,
  RichPasted,
  SelectionToolbar,
  setDragPayload,
  StatusBar,
  TestLoadingScreen,
  useExamBoot,
  useTestTakerId,
  useExamHL,
  usedOptions,
  type DragPayload,
  type ExamHighlight,
  type ExamHLValue,
  type NoteCard,
  type SelectionPiece,
} from "./exam-ui";
import {
  buildReadingSlots,
  readingPartQuestionCount,
  scoreReading,
  type AnswerKey,
  type ReadingFlowchartGroup,
  type ReadingGroup,
  type ReadingHeadingsGroup,
  type ReadingMcqGroup,
  type ReadingMcqMultiSetGroup,
  type ReadingNotesGroup,
  type ReadingPart,
  type ReadingPastedGroup,
  type ReadingSummaryGroup,
  type ReadingTableGroup,
  type ReadingTest,
  type ReadingTfngGroup,
  type Seg,
} from "@/lib/reading-mock";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Menu,
  MoveHorizontal,
  SquarePen,
  Wifi,
} from "lucide-react";

export const readingStorageKey = (userId: string, testId: string) =>
  `wise-mans-doctrine:mock-practice:reading:${testId}:${userId}`;

const READING_DURATION_MIN = 60;

export type ExamMode = "real" | "practice";

export type ReadingExamProps = {
  test: ReadingTest;
  userId: string;
  mode: ExamMode;
  /** Teacher answer key — when present, the finish screen shows a score. */
  answerKey?: AnswerKey;
  onExit: () => void;
};

type Answers = Record<number, string>;
type MultiAnswers = Record<number, string[]>;

/** Labels for the practice-mode question-type filter. */
const KIND_LABELS: Record<string, string> = {
  tfng: "True/False & Yes/No questions",
  notes: "Note completion",
  summary: "Summary completion",
  headings: "Matching headings",
  "mcq-multi-set": "Multiple choice (two answers)",
  mcq: "Multiple choice",
};

type DictEntry = { partOfSpeech: string; definition: string };
type DictState =
  | { word: string; status: "loading" }
  | { word: string; status: "error" }
  | { word: string; status: "done"; entries: DictEntry[]; synonyms: string[] };

export default function ReadingExam({ test: fullTest, userId, mode, answerKey, onExit }: ReadingExamProps) {
  const storageKey = readingStorageKey(userId, fullTest.id);
  const practice = mode === "practice";
  const booting = useExamBoot();
  const takerId = useTestTakerId();

  // Practice mode can focus on a single question type; the test is filtered
  // down to matching groups (parts left empty disappear from the nav).
  const [focusKind, setFocusKind] = useState<string>("all");
  const availableKinds = useMemo(() => {
    const kinds: string[] = [];
    for (const p of fullTest.parts)
      for (const g of p.groups) if (!kinds.includes(g.kind)) kinds.push(g.kind);
    return kinds;
  }, [fullTest]);

  const test = useMemo<ReadingTest>(() => {
    if (!practice || focusKind === "all") return fullTest;
    const parts = fullTest.parts
      .map((p) => ({ ...p, groups: p.groups.filter((g) => g.kind === focusKind) }))
      .filter((p) => p.groups.length > 0);
    return parts.length > 0 ? { ...fullTest, parts } : fullTest;
  }, [fullTest, practice, focusKind]);

  const [themeKey, setThemeKey] = useState<ThemeKey>("bw");
  const [sizeKey, setSizeKey] = useState<SizeKey>("regular");
  const theme = THEMES[themeKey];
  const bw = themeKey === "bw";

  const [answers, setAnswers] = useState<Answers>({});
  const [multi, setMulti] = useState<MultiAnswers>({});
  const [loaded, setLoaded] = useState(false);
  const [currentRaw, setCurrent] = useState(0);
  const [finishOpen, setFinishOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [focusNoteLink, setFocusNoteLink] = useState<string | null>(null);
  const [hoverGap, setHoverGap] = useState<number | null>(null);

  // Practice-mode dictionary (right-click a word).
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; word: string } | null>(null);
  const [dict, setDict] = useState<DictState | null>(null);

  // 60-minute countdown (real test mode only).
  const [secondsLeft, setSecondsLeft] = useState(READING_DURATION_MIN * 60);
  useEffect(() => {
    if (mode !== "real") return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [mode]);
  const minutesRemaining = Math.ceil(secondsLeft / 60);

  const slots = useMemo(() => buildReadingSlots(test), [test]);
  // Changing the practice focus rebuilds the slots — clamp and reset position.
  const current = Math.min(currentRaw, slots.length - 1);
  useEffect(() => {
    setCurrent(0);
  }, [focusKind]);
  const slotIndexByNumber = useMemo(() => {
    const m = new Map<number, number>();
    slots.forEach((s, i) => s.numbers.forEach((n) => m.set(n, i)));
    return m;
  }, [slots]);

  const gapEls = useRef(new Map<number, HTMLElement>());
  const registerGap = useCallback((n: number, el: HTMLElement | null) => {
    if (el) gapEls.current.set(n, el);
    else gapEls.current.delete(n);
  }, []);

  // Split view: percentage width of the passage pane.
  const [leftPct, setLeftPct] = useState(48);
  const splitRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.max(25, Math.min(72, pct)));
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ------------------------------ persistence -------------------------------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.answers) setAnswers(data.answers);
        if (data.multi) setMulti(data.multi);
      }
    } catch {
      /* start fresh */
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ answers, multi }));
    } catch {
      /* quota — keep going in memory */
    }
  }, [answers, multi, loaded, storageKey]);

  // ---------------------------- answered helpers ----------------------------
  const isSlotAnswered = useCallback(
    (slotIdx: number) => {
      const slot = slots[slotIdx];
      if (slot.numbers.length > 1) return (multi[slot.numbers[0]]?.length ?? 0) >= slot.numbers.length;
      return !!answers[slot.numbers[0]]?.trim();
    },
    [slots, answers, multi],
  );

  const answeredInPart = useCallback(
    (partIndex: number) => {
      let count = 0;
      slots.forEach((slot, i) => {
        if (slot.partIndex !== partIndex) return;
        if (slot.numbers.length > 1) {
          count += Math.min(multi[slot.numbers[0]]?.length ?? 0, slot.numbers.length);
        } else if (isSlotAnswered(i)) {
          count += 1;
        }
      });
      return count;
    },
    [slots, multi, isSlotAnswered],
  );

  // ------------------------------- navigation -------------------------------
  const activePartIndex = slots[current].partIndex;
  const part = test.parts[activePartIndex];

  const goTo = useCallback(
    (slotIdx: number) => setCurrent(Math.max(0, Math.min(slots.length - 1, slotIdx))),
    [slots.length],
  );

  const lastScrolled = useRef(-1);
  useEffect(() => {
    if (lastScrolled.current === current) return;
    lastScrolled.current = current;
    const n = slots[current].numbers[0];
    requestAnimationFrame(() => {
      const el = gapEls.current.get(n);
      if (!el) return;
      if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [current, slots]);

  // ------------------------------- highlights -------------------------------
  const [highlights, setHighlights] = useState<ExamHighlight[]>([]);
  const [selToolbar, setSelToolbar] = useState<{ pieces: SelectionPiece[]; text: string; x: number; y: number } | null>(null);
  const [hlPopover, setHlPopover] = useState<{ id: string; linkId?: string; x: number; y: number } | null>(null);

  const getHighlights = useCallback(
    (blockId: string) => highlights.filter((h) => h.blockId === blockId),
    [highlights],
  );

  const onClickHighlight = useCallback((h: ExamHighlight, rect: DOMRect) => {
    if (h.note !== undefined) {
      setNotesOpen(true);
      setFocusNoteLink(h.linkId ?? h.id);
      setSelToolbar(null);
      setHlPopover(null);
      return;
    }
    setHlPopover({ id: h.id, linkId: h.linkId, x: rect.left + rect.width / 2, y: rect.bottom + 12 });
    setSelToolbar(null);
  }, []);

  const handleMouseUp = () => {
    const s = getSelectionPieces();
    if (!s) return;
    setSelToolbar(s);
    setHlPopover(null);
  };

  const applyHighlight = () => {
    if (!selToolbar) return;
    setHighlights((hs) => [...hs, ...buildHighlights(selToolbar.pieces)]);
    window.getSelection()?.removeAllRanges();
    setSelToolbar(null);
  };

  const createNote = () => {
    if (!selToolbar) return;
    const hs = buildHighlights(selToolbar.pieces, {
      note: "",
      part: part.number,
      snippet: selToolbar.text.trim().slice(0, 60),
    });
    setHighlights((prev) => [...prev, ...hs]);
    setNotesOpen(true);
    setFocusNoteLink(hs[0].linkId ?? null);
    window.getSelection()?.removeAllRanges();
    setSelToolbar(null);
  };

  const noteCards = useMemo<NoteCard[]>(() => {
    const map = new Map<string, NoteCard>();
    for (const h of highlights) {
      if (h.note === undefined) continue;
      const key = h.linkId ?? h.id;
      if (!map.has(key)) map.set(key, { linkId: key, part: h.part ?? 1, snippet: h.snippet ?? "", text: h.note });
    }
    return [...map.values()];
  }, [highlights]);

  const changeNote = useCallback((linkId: string, text: string) => {
    setHighlights((hs) => hs.map((h) => ((h.linkId ?? h.id) === linkId ? { ...h, note: text } : h)));
  }, []);
  const deleteNote = useCallback((linkId: string) => {
    setHighlights((hs) => removeHighlight(hs, { linkId }));
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest("[data-exam-pop]")) return;
      setSelToolbar(null);
      setHlPopover(null);
      setCtxMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // ---------------- practice mode: right-click dictionary -------------------
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!practice) return;
    const sel = window.getSelection();
    let word = sel && !sel.isCollapsed ? sel.toString().trim() : "";
    if (!word) {
      const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null };
      const range = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
        const t = range.startContainer.textContent ?? "";
        const o = range.startOffset;
        const left = /[A-Za-z'’-]+$/.exec(t.slice(0, o))?.[0] ?? "";
        const right = /^[A-Za-z'’-]+/.exec(t.slice(o))?.[0] ?? "";
        word = left + right;
      }
    }
    word = word.split(/\s+/)[0]?.replace(/[^A-Za-z'’-]/g, "") ?? "";
    if (!word) return;
    e.preventDefault();
    setCtxMenu({
      x: Math.min(e.clientX, window.innerWidth - 340),
      y: Math.min(e.clientY, window.innerHeight - 140),
      word,
    });
    setDict(null);
  };

  const lookupWord = async (word: string) => {
    setCtxMenu(null);
    setDict({ word, status: "loading" });
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`,
      );
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      const meanings = data?.[0]?.meanings ?? [];
      const entries: DictEntry[] = [];
      const synonyms = new Set<string>();
      for (const m of meanings) {
        const def = m?.definitions?.[0]?.definition;
        if (def && entries.length < 3) entries.push({ partOfSpeech: m.partOfSpeech ?? "", definition: def });
        for (const s of m?.synonyms ?? []) synonyms.add(s);
        for (const d of m?.definitions ?? []) for (const s of d?.synonyms ?? []) synonyms.add(s);
      }
      if (entries.length === 0) throw new Error("empty");
      setDict({ word, status: "done", entries, synonyms: [...synonyms].slice(0, 8) });
    } catch {
      setDict({ word, status: "error" });
    }
  };

  // ----------------------------- answer setters -----------------------------
  const setAnswer = useCallback((n: number, value: string) => {
    setAnswers((a) => {
      const next = { ...a };
      if (value) next[n] = value;
      else delete next[n];
      return next;
    });
  }, []);

  const toggleMulti = useCallback((start: number, option: string, max: number) => {
    setMulti((m) => {
      const cur = m[start] ?? [];
      if (cur.includes(option)) return { ...m, [start]: cur.filter((o) => o !== option) };
      if (cur.length >= max) return m;
      return { ...m, [start]: [...cur, option] };
    });
  }, []);

  const dropOnGap = useCallback(
    (gap: number, p: DragPayload) => {
      setAnswers((a) => {
        const next = { ...a };
        if (p.fromGap !== null) delete next[p.fromGap];
        for (let k = p.range[0]; k <= p.range[1]; k++) {
          if (next[k] === p.option) delete next[k];
        }
        next[gap] = p.option;
        return next;
      });
      goTo(slotIndexByNumber.get(gap) ?? current);
    },
    [goTo, slotIndexByNumber, current],
  );

  const onFocusQuestion = useCallback(
    (n: number) => {
      const idx = slotIndexByNumber.get(n);
      if (idx !== undefined) setCurrent(idx);
    },
    [slotIndexByNumber],
  );

  const ctx = useMemo<ExamHLValue>(
    () => ({ theme, getHighlights, onClickHighlight }),
    [theme, getHighlights, onClickHighlight],
  );

  const totalAnswered = test.parts.reduce((s, _p, i) => s + answeredInPart(i), 0);
  const totalQuestions = test.parts.reduce((s, p) => s + readingPartQuestionCount(p), 0);
  const score = answerKey ? scoreReading(test, answers, multi, answerKey) : null;

  // The headings group (if any) of the active part — its gaps render inside
  // the passage pane, so both panes need access to it.
  const headingsGroup = part.groups.find((gr): gr is ReadingHeadingsGroup => gr.kind === "headings");

  const sharedGroupProps = {
    answers,
    multi,
    setAnswer,
    toggleMulti,
    dropOnGap,
    registerGap,
    currentNumbers: slots[current].numbers,
    onFocusQuestion,
    hoverGap,
    setHoverGap,
    bw,
  };

  // ============================ pre-test boot ===============================
  if (booting) return <TestLoadingScreen />;

  // ============================== finished view =============================
  if (finished) {
    return (
      <div
        className="exam-surface fixed inset-0 z-[300] grid place-items-center"
        style={{ background: theme.pageBg, fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <div
          className="w-[460px] max-w-[92vw] rounded-lg border p-8 text-center shadow-xl"
          style={{ background: theme.contentBg, borderColor: theme.border, color: theme.fg }}
        >
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#2f9e44]">
            <Check className="h-8 w-8 text-white" />
          </span>
          <h2 className="mt-4 text-2xl font-bold">Reading test finished</h2>
          <p className="mt-2 text-sm" style={{ color: theme.muted }}>
            Your answers have been saved.
          </p>
          <div className="mt-5 space-y-1.5 text-left text-[15px]">
            {test.parts.map((p, i) => (
              <div key={p.number} className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: theme.border }}>
                <span className="font-bold">Part {p.number}</span>
                <span>
                  {answeredInPart(i)} of {readingPartQuestionCount(p)} answered
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1 font-bold">
              <span>Total</span>
              <span>
                {totalAnswered} of {totalQuestions}
              </span>
            </div>
            {score && (
              <div className="flex items-center justify-between pt-1 font-bold text-[#2f9e44]">
                <span>Score</span>
                <span>
                  {score.correct} of {score.total}
                </span>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setFinished(false)}
              className="rounded border px-4 py-2 text-sm font-medium"
              style={{ borderColor: theme.border, color: theme.fg }}
            >
              Review answers
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded bg-[#1f1f1f] px-5 py-2 text-sm font-medium text-white hover:bg-black"
            >
              Save and exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================================ exam view ===============================
  return (
    <ExamHLCtx.Provider value={ctx}>
      <div
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        className="exam-surface fixed inset-0 z-[300] flex"
        style={{
          background: theme.pageBg,
          color: theme.fg,
          fontFamily: "Arial, Helvetica, sans-serif",
          colorScheme: bw ? "light" : "dark",
        }}
      >
        <style>{`.wmd-gap-input::placeholder { color: currentColor; opacity: 1; font-weight: 700; text-align: center; }`}</style>

        <div className="flex min-w-0 flex-1 flex-col">
        {/* ============================ Top bar ============================ */}
        <header
          className="flex items-center justify-between border-b px-5 py-2"
          style={{ background: theme.chromeTopBg, borderColor: theme.chromeBorder }}
        >
          <div className="flex items-center gap-5">
            <span className="select-none text-[30px] font-black leading-none tracking-tight text-[#E31837]">
              IELTS<sup className="align-super text-[11px] font-bold">™</sup>
            </span>
            <div>
              <p className="text-[15px] font-bold leading-tight" style={{ color: theme.chromeFg }}>
                Test Taker ID: {takerId}
              </p>
              {mode === "real" && (
                <p className="text-[13px] leading-tight" style={{ color: theme.chromeFg }}>
                  {minutesRemaining} {minutesRemaining === 1 ? "minute" : "minutes"} remaining
                </p>
              )}
            </div>
          </div>
          <div className="relative flex items-center gap-6" style={{ color: theme.chromeFg }}>
            <Wifi className="h-6 w-6" />
            <Bell className="h-6 w-6" />
            <button
              type="button"
              aria-label="Options"
              onClick={() => setOptionsOpen(true)}
              className="rounded p-0.5 transition hover:opacity-70"
            >
              <Menu className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Notes"
              onClick={() => setNotesOpen((o) => !o)}
              className="rounded p-0.5 transition hover:opacity-70"
            >
              <SquarePen className="h-6 w-6" />
            </button>
          </div>
        </header>

        {/* ============================ Content ============================ */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <main
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            style={{ background: theme.contentBg, color: theme.fg, fontSize: SIZE_PX[sizeKey] }}
          >
            <div className="px-5 pt-4">
              {practice && (
                <div className="mb-3 flex items-center gap-2 text-[14px]">
                  <span>Practice focus:</span>
                  <select
                    value={focusKind}
                    onChange={(e) => setFocusKind(e.target.value)}
                    aria-label="Practice focus"
                    className="rounded border px-2 py-1"
                    style={{ background: theme.inputBg, color: theme.inputFg, borderColor: theme.inputBorder }}
                  >
                    <option value="all">All question types</option>
                    {availableKinds.map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k] ?? k}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div
                className="rounded border px-4 py-1.5"
                style={{ background: bw ? "#f0f0ea" : theme.panelBg, borderColor: theme.border }}
              >
                <p className="font-bold">Part {part.number}</p>
                <p className="mt-0">
                  Read the text and answer questions {part.groups[0].range[0]}–
                  {part.groups[part.groups.length - 1].range[1]}.
                </p>
              </div>
            </div>

            <div ref={splitRef} className="flex min-h-0 flex-1 items-stretch px-5 pb-3 pt-6">
              {/* Passage pane */}
              <div className="scrollbar-none min-h-0 overflow-y-auto pb-24 pr-5" style={{ width: `${leftPct}%` }}>
                {headingsGroup && <HelpLink />}
                <PassageView
                  part={part}
                  headingsGroup={headingsGroup}
                  {...sharedGroupProps}
                />
              </div>

              {/* Divider */}
              <div
                className="relative shrink-0 cursor-col-resize"
                style={{ width: 14 }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  draggingRef.current = true;
                  document.body.style.cursor = "col-resize";
                  document.body.style.userSelect = "none";
                }}
              >
                <span
                  aria-hidden
                  className="absolute bottom-0 left-1/2 top-0 w-[2px] -translate-x-1/2"
                  style={{ background: bw ? "#8a8a8a" : theme.border }}
                />
                <span
                  className="absolute left-1/2 top-[40%] grid h-8 w-8 -translate-x-1/2 place-items-center border"
                  style={{ background: theme.contentBg, borderColor: bw ? "#8a8a8a" : theme.border, color: theme.fg }}
                >
                  <MoveHorizontal className="h-4 w-4" />
                </span>
              </div>

              {/* Questions pane */}
              <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pb-24 pl-5">
                {part.groups.map((group) => (
                  <GroupView key={`${part.number}-${group.range[0]}`} group={group} {...sharedGroupProps} />
                ))}
              </div>
            </div>
          </main>

          {/* Floating prev/next arrows */}
          <div className="pointer-events-none absolute bottom-6 right-8 flex gap-2">
            <button
              type="button"
              aria-label="Previous question"
              disabled={current === 0}
              onClick={() => goTo(current - 1)}
              className="pointer-events-auto grid h-12 w-14 place-items-center rounded text-white shadow-md transition"
              style={{ background: current === 0 ? "#c9c9c9" : "#1f1f1f", cursor: current === 0 ? "not-allowed" : "pointer" }}
            >
              <ChevronLeft className="h-7 w-7" strokeWidth={2.75} />
            </button>
            <button
              type="button"
              aria-label="Next question"
              disabled={current === slots.length - 1}
              onClick={() => goTo(current + 1)}
              className="pointer-events-auto grid h-12 w-14 place-items-center rounded text-white shadow-md transition"
              style={{
                background: current === slots.length - 1 ? "#c9c9c9" : "#1f1f1f",
                cursor: current === slots.length - 1 ? "not-allowed" : "pointer",
              }}
            >
              <ChevronRight className="h-7 w-7" strokeWidth={2.75} />
            </button>
          </div>
        </div>

        {/* ======================= Part navigation ======================== */}
        <nav
          className="flex select-none items-stretch border-t"
          style={{ background: bw ? "#ffffff" : theme.chromeNavBg, borderColor: theme.chromeBorder }}
        >
          <div className="flex flex-1 items-stretch justify-between gap-3 px-3">
            {test.parts.map((p, partIndex) => {
              const total = readingPartQuestionCount(p);
              const answered = answeredInPart(partIndex);
              const complete = answered >= total;
              const active = partIndex === activePartIndex;
              const segGray = bw ? "#d9d9d9" : "#444444";
              const partSlots = slots
                .map((s, i) => ({ slot: s, index: i }))
                .filter((e) => e.slot.partIndex === partIndex);

              if (!active) {
                return (
                  <button
                    key={p.number}
                    type="button"
                    onClick={() => goTo(partSlots[0].index)}
                    className="flex flex-1 flex-col items-stretch pb-2.5 pt-0"
                    style={{ color: theme.chromeFg }}
                  >
                    {/* Collapsed parts: full green only when complete, else grey. */}
                    <span
                      aria-hidden
                      className="h-[5px] w-full rounded-full"
                      style={{ background: complete ? "#2f9e44" : segGray }}
                    />
                    <span className="mt-2 flex items-center justify-center gap-3">
                      {complete && <Check className="h-5 w-5 text-[#2f9e44]" strokeWidth={3} />}
                      <span className="text-[15px] font-bold">Part {p.number}</span>
                      {!complete && (
                        <span className="text-[15px]" style={{ color: theme.muted }}>
                          {answered} of {total}
                        </span>
                      )}
                    </span>
                  </button>
                );
              }

              return (
                <div key={p.number} className="flex items-stretch gap-2" style={{ color: theme.chromeFg }}>
                  <div className="flex flex-col items-stretch">
                    {/* Green as soon as any question in this part is answered. */}
                    <span
                      aria-hidden
                      className="h-[5px] w-full rounded-full"
                      style={{ background: answered > 0 ? "#2f9e44" : segGray }}
                    />
                    <span className="mt-1.5 flex flex-1 items-center gap-2 whitespace-nowrap pb-2">
                      {complete && <Check className="h-5 w-5 text-[#2f9e44]" strokeWidth={3} />}
                      <span className="text-[15px] font-bold">Part {p.number}</span>
                    </span>
                  </div>
                  <div className="flex items-stretch gap-1">
                    {partSlots.map(({ slot, index }) => {
                      const isCurrent = index === current;
                      const answeredSlot = isSlotAnswered(index);
                      const pair = slot.numbers.length > 1;
                      const label = pair ? `${slot.numbers[0]}–${slot.numbers[slot.numbers.length - 1]}` : String(slot.numbers[0]);
                      return (
                        <button key={slot.numbers[0]} type="button" onClick={() => goTo(index)} className="flex flex-col items-center">
                          <span
                            aria-hidden
                            className="h-[5px] w-full self-stretch rounded-full"
                            style={{ background: answeredSlot ? "#2f9e44" : segGray }}
                          />
                          <span
                            className="mt-1 grid h-7 place-items-center rounded-[3px] text-[15px] leading-none"
                            style={{
                              minWidth: pair ? 48 : 27,
                              border: `2px solid ${isCurrent ? "#4a90d2" : "transparent"}`,
                              padding: "0 3px",
                              fontWeight: isCurrent ? 700 : 400,
                            }}
                          >
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            aria-label="Finish test"
            onClick={() => setFinishOpen(true)}
            className="grid w-16 place-items-center transition hover:opacity-80"
            style={{ background: bw ? "#e9e9e9" : theme.chromeStatusBg, color: theme.chromeFg }}
          >
            <Check className="h-6 w-6" strokeWidth={3} />
          </button>
        </nav>

        {/* ======================== Status bar (F9) ======================= */}
        <StatusBar theme={theme} bw={bw} />
        </div>

        {/* ======================== Notes panel =========================== */}
        {notesOpen && (
          <NotesPanel
            notes={noteCards}
            focusLinkId={focusNoteLink}
            onChange={changeNote}
            onDelete={deleteNote}
            onClose={() => setNotesOpen(false)}
          />
        )}

        {/* ===================== Options window (F2) ====================== */}
        {optionsOpen && (
          <OptionsScreen
            theme={theme}
            themeKey={themeKey}
            sizeKey={sizeKey}
            onTheme={setThemeKey}
            onSize={setSizeKey}
            onClose={() => setOptionsOpen(false)}
            onSubmission={() => {
              setOptionsOpen(false);
              setFinishOpen(true);
            }}
          />
        )}

        {/* ================ Selection toolbar (Highlight / Note) ========== */}
        {selToolbar && (
          <SelectionToolbar
            x={selToolbar.x}
            y={selToolbar.y}
            onHighlight={applyHighlight}
            onNote={createNote}
          />
        )}
        {hlPopover && (
          <HighlightPopover
            x={hlPopover.x}
            y={hlPopover.y}
            onDelete={() => {
              setHighlights((hs) => removeHighlight(hs, hlPopover));
              setHlPopover(null);
            }}
          />
        )}

        {/* ============ Practice-mode dictionary (right-click) ============ */}
        {ctxMenu && (
          <div
            data-exam-pop
            className="fixed z-[330] w-80 rounded-lg border bg-white p-1 shadow-xl"
            style={{ left: ctxMenu.x, top: ctxMenu.y, borderColor: "#cfcfcf", colorScheme: "light" }}
          >
            <button
              type="button"
              onClick={() => lookupWord(ctxMenu.word)}
              className="w-full rounded px-3 py-2 text-left text-[15px] font-medium text-[#1f1f1f] transition hover:bg-[#f2f2f2]"
            >
              See the meaning of “{ctxMenu.word}” — explanation &amp; synonyms
            </button>
            <p className="px-3 pb-2 pt-1 text-[12px] italic text-[#888]">
              This option won&apos;t be available in your real test.
            </p>
          </div>
        )}
        {dict && (
          <div
            data-exam-pop
            className="fixed left-1/2 top-24 z-[330] w-[420px] max-w-[92vw] -translate-x-1/2 rounded-lg border bg-white p-4 shadow-2xl"
            style={{ borderColor: "#cfcfcf", colorScheme: "light" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[18px] font-bold text-[#1f1f1f]">{dict.word}</p>
              <button type="button" aria-label="Close dictionary" onClick={() => setDict(null)} className="text-[#555]">
                ✕
              </button>
            </div>
            {dict.status === "loading" && <p className="mt-2 text-[14px] text-[#555]">Looking up…</p>}
            {dict.status === "error" && (
              <p className="mt-2 text-[14px] text-[#555]">
                No definition found — you may be offline, or the word isn&apos;t in the dictionary.
              </p>
            )}
            {dict.status === "done" && (
              <>
                <ul className="mt-2 space-y-1.5">
                  {dict.entries.map((en, i) => (
                    <li key={i} className="text-[14px] leading-snug text-[#1f1f1f]">
                      <span className="italic text-[#777]">{en.partOfSpeech}</span> — {en.definition}
                    </li>
                  ))}
                </ul>
                {dict.synonyms.length > 0 && (
                  <p className="mt-2 text-[14px] text-[#1f1f1f]">
                    <span className="font-bold">Synonyms:</span> {dict.synonyms.join(", ")}
                  </p>
                )}
              </>
            )}
            <p className="mt-3 border-t border-[#eee] pt-2 text-[12px] italic text-[#888]">
              This option won&apos;t be available in your real test.
            </p>
          </div>
        )}

        {/* ======================== Finish dialog ========================= */}
        {finishOpen && (
          <div className="fixed inset-0 z-[340] grid place-items-center bg-black/40 p-4">
            <div
              className="w-[440px] max-w-full rounded-lg border p-6 shadow-2xl"
              style={{ background: theme.contentBg, borderColor: theme.border, color: theme.fg }}
            >
              <h3 className="text-lg font-bold">Finish the Reading test?</h3>
              <p className="mt-1 text-sm" style={{ color: theme.muted }}>
                You have answered {totalAnswered} of {totalQuestions} questions. You can still
                review your answers afterwards.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFinishOpen(false)}
                  className="rounded border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: theme.border, color: theme.fg }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFinishOpen(false);
                    setFinished(true);
                  }}
                  className="rounded bg-[#1f1f1f] px-5 py-2 text-sm font-medium text-white hover:bg-black"
                >
                  Finish test
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ExamHLCtx.Provider>
  );
}

// ============================================================================
// Shared prop bag for the renderers below
// ============================================================================

type GroupProps = {
  answers: Answers;
  multi: MultiAnswers;
  setAnswer: (n: number, v: string) => void;
  toggleMulti: (start: number, option: string, max: number) => void;
  dropOnGap: (gap: number, p: DragPayload) => void;
  registerGap: (n: number, el: HTMLElement | null) => void;
  currentNumbers: number[];
  onFocusQuestion: (n: number) => void;
  hoverGap: number | null;
  setHoverGap: (n: number | null) => void;
  bw: boolean;
};

/** Bold, boxed question-number label ("1", or "22–23" for a joint pair). */
function NumberLabel({ label, current }: { label: string; current: boolean }) {
  const { theme } = useExamHL();
  return (
    <span
      className="mr-2 inline-flex h-8 shrink-0 items-center justify-center rounded-[2px] px-1.5 font-bold"
      style={{ border: `1.5px solid ${current ? theme.accent : "transparent"}`, minWidth: 32 }}
    >
      {label}
    </span>
  );
}

// ============================= Passage pane =================================

function PassageView({
  part,
  headingsGroup,
  ...props
}: GroupProps & { part: ReadingPart; headingsGroup?: ReadingHeadingsGroup }) {
  const base = `p${part.number}-passage`;
  return (
    <div className="mt-2">
      <h2 className="text-[1.2em] font-bold">
        <HL id={`${base}-title`} text={part.passageTitle} />
      </h2>
      {part.sections.map((section, si) => (
        <div key={si}>
          {section.gap !== undefined && headingsGroup && (
            <HeadingGap n={section.gap} group={headingsGroup} {...props} />
          )}
          {section.paras.map((para, pi) => (
            <p key={pi} className="mt-5 leading-relaxed">
              <HL id={`${base}-s${si}-p${pi}`} text={para} />
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Droppable heading slot inside the passage. */
function HeadingGap({
  n,
  group,
  answers,
  dropOnGap,
  registerGap,
  currentNumbers,
  onFocusQuestion,
  setAnswer,
  hoverGap,
  setHoverGap,
}: GroupProps & { n: number; group: ReadingHeadingsGroup }) {
  const { theme } = useExamHL();
  const groupId = `headings-${group.range[0]}`;
  const value = answers[n];
  const isCurrent = currentNumbers.includes(n);
  const hovered = hoverGap === n;

  return (
    <div
      ref={(el) => registerGap(n, el)}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setHoverGap(n);
      }}
      onDragLeave={() => setHoverGap(null)}
      onDrop={(e) => {
        e.preventDefault();
        setHoverGap(null);
        const p = getDragPayload(e);
        if (p && p.groupId === groupId) dropOnGap(n, p);
      }}
      onClick={() => {
        if (value) setAnswer(n, "");
        onFocusQuestion(n);
      }}
      draggable={!!value}
      onDragStart={(e) => {
        if (value) setDragPayload(e, { option: value, fromGap: n, groupId, range: group.range });
      }}
      title={value ? "Click to remove, or drag to another gap" : undefined}
      className={`mt-5 flex min-h-[32px] items-center justify-center rounded-[4px] px-3 py-1 ${value ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={{
        border: `${value ? 1.5 : 2}px ${value ? "solid" : "dashed"} ${
          hovered ? theme.accent : value || isCurrent ? "#7aa7d9" : "#9ec1e0"
        }`,
        background: hovered ? theme.accentSoftBg : theme.inputBg,
        color: theme.inputFg,
      }}
    >
      {value ? <span className="text-center font-bold">{value}</span> : <span className="font-bold">{n}</span>}
    </div>
  );
}

// ============================ Questions pane ================================

function GroupView(props: GroupProps & { group: ReadingGroup }) {
  const { group } = props;
  const [a, b] = group.range;
  return (
    <section className="mb-10 mt-2">
      <h3 className="text-[17px] font-bold">
        Questions {a}{b > a ? `–${b}` : ""}
      </h3>
      {group.kind === "tfng" && <TfngView {...props} group={group} />}
      {group.kind === "notes" && <NotesView {...props} group={group} />}
      {group.kind === "summary" && <SummaryView {...props} group={group} />}
      {group.kind === "headings" && <HeadingsListView {...props} group={group} />}
      {group.kind === "mcq-multi-set" && <McqMultiSetView {...props} group={group} />}
      {group.kind === "mcq" && <McqView {...props} group={group} />}
      {group.kind === "pasted" && <RPastedView {...props} group={group} />}
      {group.kind === "table" && <RTableView {...props} group={group} />}
      {group.kind === "flowchart" && <RFlowchartView {...props} group={group} />}
    </section>
  );
}

// ------------------- teacher-authored: pasted content ------------------------

function RPastedView(props: GroupProps & { group: ReadingPastedGroup }) {
  const { group, answers } = props;
  const groupId = `pasted-${group.range[0]}`;
  const used = group.options ? usedOptions(answers, group.range) : [];
  return (
    <div>
      {group.instructions && (
        <p className="mt-2 leading-relaxed">
          <HL id={`${groupId}-instr`} text={group.instructions} />
        </p>
      )}
      {group.title && (
        <p className="mt-4 text-[17px] font-bold">
          <HL id={`${groupId}-title`} text={group.title} />
        </p>
      )}
      {group.options && <HelpLink />}
      <div className="mt-2 flex gap-8">
        <div className="min-w-0 flex-1">
          {group.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.imageUrl}
              alt="Question illustration"
              className="mb-4 h-auto max-h-[440px] w-auto max-w-full rounded border"
              style={{ borderColor: "#9a9a9a" }}
            />
          )}
          {group.html ? (
            <RichPasted
              html={group.html}
              answers={props.answers}
              setAnswer={props.setAnswer}
              registerGap={props.registerGap}
              currentNumbers={props.currentNumbers}
              onFocusQuestion={props.onFocusQuestion}
            />
          ) : (
            <div className="space-y-5">
              {group.paras.map((para, pi) => (
                <p key={pi} className="leading-[2.1]">
                  {para.map((seg, i) =>
                    "text" in seg ? (
                      <HL key={i} id={`${groupId}-p${pi}-s${i}`} text={seg.text} />
                    ) : group.options ? (
                      <DropGap key={i} n={seg.gap} groupId={groupId} range={group.range} {...props} />
                    ) : (
                      <GapInput key={i} n={seg.gap} {...props} />
                    ),
                  )}
                </p>
              ))}
            </div>
          )}
        </div>
        {group.options && (
          <OptionBank
            groupId={groupId}
            options={group.options}
            used={used}
            setAnswer={props.setAnswer}
            range={group.range}
            bold
          />
        )}
      </div>
    </div>
  );
}

// ---------------- teacher-authored: option selection table -------------------

function RTableView(props: GroupProps & { group: ReadingTableGroup }) {
  const { group, answers, setAnswer, registerGap, currentNumbers, onFocusQuestion, bw } = props;
  const { theme } = useExamHL();
  const base = `table-${group.range[0]}`;
  const headBg = bw ? "#f0f0f0" : theme.panelBg;
  return (
    <div>
      {group.instructions && (
        <p className="mt-2 leading-relaxed">
          <HL id={`${base}-instr`} text={group.instructions} />
        </p>
      )}
      <div className="mt-4 w-fit max-w-full overflow-x-auto rounded-xl border" style={{ borderColor: theme.inputBorder }}>
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="border-b border-r px-4 py-3" style={{ borderColor: theme.inputBorder, background: headBg }} />
              {group.cols.map((c) => (
                <th
                  key={c}
                  className="border-b px-4 py-3 text-center font-bold"
                  style={{ borderColor: theme.inputBorder, background: headBg }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row, ri) => {
              const n = group.range[0] + ri;
              const isCurrent = currentNumbers.includes(n);
              return (
                <tr key={n} ref={(el) => registerGap(n, el)}>
                  <td className="border-t border-r px-3 py-3" style={{ borderColor: theme.inputBorder }}>
                    <span
                      className="mr-2 inline-flex h-7 items-center justify-center rounded-[2px] px-1.5 font-bold"
                      style={{ border: `1.5px solid ${isCurrent ? theme.accent : "transparent"}`, minWidth: 30 }}
                    >
                      {n}
                    </span>
                    <HL id={`${base}-r${ri}`} text={row} />
                  </td>
                  {group.cols.map((c) => (
                    <td key={c} className="border-t px-4 py-3 text-center" style={{ borderColor: theme.inputBorder }}>
                      <input
                        type="radio"
                        name={`q-${n}`}
                        checked={answers[n] === c}
                        onChange={() => {
                          setAnswer(n, c);
                          onFocusQuestion(n);
                        }}
                        className="h-[17px] w-[17px] cursor-pointer"
                        style={{ accentColor: theme.accent }}
                        aria-label={`Question ${n}: ${c}`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------- teacher-authored: flowchart -----------------------------

function RFlowchartView(props: GroupProps & { group: ReadingFlowchartGroup }) {
  const { group, answers, bw } = props;
  const { theme } = useExamHL();
  const groupId = `flow-${group.range[0]}`;
  const used = usedOptions(answers, group.range);
  return (
    <div>
      {group.instruction && (
        <p className="mt-2">
          <HL id={`${groupId}-instr`} text={group.instruction} />
        </p>
      )}
      <HelpLink />
      <div className="mt-1 flex gap-10">
        <div className="max-w-[600px] flex-1">
          {group.title && (
            <p className="mb-3 text-center text-[17px] font-bold">
              <HL id={`${groupId}-title`} text={group.title} />
            </p>
          )}
          {group.steps.map((step, si) => (
            <div key={si}>
              {si > 0 && (
                <div className="flex justify-center py-0.5">
                  <svg width="20" height="24" viewBox="0 0 20 24" aria-hidden>
                    <path d="M8 0h4v12h5l-7 11-7-11h5z" fill={theme.fg} />
                  </svg>
                </div>
              )}
              <div className="px-3 py-2.5 leading-relaxed" style={{ border: `1.5px solid ${bw ? "#333" : theme.border}` }}>
                {step.map((seg, i) =>
                  "text" in seg ? (
                    <HL key={i} id={`${groupId}-s${si}-t${i}`} text={seg.text} />
                  ) : (
                    <DropGap key={i} n={seg.gap} groupId={groupId} range={group.range} dashed {...props} />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
        <OptionBank
          groupId={groupId}
          options={group.options}
          used={used}
          setAnswer={props.setAnswer}
          range={group.range}
          bold
        />
      </div>
    </div>
  );
}

// ------------------------------ typed answer box ----------------------------

function GapInput({
  n,
  answers,
  setAnswer,
  registerGap,
  currentNumbers,
  onFocusQuestion,
}: Pick<GroupProps, "answers" | "setAnswer" | "registerGap" | "currentNumbers" | "onFocusQuestion"> & { n: number }) {
  const { theme } = useExamHL();
  const isCurrent = currentNumbers.includes(n);
  return (
    <input
      ref={(el) => registerGap(n, el)}
      type="text"
      value={answers[n] ?? ""}
      placeholder={String(n)}
      onChange={(e) => setAnswer(n, e.target.value)}
      onFocus={() => onFocusQuestion(n)}
      autoComplete="off"
      spellCheck={false}
      className="wmd-gap-input mx-1 inline-block h-[32px] rounded-[3px] px-2 align-middle outline-none transition-[width] duration-100"
      style={{
        background: theme.inputBg,
        color: theme.inputFg,
        border: `${isCurrent ? 2 : 1}px solid ${isCurrent ? theme.accent : theme.inputBorder}`,
        fontSize: "0.95em",
        // Grows with the answer so long answers stay fully visible; the
        // surrounding text reflows around the wider box.
        width: gapInputWidth(answers[n]),
      }}
    />
  );
}

function Segs({
  segs,
  blockId,
  ...rest
}: Pick<GroupProps, "answers" | "setAnswer" | "registerGap" | "currentNumbers" | "onFocusQuestion"> & {
  segs: Seg[];
  blockId: string;
}) {
  return (
    <>
      {segs.map((seg, i) =>
        "text" in seg ? <HL key={i} id={`${blockId}-s${i}`} text={seg.text} /> : <GapInput key={i} n={seg.gap} {...rest} />,
      )}
    </>
  );
}

// ------------------------- TRUE/FALSE + YES/NO groups ------------------------

function TfngView(props: GroupProps & { group: ReadingTfngGroup }) {
  const { group, answers, setAnswer, registerGap, currentNumbers, onFocusQuestion } = props;
  const { theme } = useExamHL();
  const base = `tfng-${group.range[0]}`;
  const opts = group.variant === "tf" ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"];
  const [w1, w2, w3] = opts;
  return (
    <div>
      <p className="mt-2 leading-relaxed">
        <HL id={`${base}-i0`} text="Choose " />
        <strong>{w1}</strong>
        <HL
          id={`${base}-i1`}
          text={` if the statement agrees with the ${group.variant === "tf" ? "information given in" : "views of the writer of"} the text, choose `}
        />
        <strong>{w2}</strong>
        <HL
          id={`${base}-i2`}
          text={` if the statement contradicts the ${group.variant === "tf" ? "information" : "views of the writer"}, or choose `}
        />
        <strong>{w3}</strong>
        <HL
          id={`${base}-i3`}
          text={` if there is no information on this${group.variant === "yn" ? " or it is impossible to say what the writer thinks" : ""}.`}
        />
      </p>
      <div className="mt-5 space-y-8">
        {group.statements.map((statement, i) => {
          const n = group.range[0] + i;
          const isCurrent = currentNumbers.includes(n);
          return (
            <div key={n} ref={(el) => registerGap(n, el)}>
              <p className="flex items-start leading-relaxed">
                <NumberLabel label={String(n)} current={isCurrent} />
                <HL id={`${base}-q${n}`} text={statement} />
              </p>
              <div className="mt-4 space-y-4 pl-10">
                {opts.map((opt) => {
                  const checked = answers[n] === opt;
                  return (
                    <label key={opt} className="flex cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        name={`q-${n}`}
                        checked={checked}
                        onChange={() => {
                          setAnswer(n, opt);
                          onFocusQuestion(n);
                        }}
                        className="h-[17px] w-[17px] shrink-0"
                        style={{ accentColor: theme.accent }}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------- notes & summary ------------------------------

function NotesView(props: GroupProps & { group: ReadingNotesGroup }) {
  const { group } = props;
  const base = `notes-${group.range[0]}`;
  return (
    <div>
      <p className="mt-2">
        <HL id={`${base}-instr-a`} text="Complete the notes. Write " />
        <strong>
          <HL id={`${base}-instr-b`} text={group.constraint} />
        </strong>
        <HL id={`${base}-instr-c`} text=" from the text for each answer." />
      </p>
      {group.title && (
        <p className="mt-5 text-[17px] font-bold">
          <HL id={`${base}-title`} text={group.title} />
        </p>
      )}
      <ul className="mt-4 list-disc space-y-5 pl-6">
        {group.bullets.map((line, li) => (
          <li key={li} className="leading-relaxed">
            <Segs segs={line} blockId={`${base}-l${li}`} {...props} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryView(props: GroupProps & { group: ReadingSummaryGroup }) {
  const { group } = props;
  const base = `summary-${group.range[0]}`;
  return (
    <div>
      <p className="mt-2">
        <HL id={`${base}-instr-a`} text="Complete the summary. Write " />
        <strong>
          <HL id={`${base}-instr-b`} text={group.constraint} />
        </strong>
        <HL id={`${base}-instr-c`} text=" from the text for each answer." />
      </p>
      <div className="mt-5 space-y-6">
        {group.paras.map((para, pi) => (
          <p key={pi} className="leading-[2.1]">
            <Segs segs={para} blockId={`${base}-p${pi}`} {...props} />
          </p>
        ))}
      </div>
    </div>
  );
}

// --------------------------- headings list (bank) ---------------------------

function HeadingsListView(props: GroupProps & { group: ReadingHeadingsGroup }) {
  const { group, answers, setAnswer } = props;
  const { theme } = useExamHL();
  const groupId = `headings-${group.range[0]}`;
  const used: string[] = [];
  for (let n = group.range[0]; n <= group.range[1]; n++) if (answers[n]) used.push(answers[n]);

  return (
    <div>
      <p className="mt-2 leading-relaxed">
        <HL
          id={`${groupId}-instr`}
          text="The text has five sections. Choose the correct heading for each section and move it into the gap."
        />
      </p>
      <p className="mt-5 font-bold">
        <HL id={`${groupId}-lh`} text="List of Headings" />
      </p>
      <div
        className="mt-4 flex flex-col items-start gap-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          // Dragging a placed heading back to the list undoes it.
          const p = getDragPayload(e);
          if (p && p.groupId === groupId && p.fromGap !== null) {
            e.preventDefault();
            setAnswer(p.fromGap, "");
          }
        }}
      >
        {group.options.map((option) => {
          const isUsed = used.includes(option);
          return (
            <span
              key={option}
              draggable={!isUsed}
              onDragStart={(e) => {
                if (!isUsed) setDragPayload(e, { option, fromGap: null, groupId, range: group.range });
              }}
              className={`inline-block rounded-[6px] border px-3 py-1 font-bold leading-snug ${
                isUsed ? "" : "cursor-grab select-none active:cursor-grabbing"
              }`}
              style={
                isUsed
                  ? { borderColor: "#c9d8e8", color: "#9a9a9a", background: theme.inputBg }
                  : { borderColor: theme.inputBorder, color: theme.inputFg, background: theme.inputBg }
              }
            >
              {option}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------ multiple choice ------------------------------

function StemWithTwo({ stem, blockId }: { stem: string; blockId: string }) {
  const idx = stem.indexOf("TWO");
  if (idx === -1) return <HL id={blockId} text={stem} />;
  return (
    <>
      <HL id={`${blockId}-a`} text={stem.slice(0, idx)} />
      <strong>TWO</strong>
      <HL id={`${blockId}-b`} text={stem.slice(idx + 3)} />
    </>
  );
}

function McqMultiSetView(props: GroupProps & { group: ReadingMcqMultiSetGroup }) {
  const { group, multi, toggleMulti, registerGap, currentNumbers, onFocusQuestion } = props;
  const { theme } = useExamHL();
  const base = `mcqm-${group.range[0]}`;
  return (
    <div>
      <p className="mt-2">
        <HL id={`${base}-instr-a`} text="Choose " />
        <strong>TWO</strong>
        <HL id={`${base}-instr-b`} text=" correct answers." />
      </p>
      <div className="mt-6 space-y-10">
        {group.items.map((item) => {
          const start = item.range[0];
          const max = item.range[1] - item.range[0] + 1;
          const selected = multi[start] ?? [];
          const isCurrent = currentNumbers.includes(start);
          const label = `${item.range[0]}–${item.range[1]}`;
          return (
            <div key={start} ref={(el) => registerGap(start, el)}>
              <p className="flex items-start leading-relaxed">
                <NumberLabel label={label} current={isCurrent} />
                <span>
                  <StemWithTwo stem={item.stem} blockId={`${base}-q${start}-stem`} />
                </span>
              </p>
              <div className="mt-3 space-y-2.5 pl-10">
                {item.options.map((opt, oi) => {
                  const checked = selected.includes(opt);
                  const locked = !checked && selected.length >= max;
                  return (
                    <label
                      key={oi}
                      className="flex items-center gap-3 rounded px-2 py-1.5"
                      style={{
                        background: checked ? theme.accentSoftBg : "transparent",
                        cursor: locked ? "not-allowed" : "pointer",
                        opacity: locked ? 0.55 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          toggleMulti(start, opt, max);
                          onFocusQuestion(start);
                        }}
                        className="h-[17px] w-[17px] shrink-0"
                        style={{ accentColor: theme.accent }}
                      />
                      <HL id={`${base}-q${start}-o${oi}`} text={opt} />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function McqView(props: GroupProps & { group: ReadingMcqGroup }) {
  const { group, answers, setAnswer, registerGap, currentNumbers, onFocusQuestion } = props;
  const { theme } = useExamHL();
  const base = `mcq-${group.range[0]}`;
  return (
    <div>
      <p className="mt-2">
        <HL id={`${base}-instr`} text="Choose the correct answer." />
      </p>
      <div className="mt-6 space-y-9">
        {group.questions.map((q) => {
          const isCurrent = currentNumbers.includes(q.number);
          return (
            <div key={q.number} ref={(el) => registerGap(q.number, el)}>
              <p className="flex items-start leading-relaxed">
                <NumberLabel label={String(q.number)} current={isCurrent} />
                <HL id={`${base}-q${q.number}-stem`} text={q.stem} />
              </p>
              <div className="mt-4 space-y-4 pl-10">
                {q.options.map((opt, oi) => {
                  const checked = answers[q.number] === opt;
                  return (
                    <label key={oi} className="flex cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        name={`q-${q.number}`}
                        checked={checked}
                        onChange={() => {
                          setAnswer(q.number, opt);
                          onFocusQuestion(q.number);
                        }}
                        className="h-[17px] w-[17px] shrink-0"
                        style={{ accentColor: theme.accent }}
                      />
                      <HL id={`${base}-q${q.number}-o${oi}`} text={opt} />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
