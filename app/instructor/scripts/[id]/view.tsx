"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { writingSubmissions } from "@/lib/mock-data";
import ScriptSurface, { COLORS, Tool } from "@/components/ScriptSurface";
import {
  Annotation,
  CRITERIA,
  CriterionKey,
  WritingEvaluation,
  emptyEvaluation,
  getEvaluation,
  moduleScoreFromTasks,
  saveEvaluation,
  submitEvaluation,
  taskBandFromScores,
} from "@/lib/writing";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Circle as CircleIcon,
  Eraser,
  Highlighter,
  PenLine,
  Save,
  Type,
  Undo2,
} from "lucide-react";

type ActiveTask = "task1" | "task2";

export default function WritingEvaluatorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const submission = useMemo(
    () => writingSubmissions.find((s) => s.id === params.id),
    [params.id],
  );
  if (!submission) notFound();

  // ---------- Tool state (shared across both tasks) ----------
  const [tool, setTool] = useState<Tool>("highlighter");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [highlighterHeight, setHighlighterHeight] = useState<number>(20);
  const [textSize, setTextSize] = useState<number>(14);
  const [activeTask, setActiveTask] = useState<ActiveTask>("task1");

  // ---------- Evaluation state (loaded from localStorage on mount) ----------
  const [evaluation, setEvaluation] = useState<WritingEvaluation>(() =>
    emptyEvaluation(submission.id),
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const existing = getEvaluation(submission.id);
    if (existing) setEvaluation(existing);
    setLoaded(true);
  }, [submission.id]);

  // Autosave: persist whenever the evaluation changes, but only after the
  // initial load so we don't overwrite a saved draft with the empty default.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (evaluation.status === "submitted") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveEvaluation(evaluation);
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [evaluation, loaded]);

  // ---------- Derived bands ----------
  const task1Band = useMemo(
    () => taskBandFromScores(evaluation.task1.scores),
    [evaluation.task1.scores],
  );
  const task2Band = useMemo(
    () => taskBandFromScores(evaluation.task2.scores),
    [evaluation.task2.scores],
  );
  const moduleScore = useMemo(
    () => moduleScoreFromTasks(task1Band, task2Band),
    [task1Band, task2Band],
  );

  const submitted = evaluation.status === "submitted";

  // ---------- Mutation helpers ----------
  const currentTaskKey: ActiveTask = activeTask;
  const currentTask = evaluation[currentTaskKey];
  const currentScript = submission[currentTaskKey];

  const updateAnnotations = (next: Annotation[]) => {
    if (submitted) return;
    setEvaluation((e) => ({
      ...e,
      [currentTaskKey]: { ...e[currentTaskKey], annotations: next },
    }));
  };

  const updateScore = (k: CriterionKey, v: number) => {
    if (submitted) return;
    const clamped = Math.max(0, Math.min(9, Math.round(v)));
    setEvaluation((e) => ({
      ...e,
      [currentTaskKey]: {
        ...e[currentTaskKey],
        scores: { ...e[currentTaskKey].scores, [k]: clamped },
      },
    }));
  };

  const updateFeedback = (k: CriterionKey, v: string) => {
    if (submitted) return;
    setEvaluation((e) => ({
      ...e,
      [currentTaskKey]: {
        ...e[currentTaskKey],
        feedback: { ...e[currentTaskKey].feedback, [k]: v },
      },
    }));
  };

  const undo = () => {
    if (submitted) return;
    const anns = currentTask.annotations;
    if (anns.length === 0) return;
    updateAnnotations(anns.slice(0, -1));
  };

  const clearAll = () => {
    if (submitted) return;
    if (currentTask.annotations.length === 0) return;
    if (!confirm(`Clear all annotations on Task ${currentScript.taskNumber}?`)) return;
    updateAnnotations([]);
  };

  const submit = () => {
    if (submitted) return;
    const final = submitEvaluation(evaluation);
    setEvaluation(final);
    alert(
      `Evaluation submitted for ${submission.studentName}.\n\n` +
        `Task 1 band: ${final.task1Band.toFixed(1)}\n` +
        `Task 2 band: ${final.task2Band.toFixed(1)}\n` +
        `Writing module: ${final.moduleScore.toFixed(1)}\n\n` +
        `The student can now see your annotations and feedback.`,
    );
    router.push("/instructor/scripts");
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/instructor/scripts" className="btn-ghost mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4" /> Back to queue
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="gold-text">{submission.studentName}</span> — Writing module
          </h1>
          <p className="mt-1 text-sm text-white/55">
            Submitted {submission.submitted} · {submission.task1.words + submission.task2.words} words
            across both tasks
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge">T1 {task1Band.toFixed(1)}</span>
          <span className="badge">T2 {task2Band.toFixed(1)}</span>
          <span className="rounded-lg border border-gold-400/60 bg-gold-gradient px-3 py-1 text-sm font-bold text-ink-950 shadow-gold">
            Module {moduleScore.toFixed(1)}
          </span>
          <button
            onClick={undo}
            className="btn-ghost"
            disabled={submitted || currentTask.annotations.length === 0}
          >
            <Undo2 className="h-4 w-4" /> Undo
          </button>
          <button
            onClick={clearAll}
            className="btn-ghost"
            disabled={submitted || currentTask.annotations.length === 0}
          >
            <Eraser className="h-4 w-4" /> Clear
          </button>
          {submitted ? (
            <span className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
              Submitted to student
            </span>
          ) : (
            <button onClick={submit} className="btn-gold">
              <Check className="h-4 w-4" /> Submit evaluation
            </button>
          )}
        </div>
      </div>

      {!submitted && loaded && (
        <p className="mb-3 inline-flex items-center gap-1.5 text-xs text-white/45">
          <Save className="h-3 w-3" /> Draft autosaved · last update{" "}
          {new Date(evaluation.updatedAt).toLocaleTimeString()}
        </p>
      )}

      {/* Task tabs */}
      <div className="mb-3 inline-flex rounded-xl border border-gold-500/30 bg-ink-800/60 p-1">
        {(["task1", "task2"] as const).map((k) => {
          const active = activeTask === k;
          const taskNum = k === "task1" ? 1 : 2;
          const taskBand = k === "task1" ? task1Band : task2Band;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActiveTask(k)}
              aria-pressed={active}
              className={`rounded-lg px-4 py-1.5 text-sm transition ${
                active
                  ? "bg-gold-gradient text-ink-950 font-semibold shadow-gold"
                  : "text-white/75 hover:text-white"
              }`}
            >
              Task {taskNum} · band {taskBand.toFixed(1)}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      {!submitted && (
        <Toolbar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          highlighterHeight={highlighterHeight}
          setHighlighterHeight={setHighlighterHeight}
          textSize={textSize}
          setTextSize={setTextSize}
        />
      )}

      {/* Prompt */}
      <div className="mt-4 panel">
        <p className="text-xs uppercase tracking-wide text-white/40">
          Task {currentScript.taskNumber} prompt — {currentScript.title}
        </p>
        <p className="mt-1 text-sm text-white/85">{currentScript.prompt}</p>
        <p className="mt-1 text-xs text-white/45">{currentScript.words} words</p>
      </div>

      {/* Script paper */}
      <div className="mt-4">
        <ScriptSurface
          body={currentScript.body}
          promptHeader={`Student script — Task ${currentScript.taskNumber}`}
          annotations={currentTask.annotations}
          interactive={!submitted}
          tool={tool}
          color={color}
          strokeWidth={strokeWidth}
          highlighterHeight={highlighterHeight}
          textSize={textSize}
          onChange={updateAnnotations}
        />
      </div>

      {/* Feedback box */}
      <div className="mt-6 panel">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Examiner <span className="gold-text">feedback</span> · Task {currentScript.taskNumber}
          </h2>
          <span className="badge">
            Task {currentScript.taskNumber} band {(currentScript.taskNumber === 1 ? task1Band : task2Band).toFixed(1)}
          </span>
        </div>
        <p className="mb-4 text-xs text-white/55">
          Criteria scores are full bands only (no half bands). The task band is the average rounded
          by IELTS rules: fraction &lt; .25 rounds down, .25–.50 rounds up to the half band,
          &gt; .50–&lt; .75 stays at the half band, ≥ .75 rounds up.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {CRITERIA.map((c) => (
            <CriterionRow
              key={c.key}
              criterion={c}
              value={currentTask.scores[c.key]}
              onChange={(v) => updateScore(c.key, v)}
              feedback={currentTask.feedback[c.key]}
              onFeedback={(v) => updateFeedback(c.key, v)}
              disabled={submitted}
            />
          ))}
        </div>
      </div>

      {/* Module score panel */}
      <div className="mt-4 panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">
              Total Writing <span className="gold-text">Module Score</span>
            </p>
            <p className="mt-1 text-xs text-white/55">
              Weighted as (Task 1 + Task 2 + Task 2) / 3, then rounded by the same fractional rule.
            </p>
          </div>
          <span className="rounded-lg border border-gold-400/60 bg-gold-gradient px-4 py-2 text-base font-bold text-ink-950 shadow-gold">
            Module {moduleScore.toFixed(1)}
          </span>
        </div>
        <p className="mt-3 text-[11px] text-white/45">
          ({task1Band.toFixed(1)} + {task2Band.toFixed(1)} + {task2Band.toFixed(1)}) / 3 ={" "}
          {((task1Band + 2 * task2Band) / 3).toFixed(3)} → rounded to {moduleScore.toFixed(1)}
        </p>

        <div className="mt-4">
          <label className="text-xs uppercase tracking-wide text-white/55">
            Overall comment to student (optional)
          </label>
          <textarea
            value={evaluation.overallComment}
            onChange={(e) =>
              !submitted &&
              setEvaluation((prev) => ({ ...prev, overallComment: e.target.value }))
            }
            disabled={submitted}
            placeholder="A short summary the student will see alongside their bands…"
            rows={3}
            className="input-field mt-2 resize-none text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Toolbar
// ============================================================================

function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  highlighterHeight,
  setHighlighterHeight,
  textSize,
  setTextSize,
}: {
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (n: number) => void;
  highlighterHeight: number;
  setHighlighterHeight: (n: number) => void;
  textSize: number;
  setTextSize: (n: number) => void;
}) {
  const tools: { key: Tool; label: string; Icon: any }[] = [
    { key: "highlighter", label: "Highlighter", Icon: Highlighter },
    { key: "arrow", label: "Arrow", Icon: ArrowUpRight },
    { key: "pen", label: "Pen", Icon: PenLine },
    { key: "circle", label: "Circle", Icon: CircleIcon },
    { key: "text", label: "Text", Icon: Type },
  ];

  return (
    <div className="panel flex flex-wrap items-center gap-4 p-3">
      <div className="flex flex-wrap gap-1">
        {tools.map((t) => {
          const Icon = t.Icon;
          const active = tool === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTool(t.key)}
              title={t.label}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
                active
                  ? "border-gold-400 bg-gold-gradient text-ink-950 shadow-gold font-semibold"
                  : "border-gold-500/30 bg-ink-800/60 text-white/85 hover:border-gold-400/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      <span className="h-7 w-px bg-white/15" />

      <div className="flex items-center gap-1.5">
        <span className="text-xs uppercase tracking-wide text-white/50">Color</span>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            className={`h-6 w-6 rounded-full border-2 transition ${
              color === c
                ? "ring-2 ring-offset-2 ring-offset-ink-900 ring-gold-300 border-white/40"
                : "border-white/20 hover:border-white/50"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>

      <span className="h-7 w-px bg-white/15" />

      {(tool === "pen" || tool === "arrow" || tool === "circle") && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-white/50">
            {tool === "circle" ? "Stroke width" : "Width"}
          </span>
          <input
            type="range"
            min={1}
            max={14}
            step={1}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-32 accent-gold-400"
          />
          <span className="w-6 text-right text-xs text-white/70">{strokeWidth}</span>
        </div>
      )}

      {tool === "highlighter" && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-white/50">Brush size</span>
          <input
            type="range"
            min={10}
            max={40}
            step={2}
            value={highlighterHeight}
            onChange={(e) => setHighlighterHeight(Number(e.target.value))}
            className="w-32 accent-gold-400"
          />
          <span className="w-6 text-right text-xs text-white/70">{highlighterHeight}</span>
        </div>
      )}

      {tool === "text" && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-white/50">Text size</span>
          <input
            type="range"
            min={10}
            max={32}
            step={1}
            value={textSize}
            onChange={(e) => setTextSize(Number(e.target.value))}
            className="w-32 accent-gold-400"
          />
          <span className="w-6 text-right text-xs text-white/70">{textSize}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Criterion row
// ============================================================================

function CriterionRow({
  criterion,
  value,
  onChange,
  feedback,
  onFeedback,
  disabled,
}: {
  criterion: { key: CriterionKey; label: string; short: string; placeholder: string };
  value: number;
  onChange: (v: number) => void;
  feedback: string;
  onFeedback: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-800/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          <span className="text-gold-300 mr-2">{criterion.short}</span>
          {criterion.label}
        </p>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={9}
            step={1}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-16 rounded-md border border-white/15 bg-ink-800/80 px-2 py-1 text-right text-sm text-white disabled:opacity-60"
            aria-label={`${criterion.label} band number`}
          />
          <span className="text-xs text-white/50">/ 9</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={9}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-gold-400"
          aria-label={`${criterion.label} band meter`}
        />
        <span className="w-10 text-right text-lg font-bold gold-text">{value}</span>
      </div>
      <textarea
        value={feedback}
        disabled={disabled}
        onChange={(e) => onFeedback(e.target.value)}
        placeholder={criterion.placeholder}
        rows={3}
        className="input-field mt-3 resize-none text-sm disabled:opacity-60"
      />
    </div>
  );
}
