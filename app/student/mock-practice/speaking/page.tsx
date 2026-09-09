"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import SpeakingExam from "@/components/mock-practice/SpeakingExam";
import TeacherQuestionList from "@/components/mock-practice/TeacherQuestionList";
import { authoredToSpeaking, type SavedAuthoredQuestion } from "@/lib/authoring";
import { DEMO_SPEAKING_TEST, speakingQuestionCount } from "@/lib/speaking-mock";
import { ArrowLeft, Mic, Play } from "lucide-react";

export default function SpeakingPracticePage() {
  const { user } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [teacherQ, setTeacherQ] = useState<SavedAuthoredQuestion | null>(null);

  const userId = user?.id ?? "anon";

  if (teacherQ) {
    return (
      <SpeakingExam
        test={authoredToSpeaking(teacherQ.payload.test, teacherQ.id)}
        userId={userId}
        submitTarget={
          user
            ? { questionId: teacherQ.id, questionName: teacherQ.name, studentEmail: user.email }
            : undefined
        }
        onExit={() => setTeacherQ(null)}
      />
    );
  }

  if (demoOpen) {
    return <SpeakingExam test={DEMO_SPEAKING_TEST} userId={userId} onExit={() => setDemoOpen(false)} />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Mock Practice"
        title={
          <>
            <span className="gold-text">Speaking</span> practice
          </>
        }
        description="A full three-part Speaking test — your answers are recorded through your microphone and submitted for evaluation."
      />

      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        <div className="panel flex flex-col">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
            <Mic className="h-6 w-6" />
          </span>
          <h3 className="mt-3 text-lg font-bold">Speaking — Demo Test</h3>
          <p className="mt-1 flex-1 text-sm text-white/60">
            {speakingQuestionCount(DEMO_SPEAKING_TEST)} recorded answers across three parts: an
            introduction, a 2-minute long turn from a cue card (with 1 minute to prepare), and a
            discussion. You&apos;ll need to turn your microphone on.
          </p>
          <div className="mt-4">
            <button type="button" onClick={() => setDemoOpen(true)} className="btn-gold">
              <Play className="h-4 w-4" /> Start test
            </button>
          </div>
        </div>

        <div className="panel flex flex-col">
          <h3 className="text-lg font-bold">How it works</h3>
          <ul className="mt-2 flex-1 space-y-2 text-sm text-white/60">
            <li>• Questions appear one at a time — recording starts as each question appears.</li>
            <li>• Press <b className="text-white/80">Submit recording</b> when you finish each answer.</li>
            <li>• Part 2: 1 minute to prepare, then 2 minutes are recorded automatically.</li>
            <li>• At the end, submit the whole recording for the final evaluation.</li>
          </ul>
        </div>
      </div>

      <TeacherQuestionList module="speaking" onStart={setTeacherQ} />

      <div className="mt-6">
        <Link href="/student/mock-practice" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" /> Back to Mock Practice
        </Link>
      </div>
    </div>
  );
}
