"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import {
  deleteAuthored,
  totalQuestions,
  type SavedAuthoredQuestion,
  listAuthored,
} from "@/lib/authoring";
import { BookOpen, FilePlus, Headphones, Mic, PenLine, Trash2 } from "lucide-react";

const MODULE_ICON = { listening: Headphones, reading: BookOpen, writing: PenLine, speaking: Mic } as const;

export default function QuestionBankPage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedAuthoredQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    listAuthored()
      .then(setItems)
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Question Bank"
        title={
          <>
            Your <span className="gold-text">questions</span>
          </>
        }
        description="Everything you have built in the question builder — drafts stay private, published questions appear on the students' Mock Practice pages."
      />

      <button type="button" onClick={() => router.push("/instructor/questions")} className="btn-gold mb-6">
        <FilePlus className="h-4 w-4" /> Add a new question
      </button>

      {error && <p className="text-sm text-red-400">Could not load questions: {error}</p>}
      {items === null && !error && <p className="text-sm text-white/50">Loading…</p>}
      {items?.length === 0 && (
        <p className="panel max-w-xl text-sm text-white/60">
          No questions yet — click <b>Add a new question</b> to build your first one.
        </p>
      )}

      <div className="grid max-w-4xl gap-3">
        {items?.map((q) => {
          const test = q.payload.test;
          const Icon = MODULE_ICON[test.module];
          const count = test.module === "writing" ? 2 : totalQuestions(test);
          return (
            <div key={q.id} className="panel flex items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{q.name}</p>
                <p className="text-xs capitalize text-white/50">
                  {test.module} · {count}{" "}
                  {test.module === "writing" ? "tasks" : test.module === "speaking" ? "recorded questions" : "questions"} ·{" "}
                  {new Date(q.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  test.status === "published" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/60"
                }`}
              >
                {test.status === "published" ? "Published" : "Draft"}
              </span>
              <button
                type="button"
                onClick={() => router.push(`/instructor/questions?edit=${q.id}`)}
                className="btn-outline shrink-0"
              >
                Edit
              </button>
              <button
                type="button"
                aria-label="Delete question"
                onClick={async () => {
                  await deleteAuthored(q.id);
                  load();
                }}
                className="shrink-0 rounded-lg p-2 text-red-300 transition hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
