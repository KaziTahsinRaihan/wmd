"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import CourseCard, { CourseIcon } from "@/components/CourseCard";
import { useAuth } from "@/lib/auth";
import {
  COURSES,
  getCourses,
  getEnrollments,
  setEnrolled as setEnrolledStore,
  getProgressPercent,
  examLabel,
  formatPrice,
} from "@/lib/courses";
import { ArrowRight, CheckCircle2 } from "lucide-react";

type Tab = "browse" | "mine";

export default function StudentCoursesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("mine");
  const [enrollments, setEnrollments] = useState<string[]>([]);
  const [tick, setTick] = useState(0);

  const courses = useMemo(() => getCourses(), [tick]);

  useEffect(() => {
    if (!user) return;
    setEnrollments(getEnrollments(user.id));
  }, [user, tick]);

  if (!user) return null;

  const enrolled = courses.filter((c) => enrollments.includes(c.slug));
  const available = courses.filter((c) => !enrollments.includes(c.slug));

  const toggle = (slug: string, on: boolean) => {
    setEnrolledStore(user.id, slug, on);
    setTick((t) => t + 1);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="My Curriculum"
        title={<>Your <span className="gold-text">courses</span></>}
        description="Enroll in any course to unlock its lessons. Your progress is saved per course."
      />

      <div className="mb-6 inline-flex rounded-xl border border-white/10 bg-ink-900/40 p-1 text-sm">
        <TabBtn active={tab === "mine"} onClick={() => setTab("mine")}>
          My courses ({enrolled.length})
        </TabBtn>
        <TabBtn active={tab === "browse"} onClick={() => setTab("browse")}>
          Browse catalog
        </TabBtn>
      </div>

      {tab === "mine" && (
        <>
          {enrolled.length === 0 ? (
            <div className="panel text-center">
              <p className="text-white/70">
                You haven't enrolled in any courses yet.
              </p>
              <button
                onClick={() => setTab("browse")}
                className="btn-gold mt-4"
              >
                Browse catalog <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {enrolled.map((course) => {
                const progress = getProgressPercent(user.id, course);
                return (
                  <div key={course.slug} className="panel panel-hover">
                    <div className="flex items-start gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
                        <CourseIcon slug={course.slug} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold tracking-tight">{course.title}</h3>
                          <span className="badge">{examLabel(course.exam)}</span>
                        </div>
                        <p className="mt-1 text-sm text-white/65">{course.tagline}</p>

                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/50">Progress</span>
                            <span className="font-semibold text-gold-200">{progress}%</span>
                          </div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gold-gradient transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={`/student/courses/${course.slug}`}
                            className="btn-gold !py-2 !px-3 text-sm"
                          >
                            {progress === 0 ? "Start course" : "Continue"}{" "}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Unenroll from ${course.title}?`)) {
                                toggle(course.slug, false);
                              }
                            }}
                            className="btn-ghost"
                          >
                            Unenroll
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "browse" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {COURSES.map((course) => {
            const isEnrolled = enrollments.includes(course.slug);
            return (
              <CourseCard
                key={course.slug}
                course={course}
                href={`/student/courses/${course.slug}`}
                cta="View details"
                footer={
                  <button
                    type="button"
                    onClick={() => toggle(course.slug, !isEnrolled)}
                    className={isEnrolled ? "btn-ghost w-full" : "btn-gold w-full"}
                  >
                    {isEnrolled ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Enrolled — Unenroll
                      </>
                    ) : (
                      <>Enroll for {formatPrice(course)}</>
                    )}
                  </button>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 transition ${
        active ? "bg-gold-500/15 text-gold-100 border border-gold-500/30" : "text-white/70 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
