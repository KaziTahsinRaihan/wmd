"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import ReadingExam, { readingStorageKey } from "@/components/mock-practice/ReadingExam";
import ModePicker, { type ExamMode } from "@/components/mock-practice/ModePicker";
import TeacherQuestionList from "@/components/mock-practice/TeacherQuestionList";
import { authoredToReading, parseAnswerKey, type SavedAuthoredQuestion } from "@/lib/authoring";
import { DEMO_READING_TEST } from "@/lib/reading-mock";
import { ArrowLeft, BookOpen, Play, RotateCcw } from "lucide-react";

export default function ReadingPracticePage() {
  const { user } = useAuth();
  const [started, setStarted] = useState(false);
  const [teacherQ, setTeacherQ] = useState<SavedAuthoredQuestion | null>(null);
  const [examMode, setExamMode] = useState<ExamMode>("real");
  const [hasSaved, setHasSaved] = useState(false);

  const userId = user?.id ?? "anon";
  const storageKey = readingStorageKey(userId, DEMO_READING_TEST.id);

  const refreshSaved = () => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return setHasSaved(false);
      const data = JSON.parse(raw);
      setHasSaved(
        Object.keys(data.answers ?? {}).length > 0 || Object.keys(data.multi ?? {}).length > 0,
      );
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
    setStarted(true);
  };

  if (teacherQ) {
    return (
      <ReadingExam
        test={authoredToReading(teacherQ.payload.test, teacherQ.id)}
        answerKey={parseAnswerKey(teacherQ.payload.test)}
        userId={userId}
        mode={examMode}
        onExit={() => setTeacherQ(null)}
      />
    );
  }

  if (started) {
    return (
      <ReadingExam
        test={DEMO_READING_TEST}
        userId={userId}
        mode={examMode}
        onExit={() => {
          setStarted(false);
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
            <span className="gold-text">Reading</span> practice
          </>
        }
        description="A full computer-delivered Reading test — 3 passages, 40 questions, exactly like the real exam screen."
      />

      <ModePicker
        value={examMode}
        onChange={setExamMode}
        realNote="Strict 60-minute timer, exactly like test day."
        practiceNote="No timer. Focus on a single question type, and right-click any word to see its meaning and synonyms."
      />

      <div className="panel max-w-2xl">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
            <BookOpen className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-lg font-bold">{DEMO_READING_TEST.title}</h3>
            <p className="mt-1 text-sm text-white/60">
              3 parts · 40 questions. Read each passage on the left and answer on the right —
              drag section headings into the text, type your answers, and highlight anything you
              want to remember. Your answers are saved automatically, so you can leave and
              continue later.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setStarted(true)} className="btn-gold">
            <Play className="h-4 w-4" /> {hasSaved ? "Continue test" : "Start test"}
          </button>
          {hasSaved && (
            <button type="button" onClick={restart} className="btn-outline">
              <RotateCcw className="h-4 w-4" /> Restart from scratch
            </button>
          )}
          <Link href="/student/mock-practice" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </div>

      <TeacherQuestionList module="reading" onStart={setTeacherQ} />
    </div>
  );
}
