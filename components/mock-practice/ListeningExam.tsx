"use client";

// Full-screen IELTS computer-delivered Listening test interface for the
// Mock Practice section, modelled on the official Inspera player:
//
//  - top bar: IELTS logotype, "Test taker ID" + "Audio is Playing", status icons
//  - one scrollable screen per part, typed gaps + drag-and-drop answers
//  - floating black prev/next arrows
//  - bottom part navigation: the active part expands into question numbers
//    (current number boxed, answered numbers get a green underline segment);
//    inactive parts collapse to "✔ Part N" when complete or "x of 10" when not;
//    a two-answer MCQ shares one joint numbered slot
//  - text highlighting with a "Delete highlight" popover on click
//    (maroon/white in black-on-white contrast mode, per the official test)

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { SIZE_PX, THEMES, type SizeKey, type ThemeKey } from "@/lib/exam-theme";
import {
  buildHighlights,
  DragChip,
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
  buildSlots,
  partQuestionCount,
  scoreListening,
  type AnswerKey,
  type ListeningGroup,
  type ListeningTest,
  type MapDragGroup,
  type MatchDragGroup,
  type McqGroup,
  type McqMultiGroup,
  type FlowchartGroup,
  type NotesGroup,
  type PastedGroup,
  type TableGroup,
  type Seg,
} from "@/lib/listening-mock";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  FastForward,
  Menu,
  Pause,
  Play,
  Rewind,
  SquarePen,
  Volume2,
  Wifi,
} from "lucide-react";

export const listeningStorageKey = (userId: string, testId: string) =>
  `wise-mans-doctrine:mock-practice:listening:${testId}:${userId}`;

// ============================================================================
// Main component
// ============================================================================

export type ExamMode = "real" | "practice";

export type ListeningExamProps = {
  test: ListeningTest;
  userId: string;
  mode: ExamMode;
  /** Teacher answer key — when present, the finish screen shows a score. */
  answerKey?: AnswerKey;
  /** Called when the taker saves & exits from the finish screen. */
  onExit: () => void;
};

type Answers = Record<number, string>;
type MultiAnswers = Record<number, string[]>;

/** Countdown fallback when the audio duration is unknown: 30-minute track. */
const FALLBACK_AUDIO_SEC = 30 * 60;
const SPEEDS = [0.75, 1, 1.25, 1.5];

export default function ListeningExam({ test, userId, mode, answerKey, onExit }: ListeningExamProps) {
  const storageKey = listeningStorageKey(userId, test.id);
  const booting = useExamBoot();
  const takerId = useTestTakerId();

  const [themeKey, setThemeKey] = useState<ThemeKey>("bw");
  const [sizeKey, setSizeKey] = useState<SizeKey>("regular");
  const theme = THEMES[themeKey];
  const bw = themeKey === "bw";

  const [answers, setAnswers] = useState<Answers>({});
  const [multi, setMulti] = useState<MultiAnswers>({});
  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState(0);
  const [finishOpen, setFinishOpen] = useState(false);
  const [finished, setFinished] = useState(false);

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [focusNoteLink, setFocusNoteLink] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<ExamHighlight[]>([]);
  const [selToolbar, setSelToolbar] = useState<{ pieces: SelectionPiece[]; text: string; x: number; y: number } | null>(null);
  const [hlPopover, setHlPopover] = useState<{ id: string; linkId?: string; x: number; y: number } | null>(null);
  const [hoverGap, setHoverGap] = useState<number | null>(null);

  // ------------------------- audio + real-mode timer ------------------------
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioDur, setAudioDur] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(70);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // Real mode: countdown = 2 minutes + the audio duration.
  useEffect(() => {
    if (mode !== "real" || secondsLeft !== null) return;
    if (audioDur !== null) {
      setSecondsLeft(120 + Math.ceil(audioDur));
    } else if (!test.audioSrc) {
      setSecondsLeft(120 + FALLBACK_AUDIO_SEC);
    } else {
      const t = setTimeout(
        () => setSecondsLeft((s) => (s === null ? 120 + FALLBACK_AUDIO_SEC : s)),
        2500,
      );
      return () => clearTimeout(t);
    }
  }, [mode, audioDur, secondsLeft, test.audioSrc]);

  useEffect(() => {
    if (mode !== "real") return;
    const t = setInterval(() => setSecondsLeft((s) => (s === null ? s : s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [mode]);

  // Real mode: the recording starts automatically (best effort — the browser
  // may require a gesture; the header controls stay hidden either way).
  useEffect(() => {
    if (mode !== "real") return;
    audioRef.current?.play().catch(() => {});
  }, [mode]);

  const minutesRemaining = secondsLeft === null ? null : Math.ceil(secondsLeft / 60);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };
  const skip = (delta: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = Math.max(0, el.currentTime + delta);
  };
  const cycleSpeed = () => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]);

  const slots = useMemo(() => buildSlots(test), [test]);
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

  const mainRef = useRef<HTMLDivElement>(null);

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
  // A test with no question slots (empty/misconfigured) falls through to the
  // "no questions" screen below — guard every slots[current] read so nothing
  // crashes before that check runs.
  const activePartIndex = slots[current]?.partIndex ?? 0;
  const part = test.parts[activePartIndex];

  const goTo = useCallback(
    (slotIdx: number) => setCurrent(Math.max(0, Math.min(slots.length - 1, slotIdx))),
    [slots.length],
  );

  // Scroll to (and focus) the current question whenever it changes.
  const lastScrolled = useRef(-1);
  useEffect(() => {
    if (lastScrolled.current === current) return;
    lastScrolled.current = current;
    const n = slots[current]?.numbers[0];
    if (n === undefined) return;
    requestAnimationFrame(() => {
      const el = gapEls.current.get(n);
      if (!el) return;
      if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [current, slots]);

  // ------------------------------- highlights -------------------------------
  const getHighlights = useCallback(
    (blockId: string) => highlights.filter((h) => h.blockId === blockId),
    [highlights],
  );

  const onClickHighlight = useCallback((h: ExamHighlight, rect: DOMRect) => {
    if (h.note !== undefined) {
      // Noted highlight → open its card in the Notes panel.
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

  // Close popovers on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest("[data-exam-pop]")) return;
      setSelToolbar(null);
      setHlPopover(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

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

  // Place a dragged option into a gap (clearing wherever it came from).
  const dropOnGap = useCallback(
    (gap: number, p: DragPayload) => {
      setAnswers((a) => {
        const next = { ...a };
        if (p.fromGap !== null) delete next[p.fromGap];
        // If this option already sits in another gap of the same group, clear it.
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

  const ctx = useMemo<ExamHLValue>(
    () => ({ theme, getHighlights, onClickHighlight }),
    [theme, getHighlights, onClickHighlight],
  );

  const totalAnswered = test.parts.reduce((s, _p, i) => s + answeredInPart(i), 0);
  const totalQuestions = test.parts.reduce((s, p) => s + partQuestionCount(p), 0);
  const score = answerKey ? scoreListening(test, answers, multi, answerKey) : null;

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
          <h2 className="mt-4 text-2xl font-bold">Listening test finished</h2>
          <p className="mt-2 text-sm" style={{ color: theme.muted }}>
            Your answers have been saved.
          </p>
          <div className="mt-5 space-y-1.5 text-left text-[15px]">
            {test.parts.map((p, i) => (
              <div key={p.number} className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: theme.border }}>
                <span className="font-bold">Part {p.number}</span>
                <span>
                  {answeredInPart(i)} of {partQuestionCount(p)} answered
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

  // This test has no question sections yet (e.g. previewed/opened before the
  // teacher added content) — nothing below this point is safe to render.
  if (slots.length === 0) {
    return (
      <div
        className="exam-surface fixed inset-0 z-[300] grid place-items-center"
        style={{ background: theme.pageBg, fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <div
          className="w-[460px] max-w-[92vw] rounded-lg border p-8 text-center shadow-xl"
          style={{ background: theme.contentBg, borderColor: theme.border, color: theme.fg }}
        >
          <h2 className="text-xl font-bold">No questions yet</h2>
          <p className="mt-2 text-sm" style={{ color: theme.muted }}>
            This listening test doesn&apos;t have any question sections yet.
          </p>
          <button
            type="button"
            onClick={onExit}
            className="mt-5 rounded bg-[#1f1f1f] px-5 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // ================================ exam view ===============================
  return (
    <ExamHLCtx.Provider value={ctx}>
      {/* z-[300] keeps the exam above app chrome such as the offline banner (z-[200]).
          color-scheme keeps native radios/checkboxes light on the white theme
          (the app root declares a dark color-scheme). */}
      <div
        onMouseUp={handleMouseUp}
        className="exam-surface fixed inset-0 z-[300] flex"
        style={{
          background: theme.pageBg,
          color: theme.fg,
          fontFamily: "Arial, Helvetica, sans-serif",
          colorScheme: bw ? "light" : "dark",
        }}
      >
        {/* Placeholder digits centred + bold inside empty answer boxes. */}
        <style>{`.wmd-gap-input::placeholder { color: currentColor; opacity: 1; font-weight: 700; text-align: center; }`}</style>

        {test.audioSrc && (
          <audio
            ref={audioRef}
            src={test.audioSrc}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d)) setAudioDur(d);
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
        {/* ============================ Top bar ============================ */}
        <header
          className="flex items-center justify-between border-b px-5 py-2"
          style={{ background: theme.chromeTopBg, borderColor: theme.chromeBorder }}
        >
          <div className="flex items-center gap-5">
            <span className="select-none text-[30px] font-black leading-none tracking-tight text-[#E31837]">
              IELTS<sup className="text-[11px] font-bold align-super">™</sup>
            </span>
            <div>
              <p className="text-[15px] font-bold leading-tight" style={{ color: theme.chromeFg }}>
                Test Taker ID: {takerId}
              </p>
              {mode === "real" ? (
                <p className="flex items-center gap-4 text-[13px] leading-tight" style={{ color: theme.chromeFg }}>
                  {minutesRemaining !== null && (
                    <span>
                      {minutesRemaining} {minutesRemaining === 1 ? "minute" : "minutes"} remaining
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Volume2 className="h-4 w-4" /> Audio is Playing
                  </span>
                </p>
              ) : (
                <div className="mt-0.5 flex items-center gap-1.5" style={{ color: theme.chromeFg }}>
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={!test.audioSrc}
                    aria-label={playing ? "Pause audio" : "Play audio"}
                    className="grid h-7 w-7 place-items-center rounded border transition hover:opacity-70 disabled:opacity-40"
                    style={{ borderColor: theme.chromeBorder }}
                  >
                    {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => skip(-10)}
                    disabled={!test.audioSrc}
                    aria-label="Back 10 seconds"
                    className="grid h-7 w-7 place-items-center rounded border transition hover:opacity-70 disabled:opacity-40"
                    style={{ borderColor: theme.chromeBorder }}
                  >
                    <Rewind className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => skip(10)}
                    disabled={!test.audioSrc}
                    aria-label="Forward 10 seconds"
                    className="grid h-7 w-7 place-items-center rounded border transition hover:opacity-70 disabled:opacity-40"
                    style={{ borderColor: theme.chromeBorder }}
                  >
                    <FastForward className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={cycleSpeed}
                    disabled={!test.audioSrc}
                    aria-label="Audio speed"
                    className="h-7 rounded border px-2 text-[12px] font-bold tabular-nums transition hover:opacity-70 disabled:opacity-40"
                    style={{ borderColor: theme.chromeBorder }}
                  >
                    {speed}x
                  </button>
                </div>
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
        <main
          ref={mainRef}
          className="scrollbar-none relative flex-1 overflow-y-auto"
          style={{ background: theme.contentBg, color: theme.fg, fontSize: SIZE_PX[sizeKey] }}
        >
          <div className="px-5 pb-24 pt-4">
            {/* Part header panel */}
            <div
              className="rounded border px-4 py-1.5"
              style={{ background: bw ? "#f0f0ea" : theme.panelBg, borderColor: theme.border }}
            >
              <p className="font-bold">Part {part.number}</p>
              <p className="mt-0">
                Listen and answer questions {part.groups[0].range[0]}–
                {part.groups[part.groups.length - 1].range[1]}.
              </p>
            </div>

            {part.groups.map((group) => (
              <GroupView
                key={`${part.number}-${group.range[0]}`}
                group={group}
                answers={answers}
                multi={multi}
                setAnswer={setAnswer}
                toggleMulti={toggleMulti}
                dropOnGap={dropOnGap}
                registerGap={registerGap}
                currentNumbers={slots[current].numbers}
                onFocusQuestion={(n) => {
                  const idx = slotIndexByNumber.get(n);
                  if (idx !== undefined) setCurrent(idx);
                }}
                hoverGap={hoverGap}
                setHoverGap={setHoverGap}
                bw={bw}
              />
            ))}
          </div>

          {/* Floating prev/next arrows */}
          <div className="pointer-events-none sticky bottom-6 flex justify-end pr-8">
            <div className="pointer-events-auto flex gap-2">
              <button
                type="button"
                aria-label="Previous question"
                disabled={current === 0}
                onClick={() => goTo(current - 1)}
                className="grid h-12 w-14 place-items-center rounded text-white shadow-md transition"
                style={{ background: current === 0 ? "#c9c9c9" : "#1f1f1f", cursor: current === 0 ? "not-allowed" : "pointer" }}
              >
                <ChevronLeft className="h-7 w-7" strokeWidth={2.75} />
              </button>
              <button
                type="button"
                aria-label="Next question"
                disabled={current === slots.length - 1}
                onClick={() => goTo(current + 1)}
                className="grid h-12 w-14 place-items-center rounded text-white shadow-md transition"
                style={{
                  background: current === slots.length - 1 ? "#c9c9c9" : "#1f1f1f",
                  cursor: current === slots.length - 1 ? "not-allowed" : "pointer",
                }}
              >
                <ChevronRight className="h-7 w-7" strokeWidth={2.75} />
              </button>
            </div>
          </div>
        </main>

        {/* ======================= Part navigation ======================== */}
        <nav
          className="flex select-none items-stretch border-t"
          style={{ background: bw ? "#ffffff" : theme.chromeNavBg, borderColor: theme.chromeBorder }}
        >
          <div className="flex flex-1 items-stretch justify-between gap-3 px-3">
            {test.parts.map((p, partIndex) => {
              const total = partQuestionCount(p);
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
                      return (
                        <button
                          key={slot.numbers[0]}
                          type="button"
                          onClick={() => goTo(index)}
                          className="flex flex-col items-center"
                        >
                          <span
                            aria-hidden
                            className="h-[5px] w-full self-stretch rounded-full"
                            style={{ background: answeredSlot ? "#2f9e44" : segGray }}
                          />
                          <span
                            className="mt-1 grid h-7 place-items-center rounded-[3px] text-[15px] leading-none"
                            style={{
                              minWidth: pair ? 44 : 27,
                              border: `2px solid ${isCurrent ? "#4a90d2" : "transparent"}`,
                              padding: "0 3px",
                              fontWeight: isCurrent ? 700 : 400,
                            }}
                          >
                            {pair ? slot.numbers.join(" ") : slot.numbers[0]}
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
        <StatusBar theme={theme} bw={bw} showVolume volume={volume} onVolume={setVolume} />
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

        {/* ================== Delete-highlight popover ==================== */}
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

        {/* ======================== Finish dialog ========================= */}
        {finishOpen && (
          <div className="fixed inset-0 z-[140] grid place-items-center bg-black/40 p-4">
            <div
              className="w-[440px] max-w-full rounded-lg border p-6 shadow-2xl"
              style={{ background: theme.contentBg, borderColor: theme.border, color: theme.fg }}
            >
              <h3 className="text-lg font-bold">Finish the Listening test?</h3>
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
// Group renderers
// ============================================================================

type GroupViewProps = {
  group: ListeningGroup;
  answers: Answers;
  multi: MultiAnswers;
  setAnswer: (n: number, value: string) => void;
  toggleMulti: (start: number, option: string, max: number) => void;
  dropOnGap: (gap: number, p: DragPayload) => void;
  registerGap: (n: number, el: HTMLElement | null) => void;
  currentNumbers: number[];
  onFocusQuestion: (n: number) => void;
  hoverGap: number | null;
  setHoverGap: (n: number | null) => void;
  bw: boolean;
};

function GroupView(props: GroupViewProps) {
  const { group } = props;
  const [a, b] = group.range;
  return (
    <section className="mt-6">
      <h3 className="text-[17px] font-bold">
        Questions {a}{b > a ? `–${b}` : ""}
      </h3>
      {group.kind === "notes" && <NotesView {...props} group={group} />}
      {group.kind === "match-drag" && <MatchDragView {...props} group={group} />}
      {group.kind === "map-drag" && <MapDragView {...props} group={group} />}
      {group.kind === "mcq" && <McqView {...props} group={group} />}
      {group.kind === "mcq-multi" && <McqMultiView {...props} group={group} />}
      {group.kind === "flowchart" && <FlowchartView {...props} group={group} />}
      {group.kind === "pasted" && <PastedView {...props} group={group} />}
      {group.kind === "table" && <TableView {...props} group={group} />}
    </section>
  );
}

// ------------------- teacher-authored: pasted content ------------------------

function PastedView(props: GroupViewProps & { group: PastedGroup }) {
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
      <div className="mt-2 flex gap-10">
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

function TableView(props: GroupViewProps & { group: TableGroup }) {
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
      <div className={`mt-4 ${group.imageUrl ? "flex flex-wrap items-start gap-16" : ""}`}>
        {group.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.imageUrl}
            alt="Map or plan to label"
            className="h-auto max-h-[520px] w-auto min-w-0 max-w-full flex-1 rounded border object-contain object-left-top"
            style={{ borderColor: "#9a9a9a", maxWidth: 560 }}
          />
        )}
      <div className="w-fit max-w-full shrink-0 overflow-x-auto rounded-xl border" style={{ borderColor: theme.inputBorder }}>
        <table className="border-collapse">
          <thead>
            <tr>
              <th
                className="border-b border-r px-4 py-3"
                style={{ borderColor: theme.inputBorder, background: headBg }}
              />
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
}: Pick<GroupViewProps, "answers" | "setAnswer" | "registerGap" | "currentNumbers" | "onFocusQuestion"> & {
  n: number;
}) {
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

function LineSegs({
  segs,
  blockId,
  ...rest
}: Pick<GroupViewProps, "answers" | "setAnswer" | "registerGap" | "currentNumbers" | "onFocusQuestion"> & {
  segs: Seg[];
  blockId: string;
}) {
  return (
    <>
      {segs.map((seg, i) =>
        "text" in seg ? (
          <HL key={i} id={`${blockId}-s${i}`} text={seg.text} />
        ) : (
          <GapInput key={i} n={seg.gap} {...rest} />
        ),
      )}
    </>
  );
}

// --------------------------------- notes ------------------------------------

function NotesView(props: GroupViewProps & { group: NotesGroup }) {
  const { group } = props;
  const base = `notes-${group.range[0]}`;
  return (
    <div>
      <p className="mt-2">
        <HL id={`${base}-instr-a`} text="Complete the notes. Write " />
        <strong>
          <HL id={`${base}-instr-b`} text={group.constraint} />
        </strong>
        <HL id={`${base}-instr-c`} text=" for each answer." />
      </p>
      {group.title && (
        <p className="mt-4 text-[17px] font-bold">
          <HL id={`${base}-title`} text={group.title} />
        </p>
      )}
      {group.heading && (
        <p className="mt-6 font-bold">
          <HL id={`${base}-heading`} text={group.heading} />
        </p>
      )}
      {group.bulleted ? (
        <ul className="mt-5 list-disc space-y-6 pl-7">
          {group.rows.flatMap((row, ri) =>
            row.lines.map((line, li) => (
              <li key={`${ri}-${li}`}>
                <LineSegs segs={line} blockId={`${base}-r${ri}-l${li}`} {...props} />
              </li>
            )),
          )}
        </ul>
      ) : (
        <div className="mt-4 space-y-8">
          {group.rows.map((row, ri) => (
            <div key={ri} className="flex gap-4">
              <div className="w-44 shrink-0">
                {row.label && <HL id={`${base}-r${ri}-label`} text={row.label} />}
              </div>
              <div className="flex-1 space-y-7">
                {row.lines.map((line, li) => (
                  <div key={li} className="flex items-center">
                    <span className="mr-3">-</span>
                    <span>
                      <LineSegs segs={line} blockId={`${base}-r${ri}-l${li}`} {...props} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// -------------------------------- matching ----------------------------------

function MatchDragView(props: GroupViewProps & { group: MatchDragGroup }) {
  const { group, answers } = props;
  const groupId = `match-${group.range[0]}`;
  const used = usedOptions(answers, group.range);
  return (
    <div>
      <p className="mt-2">
        <HL id={`${groupId}-instr`} text={group.instruction} />
      </p>
      {group.title && (
        <p className="mt-4 text-[17px] font-bold">
          <HL id={`${groupId}-title`} text={group.title} />
        </p>
      )}
      <HelpLink />
      <div className="mt-2 flex gap-16">
        <div className="max-w-[430px] flex-1 space-y-6">
          {group.items.map((item, i) => {
            const n = group.range[0] + i;
            return (
              <div key={n} className="flex items-center gap-3">
                <span className="min-w-[120px]">
                  <HL id={`${groupId}-item-${n}`} text={item} />
                </span>
                <DropGap n={n} groupId={groupId} range={group.range} {...props} />
              </div>
            );
          })}
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

// --------------------------------- map --------------------------------------

function MapDragView(props: GroupViewProps & { group: MapDragGroup }) {
  const { group, answers, bw } = props;
  const { theme } = useExamHL();
  const groupId = `map-${group.range[0]}`;
  const used = usedOptions(answers, group.range);
  return (
    <div>
      <p className="mt-2">
        <HL id={`${groupId}-instr`} text={group.instruction} />
      </p>
      <HelpLink />
      <div className="mt-2 flex gap-10">
        <div
          className="relative w-full max-w-[680px] shrink-0 border"
          style={{ height: group.height, borderColor: bw ? "#555" : theme.border, background: theme.contentBg }}
        >
          {group.boxes.map((box, i) =>
            box.gap ? (
              <div
                key={i}
                className="absolute"
                style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
              >
                <DropGap n={box.gap} groupId={groupId} range={group.range} fill {...props} />
              </div>
            ) : (
              <div
                key={i}
                className="absolute grid place-items-center p-1 text-center text-[13px] font-bold leading-tight"
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.w}%`,
                  height: `${box.h}%`,
                  border: `1.5px solid ${bw ? "#555" : theme.border}`,
                  color: theme.fg,
                }}
              >
                {box.label}
              </div>
            ),
          )}
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

// ------------------------------ multiple choice ------------------------------

function McqView(props: GroupViewProps & { group: McqGroup }) {
  const { group, answers, setAnswer, registerGap, currentNumbers, onFocusQuestion } = props;
  const { theme } = useExamHL();
  const groupId = `mcq-${group.range[0]}`;
  return (
    <div>
      <p className="mt-2">
        <HL id={`${groupId}-instr`} text={group.instruction} />
      </p>
      <div className="mt-4 space-y-7">
        {group.questions.map((q) => {
          const isCurrent = currentNumbers.includes(q.number);
          return (
            <div
              key={q.number}
              ref={(el) => registerGap(q.number, el)}
              className="rounded px-2 py-1"
              style={{ outline: isCurrent ? `2px solid ${theme.accent}` : "none", outlineOffset: 2 }}
            >
              <p>
                <strong className="mr-2">{q.number}</strong>
                <HL id={`${groupId}-q${q.number}-stem`} text={q.stem} />
              </p>
              <div className="mt-3 space-y-4 pl-7">
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
                      <HL id={`${groupId}-q${q.number}-o${oi}`} text={opt} />
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

function McqMultiView(props: GroupViewProps & { group: McqMultiGroup }) {
  const { group, multi, toggleMulti, registerGap, currentNumbers, onFocusQuestion } = props;
  const { theme } = useExamHL();
  const start = group.range[0];
  const max = group.range[1] - group.range[0] + 1;
  const groupId = `mcqm-${start}`;
  const selected = multi[start] ?? [];
  const isCurrent = currentNumbers.includes(start);
  return (
    <div>
      <p className="mt-2">
        <HL id={`${groupId}-instr`} text={group.instruction} />
      </p>
      <div
        ref={(el) => registerGap(start, el)}
        className="mt-4 rounded px-2 py-1"
        style={{ outline: isCurrent ? `2px solid ${theme.accent}` : "none", outlineOffset: 2 }}
      >
        <p>
          <strong className="mr-2">
            {group.range[0]}–{group.range[1]}
          </strong>
          <HL id={`${groupId}-stem`} text={group.stem} />
        </p>
        <div className="mt-3 space-y-2.5 pl-7">
          {group.options.map((opt, oi) => {
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
                <HL id={`${groupId}-o${oi}`} text={opt} />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------- flowchart -----------------------------------

function FlowchartView(props: GroupViewProps & { group: FlowchartGroup }) {
  const { group, answers, bw } = props;
  const { theme } = useExamHL();
  const groupId = `flow-${group.range[0]}`;
  const used = usedOptions(answers, group.range);
  return (
    <div>
      <p className="mt-2">
        <HL id={`${groupId}-instr`} text={group.instruction} />
      </p>
      <HelpLink />
      <div className="mt-1 flex gap-14">
        <div className="max-w-[600px] flex-1">
          <p className="mb-3 text-center text-[17px] font-bold">
            <HL id={`${groupId}-title`} text={group.title} />
          </p>
          {group.steps.map((step, si) => (
            <div key={si}>
              {si > 0 && (
                <div className="flex justify-center py-0.5">
                  <svg width="20" height="24" viewBox="0 0 20 24" aria-hidden>
                    <path d="M8 0h4v12h5l-7 11-7-11h5z" fill={theme.fg} />
                  </svg>
                </div>
              )}
              <div
                className="px-3 py-2.5 leading-relaxed"
                style={{ border: `1.5px solid ${bw ? "#333" : theme.border}` }}
              >
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

