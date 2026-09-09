"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { CourseIcon } from "@/components/CourseCard";
import { useAuth } from "@/lib/auth";
import {
  COURSES,
  getCompletedLessons,
  isEnrolled,
  setEnrolled,
  lessonId,
  examLabel,
  formatPrice,
  getAnnouncements,
  Announcement,
  isLiveCourse,
  flattenClasses,
} from "@/lib/courses";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  CalendarDays,
  Layers,
  GraduationCap,
  Megaphone,
  ChevronDown,
  PlayCircle,
  Video,
  User,
  Trophy,
  Rocket,
} from "lucide-react";

export default function StudentCourseDetailPage() {
  const params = useParams<{ slug: string }>();
  const { user } = useAuth();
  const course = useMemo(
    () => COURSES.find((c) => c.slug === params.slug),
    [params.slug],
  );

  const [completed, setCompleted] = useState<string[]>([]);
  const [enrolled, setEnrolledLocal] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  // Which module dropdowns are expanded (recorded courses); first open by default.
  const [openModules, setOpenModules] = useState<Set<number>>(() => new Set([0]));

  useEffect(() => {
    if (!user || !course) return;
    setCompleted(getCompletedLessons(user.id, course.slug));
    setEnrolledLocal(isEnrolled(user.id, course.slug));
    setAnnouncements(getAnnouncements(course.slug));
  }, [user, course]);

  if (!course) {
    notFound();
  }
  if (!user) return null;

  const totalLessons = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const progress = totalLessons === 0 ? 0 : Math.round((completed.length / totalLessons) * 100);

  const toggleModule = (i: number) =>
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const live = isLiveCourse(course);

  const onEnroll = () => {
    setEnrolled(user.id, course.slug, true);
    setEnrolledLocal(true);
  };

  return (
    <div className="animate-fade-in">
      <Link href="/student/courses" className="btn-ghost mb-3 inline-flex">
        <ArrowLeft className="h-4 w-4" /> All courses
      </Link>

      <PageHeader
        eyebrow={examLabel(course.exam)}
        title={
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
              <CourseIcon slug={course.slug} className="h-5 w-5" />
            </span>
            {course.title}
          </span>
        }
        description={course.tagline}
        actions={
          enrolled ? (
            <span className="badge"><CheckCircle2 className="mr-1 h-3 w-3" /> Enrolled</span>
          ) : (
            <button onClick={onEnroll} className="btn-gold">
              Enroll for {formatPrice(course)}
            </button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {enrolled && progress === 100 && !live && (
            <div className="panel border-gold-500/40 bg-gold-500/5 animate-scale-in">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold-gradient text-ink-950 shadow-gold">
                  <Trophy className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-gold-100">Course complete — congratulations! 🎉</p>
                  <p className="text-sm text-white/70">
                    You’ve finished every class in {course.title}.
                  </p>
                </div>
              </div>
              <div className="mt-3 overflow-hidden rounded-lg border border-gold-500/20 bg-ink-900/50 py-1.5">
                <p className="animate-marquee whitespace-nowrap text-sm font-medium text-gold-200">
                  🌟 Outstanding work! Keep the momentum going — put your skills to the test with a full mock exam. 🌟 Outstanding work! Keep the momentum going — put your skills to the test with a full mock exam. 🌟
                </p>
              </div>
              <Link href="/student/mock-practice" className="btn-gold mt-3 w-full justify-center sm:w-auto">
                <Rocket className="h-4 w-4" /> Start mock practice now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {enrolled && (
            <div className="panel">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Your progress</p>
                <p className="text-sm text-gold-200">{progress}% · {completed.length}/{totalLessons} lessons</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gold-gradient transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {announcements.length > 0 && (
            <div className="panel">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gold-300/80">
                <Megaphone className="h-4 w-4" /> Course updates
              </h2>
              <ul className="mt-3 space-y-3">
                {announcements.map((a) => (
                  <li key={a.id} className="rounded-lg border border-white/10 bg-ink-800/50 p-3">
                    <p className="text-sm text-white/85">{a.message}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {a.by} · {new Date(a.at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-gold-300/80">
              {live ? "Live classes" : "Curriculum"}
            </h2>

            {live ? (
              // Live batch: a flat list of joinable live sessions — no recorded
              // video pages.
              <div className="space-y-3">
                {flattenClasses(course).map((cl, i) => {
                  const slot = course.schedule?.[i % course.schedule.length];
                  return (
                    <div
                      key={cl.id}
                      className="panel flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <h3 className="truncate font-bold">{cl.title}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-gold-400" />
                            {course.instructors[0]}
                          </span>
                          {slot && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5 text-gold-400" />
                              {slot.day}
                            </span>
                          )}
                          {slot && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-gold-400" />
                              {slot.time}
                            </span>
                          )}
                          <span className="text-white/40">{cl.moduleTitle}</span>
                        </div>
                      </div>
                      <a
                        href={`#join-${cl.id}`}
                        className="btn-gold whitespace-nowrap"
                        aria-disabled={!enrolled}
                      >
                        <Video className="h-4 w-4" /> Join class
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Recorded courses: module dropdowns; each class links to its video.
              <div className="space-y-3">
                {course.modules.map((m, i) => {
                  const moduleDone = m.lessons.every((_, li) =>
                    completed.includes(lessonId(i, li)),
                  );
                  const open = openModules.has(i);
                  return (
                    <div key={m.title} className="panel">
                      <button
                        type="button"
                        onClick={() => toggleModule(i)}
                        aria-expanded={open}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <p className="font-semibold">
                          <span className="text-gold-300 mr-2">{String(i + 1).padStart(2, "0")}</span>
                          {m.title}
                        </p>
                        <span className="flex items-center gap-2">
                          {moduleDone && (
                            <span className="badge">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Complete
                            </span>
                          )}
                          <span className="text-xs text-white/40">{m.lessons.length} classes</span>
                          <ChevronDown
                            className={`h-4 w-4 text-white/50 transition-transform ${
                              open ? "rotate-180" : ""
                            }`}
                          />
                        </span>
                      </button>

                      {open && (
                        <ul className="mt-3 space-y-2 text-sm">
                          {m.lessons.map((l, li) => {
                            const id = lessonId(i, li);
                            const done = completed.includes(id);
                            return (
                              <li
                                key={id}
                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition ${
                                  done
                                    ? "border-gold-500/40 bg-gold-500/10"
                                    : "border-white/10 hover:border-gold-400/40 hover:bg-white/5"
                                }`}
                              >
                                <span
                                  aria-label={done ? "Completed" : "Not completed"}
                                  title={done ? "Completed" : "Watch 5 minutes to complete"}
                                  className="shrink-0"
                                >
                                  {done ? (
                                    <CheckCircle2 className="h-4 w-4 text-gold-400" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-white/40" />
                                  )}
                                </span>
                                <Link
                                  href={`/student/courses/${course.slug}/classes/${id}`}
                                  className="flex min-w-0 flex-1 items-center gap-2"
                                >
                                  <span className={`flex-1 truncate ${done ? "text-gold-100" : ""}`}>
                                    {l}
                                  </span>
                                  <PlayCircle className="h-4 w-4 shrink-0 text-gold-400" />
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
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

          <div className="panel">
            <p className="text-xs uppercase tracking-wide text-white/40">Includes</p>
            <ul className="mt-2 space-y-1.5 text-sm text-white/80">
              {course.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </aside>
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
