"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { speakingSubmissions } from "@/lib/mock-data";
import { getAllEvaluations, SpeakingEvaluation } from "@/lib/speaking";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Mic,
  PencilLine,
} from "lucide-react";

export default function SpeakingQueuePage() {
  const [evaluations, setEvaluations] = useState<Record<string, SpeakingEvaluation>>({});

  useEffect(() => {
    const byId: Record<string, SpeakingEvaluation> = {};
    for (const e of getAllEvaluations()) byId[e.submissionId] = e;
    setEvaluations(byId);
  }, []);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Evaluate Speaking"
        title={<>Speaking <span className="gold-text">submissions</span></>}
        description="Each submission contains Part 1, Part 2, and Part 3. A speaking test can only be graded once the candidate has completed all three parts."
      />

      <div className="space-y-3">
        {speakingSubmissions.map((s) => {
          const allCompleted = s.part1.completed && s.part2.completed && s.part3.completed;
          const evaluation = evaluations[s.id];
          const submitted = evaluation?.status === "submitted";
          return (
            <div key={s.id} className="panel panel-hover">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <Mic className="mt-0.5 h-5 w-5 text-gold-400" />
                  <div>
                    <p className="font-semibold">{s.studentName}</p>
                    <p className="text-xs text-white/55">
                      Submitted {s.submitted} ·{" "}
                      {[s.part1, s.part2, s.part3]
                        .filter((p) => p.completed)
                        .map((p) => p.duration)
                        .join(" + ")}{" "}
                      across {[s.part1, s.part2, s.part3].filter((p) => p.completed).length}/3 parts
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[s.part1, s.part2, s.part3].map((p) => (
                        <span
                          key={p.partNumber}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                            p.completed
                              ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                              : "border border-rose-400/30 bg-rose-500/10 text-rose-200"
                          }`}
                          title={p.topic}
                        >
                          {p.completed ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <CircleAlert className="h-3 w-3" />
                          )}
                          Part {p.partNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!allCompleted ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200">
                      <CircleAlert className="h-3.5 w-3.5" /> Awaiting candidate
                    </span>
                  ) : submitted && evaluation ? (
                    <div className="text-right text-xs text-white/70">
                      <span className="inline-flex items-center gap-1 text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                      </span>
                      <p className="mt-1">
                        Speaking band{" "}
                        <span className="text-gold-300 font-bold">
                          {evaluation.overallBand.toFixed(1)}
                        </span>
                      </p>
                    </div>
                  ) : evaluation ? (
                    <span className="badge">
                      <PencilLine className="mr-1 h-3 w-3" /> Draft saved
                    </span>
                  ) : (
                    <span className="badge">Pending</span>
                  )}
                  {allCompleted ? (
                    <Link href={`/instructor/speaking/${s.id}`} className="btn-gold">
                      {submitted ? "Review" : "Open & grade"} <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Grading is unlocked once the candidate finishes Part 1, 2 and 3."
                      className="btn-outline cursor-not-allowed opacity-50"
                    >
                      Locked
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
