"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import WritingExam, { writingStorageKey, type WritingMode } from "@/components/mock-practice/WritingExam";
import ModePicker, { type ExamMode } from "@/components/mock-practice/ModePicker";
import TeacherQuestionList from "@/components/mock-practice/TeacherQuestionList";
import {
  authoredToWriting,
  WRITING_TASK1_TYPES,
  WRITING_TASK2_TYPES,
  type SavedAuthoredQuestion,
} from "@/lib/authoring";
import { SAMPLE_WRITING_EXAM } from "@/lib/writing-exam";
import { ArrowLeft, Monitor, PenLine, Play, RotateCcw } from "lucide-react";

export default function WritingPracticePage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<WritingMode | null>(null);
  const [teacherQ, setTeacherQ] = useState<SavedAuthoredQuestion | null>(null);
  const [examMode, setExamMode] = useState<ExamMode>("real");
  const [hasSaved, setHasSaved] = useState(false);
  const [t1Filter, setT1Filter] = useState("");
  const [t2Filter, setT2Filter] = useState("");

  const userId = user?.id ?? "anon";
  const storageKey = writingStorageKey(userId, SAMPLE_WRITING_EXAM.id);

  const refreshSaved = () => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return setHasSaved(false);
      const data = JSON.parse(raw);
      const a = data.answers ?? {};
      setHasSaved(!!(a[1]?.trim() || a[2]?.trim()));
    } catch {
      setHasSaved(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refreshSaved, [storageKey]);

  const restart = () => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {}
    setHasSaved(false);
    setMode("computer");
  };

  if (teacherQ) {
    return (
      <WritingExam
        exam={authoredToWriting(teacherQ.payload.test, teacherQ.id)}
        mode={teacherQ.payload.test.writingFormat ?? "computer"}
        testMode={examMode}
        userId={userId}
        onExit={() => setTeacherQ(null)}
      />
    );
  }

  if (mode) {
    return (
      <WritingExam
        exam={SAMPLE_WRITING_EXAM}
        mode={mode}
        testMode={examMode}
        userId={userId}
        onExit={() => {
          setMode(null);
          refreshSaved();
        }}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Mock Practice"
        title={
          <>
            <span className="gold-text">Writing</span> practice
          </>
        }
        description="A full 60-minute Writing test — Task 1 report and Task 2 essay, on the real exam screen."
      />

      <ModePicker
        value={examMode}
        onChange={setExamMode}
        realNote="Strict 60-minute timer, exactly like test day."
        practiceNote="No timer — take as long as you need on both tasks."
      />

      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        <div className="panel flex flex-col">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
            <Monitor className="h-6 w-6" />
          </span>
          <h3 className="mt-3 text-lg font-bold">Writing on Computer</h3>
          <p className="mt-1 flex-1 text-sm text-white/60">
            Type both tasks on screen with a live word count, resizable question pane, and
            highlight &amp; note tools. Your draft saves automatically.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode("computer")} className="btn-gold">
              <Play className="h-4 w-4" /> {hasSaved ? "Continue test" : "Start test"}
            </button>
            {hasSaved && (
              <button type="button" onClick={restart} className="btn-outline">
                <RotateCcw className="h-4 w-4" /> Restart
              </button>
            )}
          </div>
        </div>

        <div className="panel flex flex-col">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
            <PenLine className="h-6 w-6" />
          </span>
          <h3 className="mt-3 text-lg font-bold">Writing on Paper</h3>
          <p className="mt-1 flex-1 text-sm text-white/60">
            Read the questions on screen, write your answers on paper, then photograph and upload
            a picture of each task when you submit.
          </p>
          <div className="mt-4">
            <button type="button" onClick={() => setMode("paper")} className="btn-gold">
              <Play className="h-4 w-4" /> Start test
            </button>
          </div>
        </div>
      </div>

      {examMode === "practice" && (
        <div className="mt-6 flex max-w-2xl flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-white/70">Practise a specific type:</span>
          <select
            value={t1Filter}
            onChange={(e) => setT1Filter(e.target.value)}
            className="input-field w-auto"
            aria-label="Task 1 question type"
          >
            <option value="">Task 1 — all types</option>
            {WRITING_TASK1_TYPES.map((t) => (
              <option key={t} value={t}>
                Task 1 — {t}
              </option>
            ))}
          </select>
          <select
            value={t2Filter}
            onChange={(e) => setT2Filter(e.target.value)}
            className="input-field w-auto"
            aria-label="Task 2 question type"
          >
            <option value="">Task 2 — all types</option>
            {WRITING_TASK2_TYPES.map((t) => (
              <option key={t} value={t}>
                Task 2 — {t}
              </option>
            ))}
          </select>
        </div>
      )}

      <TeacherQuestionList
        module="writing"
        onStart={setTeacherQ}
        filter={
          examMode === "practice" && (t1Filter || t2Filter)
            ? (q) =>
                (!t1Filter || q.payload.test.task1?.qtype === t1Filter) &&
                (!t2Filter || q.payload.test.task2?.qtype === t2Filter)
            : undefined
        }
      />

      <div className="mt-6">
        <Link href="/student/mock-practice" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" /> Back to Mock Practice
        </Link>
      </div>
    </div>
  );
}
