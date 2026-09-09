"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { speakingSubmissions, type SpeakingPart } from "@/lib/mock-data";
import {
  emptyEvaluation,
  getEvaluation,
  overallBandFromScores,
  saveEvaluation,
  SpeakingCriterionKey,
  SpeakingEvaluation,
  SPEAKING_CRITERIA,
  submitEvaluation,
} from "@/lib/speaking";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleAlert,
  Mic,
  Pause,
  Play,
  Save,
} from "lucide-react";

export default function SpeakingEvaluatorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const submission = useMemo(
    () => speakingSubmissions.find((s) => s.id === params.id),
    [params.id],
  );
  if (!submission) notFound();

  // Hard gate: a submission is only gradable once all three parts are
  // complete. The queue page links here only for complete submissions, but
  // route this defensively in case someone visits the URL directly.
  const allCompleted =
    submission.part1.completed && submission.part2.completed && submission.part3.completed;

  const [evaluation, setEvaluation] = useState<SpeakingEvaluation>(() =>
    emptyEvaluation(submission.id),
  );
  const [loaded, setLoaded] = useState(false);
  const [playingPart, setPlayingPart] = useState<number | null>(null);

  useEffect(() => {
    const existing = getEvaluation(submission.id);
    if (existing) setEvaluation(existing);
    setLoaded(true);
  }, [submission.id]);

  // Autosave drafts (only while still editable).
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (evaluation.status === "submitted") return;
    if (!allCompleted) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveEvaluation(evaluation);
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [evaluation, loaded, allCompleted]);

  const overallBand = useMemo(
    () => overallBandFromScores(evaluation.scores),
    [evaluation.scores],
  );

  const submitted = evaluation.status === "submitted";

  if (!allCompleted) {
    return (
      <div className="animate-fade-in">
        <Link href="/instructor/speaking" className="btn-ghost mb-3 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </Link>
        <div className="panel">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-5 w-5 text-rose-300" />
            <div>
              <h2 className="text-base font-semibold">Speaking test is incomplete</h2>
              <p className="mt-1 text-sm text-white/65">
                A speaking submission can only be graded once the candidate has finished Part 1,
                Part 2 and Part 3. Ask the candidate to record the missing parts before this can
                be evaluated.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-white/70">
                {[submission.part1, submission.part2, submission.part3].map((p) => (
                  <li key={p.partNumber} className="flex items-center gap-2">
                    {p.completed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                    ) : (
                      <CircleAlert className="h-3.5 w-3.5 text-rose-300" />
                    )}
                    Part {p.partNumber} — {p.completed ? "completed" : "not recorded"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const updateScore = (k: SpeakingCriterionKey, v: number) => {
    if (submitted) return;
    const clamped = Math.max(0, Math.min(9, Math.round(v)));
    setEvaluation((e) => ({ ...e, scores: { ...e.scores, [k]: clamped } }));
  };

  const updateFeedback = (k: SpeakingCriterionKey, v: string) => {
    if (submitted) return;
    setEvaluation((e) => ({ ...e, feedback: { ...e.feedback, [k]: v } }));
  };

  const submit = () => {
    if (submitted) return;
    const final = submitEvaluation(evaluation);
    setEvaluation(final);
    alert(
      `Speaking evaluation submitted for ${submission.studentName}.\n\n` +
        `FC: ${final.scores.fc}\nLR: ${final.scores.lr}\n` +
        `GRA: ${final.scores.gra}\nPRON: ${final.scores.pron}\n\n` +
        `Speaking band: ${final.overallBand.toFixed(1)}\n\n` +
        `The candidate can now see your feedback.`,
    );
    router.push("/instructor/speaking");
  };

  const rawAverage =
    (evaluation.scores.fc +
      evaluation.scores.lr +
      evaluation.scores.gra +
      evaluation.scores.pron) /
    4;

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/instructor/speaking" className="btn-ghost mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4" /> Back to queue
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="gold-text">{submission.studentName}</span> — Speaking module
          </h1>
          <p className="mt-1 text-sm text-white/55">
            Submitted {submission.submitted} ·{" "}
            {submission.part1.duration} + {submission.part2.duration} + {submission.part3.duration}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-gold-400/60 bg-gold-gradient px-3 py-1 text-sm font-bold text-ink-950 shadow-gold">
            Speaking band {overallBand.toFixed(1)}
          </span>
          {submitted ? (
            <span className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
              Submitted to candidate
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

      {/* Three parts side-by-side cards */}
      <div className="grid gap-3 lg:grid-cols-3">
        {[submission.part1, submission.part2, submission.part3].map((p) => (
          <PartCard
            key={p.partNumber}
            part={p}
            playing={playingPart === p.partNumber}
            onTogglePlay={() =>
              setPlayingPart((cur) => (cur === p.partNumber ? null : p.partNumber))
            }
          />
        ))}
      </div>

      {/* Criteria */}
      <div className="mt-6 panel">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Examiner <span className="gold-text">feedback</span>
          </h2>
          <span className="badge">Speaking band {overallBand.toFixed(1)}</span>
        </div>
        <p className="mb-4 text-xs text-white/55">
          Each criterion is scored as a full band (no half bands). The speaking band is the average
          rounded by IELTS rules: fraction &lt; .25 rounds down, .25–.50 rounds up to the half band,
          &gt; .50–&lt; .75 stays at the half band, ≥ .75 rounds up to the next full band.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {SPEAKING_CRITERIA.map((c) => (
            <CriterionRow
              key={c.key}
              criterion={c}
              value={evaluation.scores[c.key]}
              onChange={(v) => updateScore(c.key, v)}
              feedback={evaluation.feedback[c.key]}
              onFeedback={(v) => updateFeedback(c.key, v)}
              disabled={submitted}
            />
          ))}
        </div>
      </div>

      {/* Band breakdown */}
      <div className="mt-4 panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">
              Speaking <span className="gold-text">band</span>
            </p>
            <p className="mt-1 text-xs text-white/55">
              Average of the four criteria, rounded by the IELTS fractional rule.
            </p>
          </div>
          <span className="rounded-lg border border-gold-400/60 bg-gold-gradient px-4 py-2 text-base font-bold text-ink-950 shadow-gold">
            {overallBand.toFixed(1)}
          </span>
        </div>
        <p className="mt-3 text-[11px] text-white/45">
          ({evaluation.scores.fc} + {evaluation.scores.lr} + {evaluation.scores.gra} +{" "}
          {evaluation.scores.pron}) / 4 = {rawAverage.toFixed(3)} → rounded to{" "}
          {overallBand.toFixed(1)}
        </p>

        <div className="mt-4">
          <label className="text-xs uppercase tracking-wide text-white/55">
            Overall comment to candidate (optional)
          </label>
          <textarea
            value={evaluation.overallComment}
            onChange={(e) =>
              !submitted &&
              setEvaluation((prev) => ({ ...prev, overallComment: e.target.value }))
            }
            disabled={submitted}
            placeholder="A short summary the candidate will see alongside their band…"
            rows={3}
            className="input-field mt-2 resize-none text-sm disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function PartCard({
  part,
  playing,
  onTogglePlay,
}: {
  part: SpeakingPart;
  playing: boolean;
  onTogglePlay: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gold-500/20 bg-ink-800/40 p-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-gold-300/80">
          <Mic className="h-3.5 w-3.5" /> Part {part.partNumber}
        </span>
        <span className="text-[11px] text-white/55">{part.duration}</span>
      </div>
      <p className="mt-2 text-sm font-semibold">{part.topic}</p>
      <ul className="mt-2 space-y-1 text-xs text-white/65">
        {part.prompts.map((q, i) => (
          <li key={i}>· {q}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onTogglePlay}
        className="btn-outline mt-3 w-full text-sm"
      >
        {playing ? (
          <>
            <Pause className="h-3.5 w-3.5" /> Pause
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" /> Play recording
          </>
        )}
      </button>
      {playing && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-gold-500/20 bg-ink-900/60 p-2">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
            <div className="absolute inset-y-0 left-0 w-1/3 animate-pulse bg-gold-gradient" />
          </div>
          <span className="text-[10px] text-white/55">0:42 / {part.duration}</span>
        </div>
      )}
    </div>
  );
}

function CriterionRow({
  criterion,
  value,
  onChange,
  feedback,
  onFeedback,
  disabled,
}: {
  criterion: {
    key: SpeakingCriterionKey;
    label: string;
    short: string;
    placeholder: string;
  };
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
