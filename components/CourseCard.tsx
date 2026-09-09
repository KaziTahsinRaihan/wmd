"use client";

import Link from "next/link";
import {
  BookMarked,
  Globe2,
  Users,
  MonitorPlay,
  ScrollText,
  Languages,
  Clock,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import {
  Course,
  examLabel,
  formatPrice,
  formatOriginalPrice,
  discountPercent,
} from "@/lib/courses";

const ICONS: Record<string, any> = {
  "basic-english": BookMarked,
  "ielts-online": Globe2,
  "ielts-live-batch": Users,
  "pte-online": MonitorPlay,
  "toefl-online": ScrollText,
  "duolingo-online": Languages,
};

export function CourseIcon({ slug, className = "h-6 w-6" }: { slug: string; className?: string }) {
  const Icon = ICONS[slug] ?? BookMarked;
  return <Icon className={className} />;
}

export default function CourseCard({
  course,
  href,
  cta = "Learn more",
  footer,
}: {
  course: Course;
  href: string;
  cta?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="panel panel-hover flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
          <CourseIcon slug={course.slug} />
        </span>
        <span className="badge">{examLabel(course.exam)}</span>
      </div>

      <h3 className="text-lg font-bold tracking-tight">{course.title}</h3>
      <p className="mt-1 text-sm text-white/70">{course.tagline}</p>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg border border-white/10 px-2 py-2">
          <dt className="text-white/50">Duration</dt>
          <dd className="mt-0.5 font-semibold">{course.durationWeeks} wks</dd>
        </div>
        <div className="rounded-lg border border-white/10 px-2 py-2">
          <dt className="text-white/50">Lessons</dt>
          <dd className="mt-0.5 font-semibold">{course.lessonsCount}</dd>
        </div>
        <div className="rounded-lg border border-white/10 px-2 py-2">
          <dt className="text-white/50">Level</dt>
          <dd className="mt-0.5 font-semibold">{course.level}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/60">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {course.format === "live" ? "Live cohort" : course.format === "hybrid" ? "Hybrid" : "Self-paced"}
        </span>
        <span className="inline-flex items-center gap-1">
          <GraduationCap className="h-3.5 w-3.5" />
          {course.instructors[0]}
          {course.instructors.length > 1 ? ` +${course.instructors.length - 1}` : ""}
        </span>
      </div>

      <div className="mt-auto flex items-end justify-between pt-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/40">From</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black gold-text">{formatPrice(course)}</p>
            {discountPercent(course) > 0 && (
              <span className="text-sm text-white/45 line-through">
                {formatOriginalPrice(course)}
              </span>
            )}
          </div>
          {discountPercent(course) > 0 && (
            <p className="mt-0.5 text-[11px] font-semibold text-gold-300">
              Save {discountPercent(course)}%
            </p>
          )}
        </div>
        <Link href={href} className="btn-outline !py-2 !px-3 text-sm">
          {cta} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {footer && <div className="mt-4 border-t border-white/10 pt-4">{footer}</div>}
    </div>
  );
}
