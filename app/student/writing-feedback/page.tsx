"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { writingSubmissions } from "@/lib/mock-data";
import { getAllEvaluations, WritingEvaluation } from "@/lib/writing";
import { ArrowRight, Clock, FileText, ScrollText } from "lucide-react";

export default function StudentWritingFeedbackPage() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Record<string, WritingEvaluation>>({});

  useEffect(() => {
    const byId: Record<string, WritingEvaluation> = {};
    for (const e of getAllEvaluations()) byId[e.submissionId] = e;
    setEvaluations(byId);
  }, []);

  if (!user) return null;

  // Show only this student's submissions.
  const mySubmissions = writingSubmissions.filter((s) => s.studentId === user.id);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Writing feedback"
        title={<>Your <span className="gold-text">graded scripts</span></>}
        description="Open a submission to see the examiner's annotations on your script, criterion-level feedback, and your Writing module band."
      />

      {mySubmissions.length === 0 ? (
        <div className="panel text-center text-white/65">
          You haven't submitted a writing module yet. Once you do, your graded scripts will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {mySubmissions.map((s) => {
            const evaluation = evaluations[s.id];
            const submitted = evaluation?.status === "submitted";
            return (
              <div key={s.id} className="panel panel-hover">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <ScrollText className="mt-0.5 h-5 w-5 text-gold-400" />
                    <div>
                      <p className="font-semibold">Writing module · {s.submitted}</p>
                      <div className="mt-1 flex flex-col gap-1 text-xs text-white/65 sm:flex-row sm:gap-4">
                        <span>
                          <span className="text-gold-300">Task 1:</span> {s.task1.title}
                        </span>
                        <span>
                          <span className="text-gold-300">Task 2:</span> {s.task2.title}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {submitted && evaluation ? (
                      <>
                        <div className="text-right text-xs text-white/70">
                          <p>
                            T1 {evaluation.task1Band.toFixed(1)} · T2 {evaluation.task2Band.toFixed(1)}
                          </p>
                          <p className="mt-0.5">
                            Module{" "}
                            <span className="text-gold-300 font-bold">
                              {evaluation.moduleScore.toFixed(1)}
                            </span>
                          </p>
                        </div>
                        <Link
                          href={`/student/writing-feedback/${s.id}`}
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
