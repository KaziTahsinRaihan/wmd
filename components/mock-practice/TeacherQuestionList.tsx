"use client";

// "Questions from your teacher" — lists published teacher-authored questions
// for one module on a student Mock Practice start page.

import { useEffect, useState } from "react";
import { listAuthored, totalQuestions, type AuthoredModule, type SavedAuthoredQuestion } from "@/lib/authoring";
import { GraduationCap, Play } from "lucide-react";

export default function TeacherQuestionList({
  module,
  onStart,
  filter,
}: {
  module: AuthoredModule;
  onStart: (q: SavedAuthoredQuestion) => void;
  /** Extra predicate (e.g. writing practice-mode question-type filters). */
  filter?: (q: SavedAuthoredQuestion) => boolean;
}) {
  const [items, setItems] = useState<SavedAuthoredQuestion[] | null>(null);

  useEffect(() => {
    listAuthored()
      .then((all) =>
        setItems(all.filter((q) => q.payload.test.module === module && q.payload.test.status === "published")),
      )
      .catch(() => setItems([]));
  }, [module]);

  const visible = filter && items ? items.filter(filter) : items;
  if (!items || items.length === 0) return null;
  if (visible && visible.length === 0) {
    return (
      <div className="mt-6 max-w-2xl">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <GraduationCap className="h-5 w-5 text-gold-400" /> Questions from your teacher
        </h3>
        <p className="panel text-sm text-white/60">No questions match the selected types.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 max-w-2xl">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <GraduationCap className="h-5 w-5 text-gold-400" /> Questions from your teacher
      </h3>
      <div className="grid gap-3">
        {(visible ?? []).map((q) => {
          const mod = q.payload.test.module;
          const count = mod === "writing" ? 2 : totalQuestions(q.payload.test);
          return (
            <div key={q.id} className="panel flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{q.name}</p>
                <p className="text-xs text-white/50">
                  {count} {mod === "writing" ? "tasks" : mod === "speaking" ? "recorded questions" : "questions"} · added{" "}
                  {new Date(q.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button type="button" onClick={() => onStart(q)} className="btn-gold shrink-0">
                <Play className="h-4 w-4" /> Start
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
