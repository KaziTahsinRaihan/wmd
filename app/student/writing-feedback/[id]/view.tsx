"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { writingSubmissions } from "@/lib/mock-data";
import ScriptSurface from "@/components/ScriptSurface";
import { CRITERIA, getEvaluation, WritingEvaluation } from "@/lib/writing";
import { ArrowLeft, MessageSquare } from "lucide-react";

type ActiveTask = "task1" | "task2";

export default function StudentWritingFeedbackDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const submission = useMemo(
    () => writingSubmissions.find((s) => s.id === params.id),
    [params.id],
  );
  if (!submission) notFound();

  const [evaluation, setEvaluation] = useState<WritingEvaluation | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeTask, setActiveTask] = useState<ActiveTask>("task1");

  useEffect(() => {
    setEvaluation(getEvaluation(submission.id) ?? null);
    setLoaded(true);
  }, [submission.id]);

  // Only the student who owns the submission may view it.
  if (loaded && user && user.id !== submission.studentId) {
    return (
      <div className="panel text-center text-white/65">
        You don't have access to this submission.
      </div>
    );
  }

  if (!loaded) return null;

  if (!evaluation || evaluation.status !== "submitted") {
    return (
      <div className="animate-fade-in">
        <Link href="/student/writing-feedback" className="btn-ghost mb-3 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to feedback
        </Link>
        <div className="panel text-center text-white/65">
          Your examiner hasn't finished grading this submission yet. Check back shortly.
        </div>
      </div>
    );
  }

  const currentScript = submission[activeTask];
  const currentTaskEval = evaluation[activeTask];
  const currentTaskBand =
    activeTask === "task1" ? evaluation.task1Band : evaluation.task2Band;

  return (
    <div className="animate-fade-in">
      <Link href="/student/writing-feedback" className="btn-ghost mb-3 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to feedback
      </Link>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Writing module · <span className="gold-text">{submission.submitted}</span>
          </h1>
          <p className="mt-1 text-sm text-white/55">
            Graded on{" "}
            {evaluation.submittedAt
              ? new Date(evaluation.submittedAt).toLocaleDateString()
              : "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge">T1 {evaluation.task1Band.toFixed(1)}</span>
          <span className="badge">T2 {evaluation.task2Band.toFixed(1)}</span>
          <span className="rounded-lg border border-gold-400/60 bg-gold-gradient px-3 py-1 text-sm font-bold text-ink-950 shadow-gold">
            Module {evaluation.moduleScore.toFixed(1)}
          </span>
        </div>
      </div>

      {evaluation.overallComment && (
        <div className="mb-4 panel border-gold-500/40">
          <p className="text-xs uppercase tracking-wide text-gold-300/80">
            <MessageSquare className="mr-1 inline h-3 w-3" />
            Examiner note
          </p>
          <p className="mt-1 text-sm text-white/90 whitespace-pre-line">
            {evaluation.overallComment}
          </p>
        </div>
      )}

      {/* Task tabs */}
      <div className="mb-3 inline-flex rounded-xl border border-gold-500/30 bg-ink-800/60 p-1">
        {(["task1", "task2"] as const).map((k) => {
          const active = activeTask === k;
          const taskNum = k === "task1" ? 1 : 2;
          const band = k === "task1" ? evaluation.task1Band : evaluation.task2Band;
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
              Task {taskNum} · band {band.toFixed(1)}
            </button>
          );
        })}
      </div>

      <div className="panel">
        <p className="text-xs uppercase tracking-wide text-white/40">
          Task {currentScript.taskNumber} prompt — {currentScript.title}
        </p>
        <p className="mt-1 text-sm text-white/85">{currentScript.prompt}</p>
      </div>

      <div className="mt-4">
        <ScriptSurface
          body={currentScript.body}
          promptHeader={`Your script — Task ${currentScript.taskNumber}`}
          annotations={currentTaskEval.annotations}
          interactive={false}
        />
      </div>

      <div className="mt-6 panel">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Examiner <span className="gold-text">feedback</span> · Task {currentScript.taskNumber}
          </h2>
          <span className="badge">Task {currentScript.taskNumber} band {currentTaskBand.toFixed(1)}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {CRITERIA.map((c) => (
            <div
              key={c.key}
              className="rounded-xl border border-white/10 bg-ink-800/40 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  <span className="text-gold-300 mr-2">{c.short}</span>
                  {c.label}
                </p>
                <span className="text-lg font-bold gold-text">
                  {currentTaskEval.scores[c.key]}
                </span>
              </div>
              <p className="mt-3 text-sm text-white/80 whitespace-pre-line min-h-[3em]">
                {currentTaskEval.feedback[c.key] || (
                  <span className="text-white/40 italic">No notes left for this criterion.</span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 panel">
        <p className="text-sm font-semibold">
          Writing <span className="gold-text">module band</span>
        </p>
        <p className="mt-1 text-xs text-white/55">
          Weighted as (Task 1 + Task 2 + Task 2) / 3, rounded by the IELTS fractional rule.
        </p>
        <p className="mt-3 text-3xl font-bold gold-text">
          {evaluation.moduleScore.toFixed(1)}
        </p>
        <p className="mt-1 text-[11px] text-white/45">
          ({evaluation.task1Band.toFixed(1)} + {evaluation.task2Band.toFixed(1)} +{" "}
          {evaluation.task2Band.toFixed(1)}) / 3 ={" "}
          {((evaluation.task1Band + 2 * evaluation.task2Band) / 3).toFixed(3)} → rounded to{" "}
          {evaluation.moduleScore.toFixed(1)}
        </p>
      </div>
    </div>
  );
}
