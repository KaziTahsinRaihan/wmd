"use client";

// Full-screen IELTS computer-delivered Writing test interface for the Mock
// Practice section, modelled on the official Inspera player:
//
//  - top bar: IELTS logotype, "Test taker ID" + "<x> minutes remaining"
//    (60-minute countdown), status icons, settings (text size / contrast)
//  - two parts (Task 1 with chart, Task 2 essay), one screen per part
//  - "computer" mode: split view — question left, answer textarea right with a
//    live word count and a draggable divider between the panes
//  - "paper" mode: question only; the ✓ submit tile leads to an upload screen
//    with one picture slot per task
//  - select-to-highlight with a Note/Highlight toolbar (W6) and a
//    Delete Highlight popover on click (W7)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SIZE_PX, THEMES, type SizeKey, type ThemeKey } from "@/lib/exam-theme";
import {
  buildHighlights,
  ExamHLCtx,
  getSelectionPieces,
  HighlightPopover,
  HL,
  NotesPanel,
  OptionsScreen,
  removeHighlight,
  SelectionToolbar,
  StatusBar,
  TestLoadingScreen,
  useExamBoot,
  useTestTakerId,
  useExamHL,
  type ExamHighlight,
  type ExamHLValue,
  type NoteCard,
  type SelectionPiece,
} from "./exam-ui";
import { countWords, type BarChart, type WritingExam as WritingExamData, type WritingTask } from "@/lib/writing-exam";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Menu,
  MoveHorizontal,
  SquarePen,
  Wifi,
  X,
} from "lucide-react";

export type WritingMode = "computer" | "paper";
export type ExamMode = "real" | "practice";

export const writingStorageKey = (userId: string, examId: string) =>
  `wise-mans-doctrine:mock-practice:writing:${examId}:${userId}`;

export type WritingExamProps = {
  exam: WritingExamData;
  mode: WritingMode;
  /** "real" enforces the 60-minute timer; "practice" has no timer. */
  testMode: ExamMode;
  userId: string;
  onExit: () => void;
};

type Upload = { name: string; dataUrl: string };

export default function WritingExam({ exam, mode, testMode, userId, onExit }: WritingExamProps) {
  const storageKey = writingStorageKey(userId, exam.id);
  const paper = mode === "paper";
  const booting = useExamBoot();
  const takerId = useTestTakerId();

  const [themeKey, setThemeKey] = useState<ThemeKey>("bw");
  const [sizeKey, setSizeKey] = useState<SizeKey>("regular");
  const theme = THEMES[themeKey];
  const bw = themeKey === "bw";

  const tasks = useMemo(() => [exam.task1, exam.task2], [exam]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({ 1: "", 2: "" });
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"exam" | "upload" | "finished">("exam");
  const [finishOpen, setFinishOpen] = useState(false);
  const [uploads, setUploads] = useState<Record<number, Upload | undefined>>({});
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [focusNoteLink, setFocusNoteLink] = useState<string | null>(null);

  // 60-minute shared countdown (real test mode only).
  const [secondsLeft, setSecondsLeft] = useState(exam.durationMin * 60);
  useEffect(() => {
    if (testMode !== "real") return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [testMode]);
  const minutesRemaining = Math.ceil(secondsLeft / 60);

  // Split view: percentage width of the question pane (computer mode).
  const [leftPct, setLeftPct] = useState(50);
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
        if (data.answers) setAnswers({ 1: data.answers[1] ?? "", 2: data.answers[2] ?? "" });
      }
    } catch {
      /* start fresh */
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded || paper) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ answers }));
    } catch {
      /* quota — keep going in memory */
    }
  }, [answers, loaded, paper, storageKey]);

  const words = (taskNumber: number) => countWords(answers[taskNumber] ?? "");
  const partAnswered = (i: number) => (paper ? false : words(tasks[i].taskNumber) > 0);

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
      part: tasks[current].taskNumber,
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
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const ctx = useMemo<ExamHLValue>(
    () => ({ theme, getHighlights, onClickHighlight }),
    [theme, getHighlights, onClickHighlight],
  );

  const task = tasks[current];

  const onFilePicked = (taskNumber: number, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setUploads((u) => ({ ...u, [taskNumber]: { name: file.name, dataUrl: String(reader.result) } }));
    reader.readAsDataURL(file);
  };

  // ============================ pre-test boot ===============================
  if (booting) return <TestLoadingScreen />;

  // ============================== finished view =============================
  if (view === "finished") {
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
          <h2 className="mt-4 text-2xl font-bold">
            Writing test {paper ? "submitted" : "finished"}
          </h2>
          <p className="mt-2 text-sm" style={{ color: theme.muted }}>
            {paper ? "Your pictures have been submitted." : "Your answers have been saved."}
          </p>
          {paper ? (
            <div className="mt-5 flex justify-center gap-4">
              {[1, 2].map((n) => (
                <div key={n} className="text-left">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: theme.muted }}>
                    Task {n}
                  </p>
                  {uploads[n] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={uploads[n]!.dataUrl}
                      alt={`Task ${n} answer`}
                      className="h-24 w-32 rounded border object-cover"
                      style={{ borderColor: theme.border }}
                    />
                  ) : (
                    <p className="text-sm">—</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 space-y-1.5 text-left text-[15px]">
              {tasks.map((t) => (
                <div key={t.taskNumber} className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: theme.border }}>
                  <span className="font-bold">Task {t.taskNumber}</span>
                  <span>
                    {words(t.taskNumber)} words{" "}
                    <span style={{ color: theme.muted }}>(minimum {t.minWords})</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setView("exam")}
              className="rounded border px-4 py-2 text-sm font-medium"
              style={{ borderColor: theme.border, color: theme.fg }}
            >
              Review questions
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

  // ================================ shell ===================================
  return (
    <ExamHLCtx.Provider value={ctx}>
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
              {testMode === "real" && (
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
          {view === "upload" ? (
            <UploadView
              theme={theme}
              uploads={uploads}
              onPick={onFilePicked}
              onRemove={(n) => setUploads((u) => ({ ...u, [n]: undefined }))}
              onBack={() => setView("exam")}
              onSubmit={() => setView("finished")}
            />
          ) : (
            <main
              className={`flex min-h-0 flex-1 flex-col ${paper ? "scrollbar-none overflow-y-auto" : "overflow-hidden"}`}
              style={{ background: theme.contentBg, color: theme.fg, fontSize: SIZE_PX[sizeKey] }}
            >
              <div className="px-5 pt-4">
                <div
                  className="rounded border px-4 py-1.5"
                  style={{ background: bw ? "#f0f0ea" : theme.panelBg, borderColor: theme.border }}
                >
                  <p className="font-bold">Part {task.taskNumber}</p>
                  <p className="mt-0">
                    <HL id={`part-${task.taskNumber}-instr`} text={task.instruction} />
                  </p>
                </div>
              </div>

              {paper ? (
                <div className="max-w-[1200px] px-5 pb-28 pt-8">
                  <TaskPrompt task={task} />
                </div>
              ) : (
                <div ref={splitRef} className="flex min-h-0 flex-1 items-stretch px-5 pb-3 pt-6">
                  {/* Question pane */}
                  <div
                    className="scrollbar-none min-h-0 overflow-y-auto pb-16 pr-4"
                    style={{ width: `${leftPct}%` }}
                  >
                    <TaskPrompt task={task} />
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

                  {/* Answer pane */}
                  <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pb-16 pl-4">
                    <AnswerBox
                      key={task.taskNumber}
                      value={answers[task.taskNumber] ?? ""}
                      onChange={(v) => setAnswers((a) => ({ ...a, [task.taskNumber]: v }))}
                      themeKey={themeKey}
                    />
                  </div>
                </div>
              )}
            </main>
          )}

          {/* Floating prev/next arrows */}
          {view === "exam" && (
            <div className="pointer-events-none absolute bottom-6 right-8 flex gap-2">
              <button
                type="button"
                aria-label="Previous part"
                disabled={current === 0}
                onClick={() => setCurrent(0)}
                className="pointer-events-auto grid h-12 w-14 place-items-center rounded text-white shadow-md transition"
                style={{ background: current === 0 ? "#c9c9c9" : "#1f1f1f", cursor: current === 0 ? "not-allowed" : "pointer" }}
              >
                <ChevronLeft className="h-7 w-7" strokeWidth={2.75} />
              </button>
              <button
                type="button"
                aria-label="Next part"
                disabled={current === tasks.length - 1}
                onClick={() => setCurrent(tasks.length - 1)}
                className="pointer-events-auto grid h-12 w-14 place-items-center rounded text-white shadow-md transition"
                style={{
                  background: current === tasks.length - 1 ? "#c9c9c9" : "#1f1f1f",
                  cursor: current === tasks.length - 1 ? "not-allowed" : "pointer",
                }}
              >
                <ChevronRight className="h-7 w-7" strokeWidth={2.75} />
              </button>
            </div>
          )}
        </div>

        {/* ======================= Part navigation ======================== */}
        <nav
          className="flex select-none items-stretch border-t"
          style={{ background: bw ? "#ffffff" : theme.chromeNavBg, borderColor: theme.chromeBorder }}
        >
          <div className="flex flex-1 items-stretch gap-3 px-3">
            {tasks.map((t, i) => {
              const answered = partAnswered(i);
              const active = i === current && view === "exam";
              const segGray = bw ? "#d9d9d9" : "#444444";
              return (
                <button
                  key={t.taskNumber}
                  type="button"
                  onClick={() => {
                    setView("exam");
                    setCurrent(i);
                  }}
                  className="flex flex-1 flex-col items-stretch pb-2.5 pt-0"
                  style={{ color: theme.chromeFg }}
                >
                  <span
                    aria-hidden
                    className="h-[5px] w-full rounded-full"
                    style={{ background: answered ? "#2f9e44" : segGray }}
                  />
                  <span className="mt-2 flex items-center gap-3 pl-2">
                    {answered && <Check className="h-5 w-5 text-[#2f9e44]" strokeWidth={3} />}
                    <span className="text-[15px] font-bold">Part {t.taskNumber}</span>
                    {!active && !answered && (
                      <span className="text-[15px]" style={{ color: theme.muted }}>
                        0 of 1
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-label={paper ? "Submit answers" : "Finish test"}
            onClick={() => (paper ? setView("upload") : setFinishOpen(true))}
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
              if (paper) setView("upload");
              else setFinishOpen(true);
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
          <div className="fixed inset-0 z-[340] grid place-items-center bg-black/40 p-4">
            <div
              className="w-[440px] max-w-full rounded-lg border p-6 shadow-2xl"
              style={{ background: theme.contentBg, borderColor: theme.border, color: theme.fg }}
            >
              <h3 className="text-lg font-bold">Finish the Writing test?</h3>
              <p className="mt-1 text-sm" style={{ color: theme.muted }}>
                Task 1: {words(1)} words · Task 2: {words(2)} words. You can still review your
                answers afterwards.
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
                    setView("finished");
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
// Question prompt (+ chart) — shared by both panes/modes
// ============================================================================

function TaskPrompt({ task }: { task: WritingTask }) {
  const base = `task-${task.taskNumber}`;
  return (
    <div>
      {task.promptHeader && (
        <p>
          <HL id={`${base}-header`} text={task.promptHeader} />
        </p>
      )}
      {task.promptParas.map((p, i) => (
        <p key={i} className="mt-6 font-bold leading-relaxed first:mt-0">
          <HL id={`${base}-p${i}`} text={p} />
        </p>
      ))}
      {task.closing && (
        <p className="mt-6 leading-relaxed">
          <HL id={`${base}-closing`} text={task.closing} />
        </p>
      )}
      {task.chart && <BarChartView chart={task.chart} />}
      {task.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={task.imageUrl}
          alt="Task illustration"
          className="mt-8 h-auto max-h-[460px] w-auto max-w-full rounded border"
          style={{ borderColor: "#9a9a9a" }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Answer textarea + word count (computer mode)
// ============================================================================

function AnswerBox({
  value,
  onChange,
  themeKey,
}: {
  value: string;
  onChange: (v: string) => void;
  themeKey: ThemeKey;
}) {
  const theme = THEMES[themeKey];
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        aria-label="Your answer"
        className="scrollbar-none h-[42vh] min-h-[220px] w-full resize-none rounded-[2px] p-3 outline-none"
        style={{
          background: theme.inputBg,
          color: theme.inputFg,
          border: `1px solid ${focused ? theme.accent : themeKey === "bw" ? "#333" : theme.inputBorder}`,
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "1em",
          lineHeight: 1.5,
        }}
      />
      <p className="mt-1 text-right">Words: {countWords(value)}</p>
    </div>
  );
}

// ============================================================================
// Task 1 bar chart (inline SVG)
// ============================================================================

function BarChartView({ chart }: { chart: BarChart }) {
  const { theme } = useExamHL();
  const L = 64;
  const T = 16;
  const plotW = 580;
  const plotH = 256;
  const W = L + plotW + 16;
  const H = T + plotH + 92;
  const y = (v: number) => T + plotH - (v / chart.yMax) * plotH;
  const groupW = plotW / chart.categories.length;
  const barW = 18;

  const ticks = [];
  for (let v = 0; v <= chart.yMax; v += chart.yStep) ticks.push(v);

  return (
    <div className="mt-8 max-w-[660px]">
      <p className="mx-auto max-w-[480px] text-center text-[1.15em] font-bold leading-snug">
        <HL id="chart-title" text={chart.title} />
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={chart.title}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={L + plotW} y1={y(v)} y2={y(v)} stroke={v === 0 ? theme.fg : "#9a9a9a"} strokeWidth={v === 0 ? 1.5 : 1} />
            <text x={L - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={13} fill={theme.fg}>
              {v}
            </text>
          </g>
        ))}
        {chart.categories.map((cat, i) => {
          const cx = L + groupW * (i + 0.5);
          return (
            <g key={cat}>
              {chart.series.map((s, si) => {
                const v = s.values[i] ?? 0;
                const x = cx - barW - 1.5 + si * (barW + 3);
                return <rect key={s.label} x={x} y={y(v)} width={barW} height={plotH + T - y(v)} fill={s.color} />;
              })}
              <text
                transform={`translate(${cx + 6},${T + plotH + 14}) rotate(-35)`}
                textAnchor="end"
                fontSize={13.5}
                fill={theme.fg}
              >
                {cat}
              </text>
            </g>
          );
        })}
        {/* legend */}
        {chart.series.map((s, si) => (
          <g key={s.label} transform={`translate(${L + plotW - 110 + si * 62},${T + 2})`}>
            <rect width={12} height={12} fill={s.color} />
            <text x={16} y={10} fontSize={12.5} fill={theme.fg}>
              {s.label}
            </text>
          </g>
        ))}
        <text
          transform={`translate(14,${T + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={13.5}
          fontWeight={700}
          fill={theme.fg}
        >
          {chart.yLabel}
        </text>
        {chart.xLabel && (
          <text x={L + plotW / 2} y={H - 8} textAnchor="middle" fontSize={13.5} fontWeight={700} fill={theme.fg}>
            {chart.xLabel}
          </text>
        )}
      </svg>
    </div>
  );
}

// ============================================================================
// Paper mode: upload screen
// ============================================================================

function UploadView({
  theme,
  uploads,
  onPick,
  onRemove,
  onBack,
  onSubmit,
}: {
  theme: (typeof THEMES)[ThemeKey];
  uploads: Record<number, Upload | undefined>;
  onPick: (taskNumber: number, file: File | undefined) => void;
  onRemove: (taskNumber: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const bothUploaded = !!uploads[1] && !!uploads[2];
  return (
    <main className="scrollbar-none flex-1 overflow-y-auto" style={{ background: theme.contentBg, color: theme.fg }}>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-2xl font-bold">Upload your written answers</h2>
        <p className="mt-2 text-[15px]" style={{ color: theme.muted }}>
          Take a clear photo of each answer sheet and add it below — one picture for Task 1 and
          one for Task 2.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {[1, 2].map((n) => {
            const up = uploads[n];
            return (
              <div key={n}>
                <p className="mb-2 font-bold">Task {n} picture</p>
                {up ? (
                  <div className="rounded border p-3" style={{ borderColor: theme.border }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={up.dataUrl}
                      alt={`Task ${n} answer`}
                      className="h-52 w-full rounded object-contain"
                      style={{ background: "#f5f5f5" }}
                    />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="truncate text-[13px]" style={{ color: theme.muted }}>
                        {up.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemove(n)}
                        className="flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[13px]"
                        style={{ borderColor: theme.border, color: theme.fg }}
                      >
                        <X className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    className="flex h-60 cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed text-[15px] transition hover:opacity-80"
                    style={{ borderColor: "#9ec1e0", color: theme.muted }}
                  >
                    <ImagePlus className="h-8 w-8" />
                    Add Task {n} picture
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPick(n, e.target.files?.[0])}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!bothUploaded}
            className="rounded bg-[#1f1f1f] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit answers
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded border px-4 py-2.5 text-sm font-medium"
            style={{ borderColor: theme.border, color: theme.fg }}
          >
            Back to questions
          </button>
          {!bothUploaded && (
            <span className="text-[13px]" style={{ color: theme.muted }}>
              Add both pictures to submit.
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
