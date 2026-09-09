"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { speakingSubmissions } from "@/lib/mock-data";
import { getAllEvaluations, SpeakingEvaluation } from "@/lib/speaking";
import { ArrowRight, Clock, Mic } from "lucide-react";

export default function StudentSpeakingFeedbackPage() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Record<string, SpeakingEvaluation>>({});

  useEffect(() => {
    const byId: Record<string, SpeakingEvaluation> = {};
    for (const e of getAllEvaluations()) byId[e.submissionId] = e;
    setEvaluations(byId);
  }, []);

  if (!user) return null;

  const mine = speakingSubmissions.filter((s) => s.studentId === user.id);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Speaking feedback"
        title={<>Your <span className="gold-text">graded speaking tests</span></>}
        description="Open a submission to see your examiner's per-criterion notes and your speaking band."
      />

      {mine.length === 0 ? (
        <div className="panel text-center text-white/65">
          You haven't completed a speaking test yet. Record Part 1, Part 2 and Part 3 to submit one.
        </div>
      ) : (
        <div className="space-y-3">
          {mine.map((s) => {
            const allCompleted =
              s.part1.completed && s.part2.completed && s.part3.completed;
            const evaluation = evaluations[s.id];
            const submitted = evaluation?.status === "submitted";
            return (
              <div key={s.id} className="panel panel-hover">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <Mic className="mt-0.5 h-5 w-5 text-gold-400" />
                    <div>
                      <p className="font-semibold">Speaking module · {s.submitted}</p>
                      <p className="mt-1 text-xs text-white/55">
                        Part 1 · {s.part1.topic}
                      </p>
                      <p className="text-xs text-white/55">
                        Part 2 · {s.part2.topic}
                      </p>
                      <p className="text-xs text-white/55">
                        Part 3 · {s.part3.topic}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!allCompleted ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200">
                        Finish all parts to submit
                      </span>
                    ) : submitted && evaluation ? (
                      <>
                        <div className="text-right text-xs text-white/70">
                          <p>
                            Speaking band{" "}
                            <span className="text-gold-300 font-bold">
                              {evaluation.overallBand.toFixed(1)}
                            </span>
                          </p>
                        </div>
                        <Link
                          href={`/student/speaking-feedback/${s.id}`}
                          className="btn-gold"
                        >
                          View feedback <ArrowRight className="h-4 w-4" />
                        </Link>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-ink-800/60 px-3 py-1.5 text-xs text-white/65">
                        <Clock className="h-3.5 w-3.5" /> Awaiting examiner
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
