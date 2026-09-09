"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import ListeningExam, { listeningStorageKey } from "@/components/mock-practice/ListeningExam";
import ModePicker, { type ExamMode } from "@/components/mock-practice/ModePicker";
import TeacherQuestionList from "@/components/mock-practice/TeacherQuestionList";
import { authoredToListening, parseAnswerKey, type SavedAuthoredQuestion } from "@/lib/authoring";
import { DEMO_LISTENING_TEST } from "@/lib/listening-mock";
import { ArrowLeft, Headphones, Play, RotateCcw } from "lucide-react";

export default function ListeningPracticePage() {
  const { user } = useAuth();
  const [started, setStarted] = useState(false);
  const [teacherQ, setTeacherQ] = useState<SavedAuthoredQuestion | null>(null);
  const [examMode, setExamMode] = useState<ExamMode>("real");
  const [hasSaved, setHasSaved] = useState(false);

  const userId = user?.id ?? "anon";
  const storageKey = listeningStorageKey(userId, DEMO_LISTENING_TEST.id);

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
      <ListeningExam
        test={authoredToListening(teacherQ.payload.test, teacherQ.id)}
        answerKey={parseAnswerKey(teacherQ.payload.test)}
        userId={userId}
        mode={examMode}
        onExit={() => setTeacherQ(null)}
      />
    );
  }

  if (started) {
    return (
      <ListeningExam
        test={DEMO_LISTENING_TEST}
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
            <span className="gold-text">Listening</span> practice
          </>
        }
        description="A full computer-delivered Listening test — 4 parts, 40 questions, exactly like the real exam screen."
      />

      <ModePicker
        value={examMode}
        onChange={setExamMode}
        realNote="Strict timing: 2 minutes plus the length of the recording. The audio plays once, exactly like test day."
        practiceNote="No timer — pause, rewind, fast-forward and change the audio speed while you practice."
      />

      <div className="panel max-w-2xl">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
            <Headphones className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-lg font-bold">{DEMO_LISTENING_TEST.title}</h3>
            <p className="mt-1 text-sm text-white/60">
              4 parts · 40 questions. Type your answers, drag labels into gaps, and highlight any
              text you want to remember — just like on test day. Your answers are saved
              automatically, so you can leave and continue later.
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

      <TeacherQuestionList module="listening" onStart={setTeacherQ} />
    </div>
  );
}
