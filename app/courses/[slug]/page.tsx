"use client";

import { useMemo } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { CourseIcon } from "@/components/CourseCard";
import {
  COURSES,
  examLabel,
  formatPrice,
  formatOriginalPrice,
  discountPercent,
} from "@/lib/courses";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  CalendarDays,
  Layers,
} from "lucide-react";

export default function PublicCourseDetailPage() {
  const params = useParams<{ slug: string }>();
  const course = useMemo(
    () => COURSES.find((c) => c.slug === params.slug),
    [params.slug],
  );

  if (!course) {
    notFound();
  }

  return (
    <div className="relative min-h-screen bg-ink-950">
      <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-70" />
      <div className="relative mx-auto max-w-6xl px-6 py-6">
        <header className="flex items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/courses" className="btn-ghost">
              <ArrowLeft className="h-4 w-4" /> All courses
            </Link>
            <Link href="/signup" className="btn-gold">
              Enroll now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold-gradient text-ink-950 shadow-gold">
                <CourseIcon slug={course.slug} className="h-7 w-7" />
              </span>
              <div>
                <span className="badge">{examLabel(course.exam)}</span>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">{course.title}</h1>
              </div>
            </div>
            <p className="mt-4 text-lg text-white/80">{course.tagline}</p>
            <p className="mt-3 text-white/70">{course.description}</p>

            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-300/80">
                What you'll get
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {course.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-300/80">
                Curriculum
              </h2>
              <div className="mt-3 space-y-3">
                {course.modules.map((m, i) => (
                  <details key={m.title} className="panel" open={i === 0}>
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          <span className="text-gold-300 mr-2">{String(i + 1).padStart(2, "0")}</span>
                          {m.title}
                        </span>
                        <span className="text-xs text-white/50">{m.lessons.length} lessons</span>
                      </div>
                    </summary>
                    <ul className="mt-3 space-y-1.5 text-sm text-white/75">
                      {m.lessons.map((l) => (
                        <li key={l} className="flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5 text-gold-400" /> {l}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="panel">
              <p className="text-xs uppercase tracking-wide text-white/40">From</p>
              <div className="mt-1 flex items-baseline gap-3">
                <p className="text-4xl font-black gold-text">{formatPrice(course)}</p>
                {discountPercent(course) > 0 && (
                  <p className="text-lg text-white/45 line-through">
                    {formatOriginalPrice(course)}
                  </p>
                )}
              </div>
              {discountPercent(course) > 0 && (
                <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-gold-500/40 bg-gold-500/10 px-2 py-0.5 text-xs font-semibold text-gold-200">
                  Save {discountPercent(course)}% — limited offer
                </p>
              )}
              <p className="mt-2 text-xs text-white/50">One-time enrollment fee</p>

              <Link href="/signup" className="btn-gold mt-5 w-full">
                Sign up to enroll <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="btn-outline mt-2 w-full"
              >
                I already have an account
              </Link>
            </div>

            <div className="panel space-y-3 text-sm">
              <Row icon={Clock} label="Format">
                {course.format === "live"
                  ? "Live cohort"
                  : course.format === "hybrid"
                  ? "Hybrid"
                  : "Self-paced online"}
              </Row>
              <Row icon={CalendarDays} label="Duration">
                {course.durationWeeks} weeks · {course.lessonsCount} lessons
              </Row>
              <Row icon={Layers} label="Level">
                {course.level}
              </Row>
              <Row icon={GraduationCap} label="Instructors">
                {course.instructors.join(", ")}
              </Row>
              {course.startDate && (
                <Row icon={CalendarDays} label="Next start">
                  {new Date(course.startDate).toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Row>
              )}
              {course.schedule && (
                <Row icon={Clock} label="Live sessions">
                  <ul className="space-y-0.5">
                    {course.schedule.map((s) => (
                      <li key={`${s.day}-${s.time}`}>{s.day} · {s.time}</li>
                    ))}
                  </ul>
                </Row>
              )}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-gold-400" />
      <div>
        <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
        <div className="font-medium text-white/85">{children}</div>
      </div>
    </div>
  );
}
