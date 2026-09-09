"use client";

// Placeholder module page for the Mock Practice section. The exam interface
// and questions for each module will be added here later.

import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { Headphones, BookOpen, PenLine, Mic, ArrowLeft, Hammer } from "lucide-react";

const MODULES = {
  listening: { label: "Listening", icon: Headphones },
  reading: { label: "Reading", icon: BookOpen },
  writing: { label: "Writing", icon: PenLine },
  speaking: { label: "Speaking", icon: Mic },
} as const;

type ModuleKey = keyof typeof MODULES;

export default function MockPracticeModulePage({
  params,
}: {
  params: { module: string };
}) {
  const mod = MODULES[params.module as ModuleKey];
  if (!mod) notFound();
  const Icon = mod.icon;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Mock Practice"
        title={
          <>
            <span className="gold-text">{mod.label}</span> practice
          </>
        }
        description={`${mod.label} mock practice for the four-module doctrine.`}
      />

      <div className="panel flex flex-col items-center gap-4 py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gold-gradient text-ink-950 shadow-gold">
          <Icon className="h-8 w-8" />
        </span>
        <div>
          <h3 className="text-xl font-bold">Coming soon</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
            The {mod.label.toLowerCase()} practice interface and questions are
            being prepared. Check back here once they are published.
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
          <Hammer className="h-3.5 w-3.5" /> Under construction
        </div>
        <Link href="/student/mock-practice" className="btn-outline mt-4">
          <ArrowLeft className="h-4 w-4" /> Back to Mock Practice
        </Link>
      </div>
    </div>
  );
}
