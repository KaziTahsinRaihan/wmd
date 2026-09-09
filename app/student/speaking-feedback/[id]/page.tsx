"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { speakingSubmissions } from "@/lib/mock-data";
import {
  getEvaluation,
  SpeakingEvaluation,
  SPEAKING_CRITERIA,
} from "@/lib/speaking";
import { ArrowLeft, Mic, MessageSquare } from "lucide-react";

export default function StudentSpeakingFeedbackDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const submission = useMemo(
    () => speakingSubmissions.find((s) => s.id === params.id),
    [params.id],
  );
  if (!submission) notFound();

  const [evaluation, setEvaluation] = useState<SpeakingEvaluation | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEvaluation(getEvaluation(submission.id) ?? null);
    setLoaded(true);
  }, [submission.id]);

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
        <Link href="/student/speaking-feedback" className="btn-ghost mb-3 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to feedback
        </Link>
        <div className="panel text-center text-white/65">
          Your examiner hasn't finished grading this speaking test yet. Check back shortly.
        </div>
      </div>
    );
  }

  const rawAverage =
    (evaluation.scores.fc +
      evaluation.scores.lr +
      evaluation.scores.gra +
      evaluation.scores.pron) /
    4;

  return (
    <div className="animate-fade-in">
      <Link href="/student/speaking-feedback" className="btn-ghost mb-3 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to feedback
      </Link>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Speaking module · <span className="gold-text">{submission.submitted}</span>
          </h1>
          <p className="mt-1 text-sm text-white/55">
            Graded on{" "}
            {evaluation.submittedAt
              ? new Date(evaluation.submittedAt).toLocaleDateString()
              : "—"}
          </p>
        </div>
        <span className="rounded-lg border border-gold-400/60 bg-gold-gradient px-3 py-1 text-sm font-bold text-ink-950 shadow-gold">
          Speaking band {evaluation.overallBand.toFixed(1)}
        </span>
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

      {/* Parts overview */}
      <div className="grid gap-3 lg:grid-cols-3">
        {[submission.part1, submission.part2, submission.part3].map((p) => (
          <div
            key={p.partNumber}
            className="rounded-2xl border border-gold-500/20 bg-ink-800/40 p-4"
          >
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-gold-300/80">
              <Mic className="h-3.5 w-3.5" /> Part {p.partNumber}
            </span>
            <p className="mt-2 text-sm font-semibold">{p.topic}</p>
            <p className="mt-1 text-[11px] text-white/55">{p.duration}</p>
          </div>
        ))}
      </div>

      {/* Criteria breakdown */}
      <div className="mt-6 panel">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Examiner <span className="gold-text">feedback</span>
          </h2>
          <span className="badge">Speaking band {evaluation.overallBand.toFixed(1)}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {SPEAKING_CRITERIA.map((c) => (
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
                  {evaluation.scores[c.key]}
                </span>
              </div>
              <p className="mt-3 text-sm text-white/80 whitespace-pre-line min-h-[3em]">
                {evaluation.feedback[c.key] || (
                  <span className="text-white/40 italic">
                    No notes left for this criterion.
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 panel">
        <p className="text-sm font-semibold">
          Speaking <span className="gold-text">band</span>
        </p>
        <p className="mt-1 text-xs text-white/55">
          Average of the four criteria, rounded by the IELTS fractional rule.
        </p>
        <p className="mt-3 text-3xl font-bold gold-text">
          {evaluation.overallBand.toFixed(1)}
        </p>
        <p className="mt-1 text-[11px] text-white/45">
          ({evaluation.scores.fc} + {evaluation.scores.lr} + {evaluation.scores.gra} +{" "}
          {evaluation.scores.pron}) / 4 = {rawAverage.toFixed(3)} → rounded to{" "}
          {evaluation.overallBand.toFixed(1)}
        </p>
      </div>
    </div>
  );
}
