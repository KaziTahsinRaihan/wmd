"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import CourseCard from "@/components/CourseCard";
import { COURSES } from "@/lib/courses";
import { ArrowLeft, ArrowRight } from "lucide-react";

const filters: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ielts", label: "IELTS" },
  { key: "pte", label: "PTE" },
  { key: "toefl", label: "TOEFL" },
  { key: "duolingo", label: "Duolingo" },
  { key: "general", label: "Foundation" },
];

import { useState } from "react";

export default function PublicCoursesPage() {
  const [active, setActive] = useState<string>("all");
  const list = COURSES.filter((c) => active === "all" || c.exam === active);

  return (
    <div className="relative min-h-screen bg-ink-950">
      <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-70" />
      <div className="relative mx-auto max-w-7xl px-6 py-6">
        <header className="flex items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <Link href="/signup" className="btn-gold">
              Sign up <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="mt-10">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              The full <span className="gold-text">course catalog</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-white/60">
              Six pathways across IELTS, PTE, TOEFL, and Duolingo English Test — plus a
              foundation track for absolute beginners.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setActive(f.key)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  active === f.key
                    ? "border-gold-400/60 bg-gold-500/15 text-gold-100"
                    : "border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {list.map((course) => (
              <CourseCard
                key={course.slug}
                course={course}
                href={`/courses/${course.slug}`}
                cta="View course"
              />
            ))}
          </div>

          {list.length === 0 && (
            <p className="mt-10 text-center text-white/50">No courses in that track yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
