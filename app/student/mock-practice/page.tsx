"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { Headphones, BookOpen, PenLine, Mic, ArrowRight } from "lucide-react";

const modules = [
  {
    key: "listening",
    label: "Listening",
    icon: Headphones,
    blurb: "Audio sections with timed, exam-style questions.",
  },
  {
    key: "reading",
    label: "Reading",
    icon: BookOpen,
    blurb: "Passages with the full range of IELTS question types.",
  },
  {
    key: "writing",
    label: "Writing",
    icon: PenLine,
    blurb: "Task 1 and Task 2 under real exam timing.",
  },
  {
    key: "speaking",
    label: "Speaking",
    icon: Mic,
    blurb: "Part 1, 2 and 3 practice sessions.",
  },
];

export default function MockPracticePage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Mock Practice"
        title={
          <>
            Choose a <span className="gold-text">module</span>
          </>
        }
        description="Pick one of the four modules to start practicing."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map(({ key, label, icon: Icon, blurb }) => (
          <Link
            key={key}
            href={`/student/mock-practice/${key}`}
            className="panel panel-hover group"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
              <Icon className="h-6 w-6" />
            </span>
            <h3 className="mt-3 text-lg font-bold">{label}</h3>
            <p className="mt-1 text-sm text-white/60">{blurb}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold-300 transition-all group-hover:gap-2">
              Open module <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
