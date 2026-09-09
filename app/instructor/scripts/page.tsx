"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { writingSubmissions } from "@/lib/mock-data";
import { getAllEvaluations, WritingEvaluation } from "@/lib/writing";
import { ArrowRight, CheckCircle2, FileText, PencilLine } from "lucide-react";

export default function ScriptsPage() {
  const [evaluations, setEvaluations] = useState<Record<string, WritingEvaluation>>({});

  useEffect(() => {
    const all = getAllEvaluations();
    const byId: Record<string, WritingEvaluation> = {};
    for (const e of all) byId[e.submissionId] = e;
    setEvaluations(byId);
  }, []);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Check Scripts"
        title={<>Writing <span className="gold-text">evaluation</span> queue</>}
        description="Each submission contains both Task 1 and Task 2 — grade them together to produce a Writing module band."
      />

      <div className="space-y-3">
        {writingSubmissions.map((s) => {
          const evaluation = evaluations[s.id];
          const submitted = evaluation?.status === "submitted";
          return (
            <div key={s.id} className="panel panel-hover">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 text-gold-400" />
                  <div>
                    <p className="font-semibold">{s.studentName}</p>
                    <p className="text-xs text-white/55">
                      Submitted {s.submitted} · {s.task1.words + s.task2.words} words total
                    </p>
                    <div className="mt-2 flex flex-col gap-1 text-xs text-white/65 sm:flex-row sm:gap-4">
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
                    <div className="text-right text-xs text-white/70">
                      <span className="inline-flex items-center gap-1 text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                      </span>
                      <p className="mt-1">
                        T1 {evaluation.task1Band.toFixed(1)} · T2 {evaluation.task2Band.toFixed(1)} · Module{" "}
                        <span className="text-gold-300 font-bold">
                          {evaluation.moduleScore.toFixed(1)}
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
                  <Link href={`/instructor/scripts/${s.id}`} className="btn-gold">
                    {submitted ? "Review" : "Open & grade"} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
