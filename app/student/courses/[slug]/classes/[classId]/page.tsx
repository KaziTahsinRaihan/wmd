"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  COURSES,
  SAMPLE_CAPTIONS_URL,
  SAMPLE_VIDEO_URL,
  flattenClasses,
  getClass,
  getCompletedLessons,
  isLiveCourse,
  setLessonComplete,
} from "@/lib/courses";
import VideoPlayer from "@/components/VideoPlayer";
import ClassComments from "@/components/ClassComments";
import CourseCompleteCelebration from "@/components/CourseCompleteCelebration";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react";

// A class counts as completed once the viewer has watched this many seconds.
const COMPLETE_AFTER_SECONDS = 5 * 60;

export default function ClassVideoPage() {
  const params = useParams<{ slug: string; classId: string }>();
  const { user } = useAuth();
  const [wide, setWide] = useState(false);
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());
  const [celebrate, setCelebrate] = useState(false);

  const course = useMemo(
    () => COURSES.find((c) => c.slug === params.slug),
    [params.slug],
  );
  const klass = useMemo(
    () => (course ? getClass(course, params.classId) : null),
    [course, params.classId],
  );
  const classes = useMemo(() => (course ? flattenClasses(course) : []), [course]);

  useEffect(() => {
    if (user && course) {
      setCompletedSet(new Set(getCompletedLessons(user.id, course.slug)));
    }
  }, [user, course]);

  // Watched-enough → mark complete. Celebrate only on the transition that
  // finishes the whole course (guarded so re-watching never re-fires it).
  const handleComplete = useCallback(() => {
    if (!user || !course || !klass) return;
    if (completedSet.has(klass.id)) return;
    setLessonComplete(user.id, course.slug, klass.id, true);
    const next = new Set(completedSet);
    next.add(klass.id);
    setCompletedSet(next);
    if (classes.length > 0 && classes.every((c) => next.has(c.id))) {
      setCelebrate(true);
    }
  }, [user, course, klass, classes, completedSet]);

  // Live courses run live sessions, not recorded video pages.
  if (!course || isLiveCourse(course) || !klass) {
    notFound();
  }
  if (!user) return null;

  const idx = classes.findIndex((c) => c.id === klass.id);
  const prev = idx > 0 ? classes[idx - 1] : null;
  const next = idx < classes.length - 1 ? classes[idx + 1] : null;
  const done = completedSet.has(klass.id);

  return (
    <div className="animate-fade-in">
      <Link href={`/student/courses/${course.slug}`} className="btn-ghost mb-3 inline-flex">
        <ArrowLeft className="h-4 w-4" /> {course.title}
      </Link>

      <div className={`mx-auto ${wide ? "max-w-none" : "max-w-4xl"}`}>
        {/* Breadcrumb */}
        <p className="mb-2 flex flex-wrap items-center gap-1.5 text-xs uppercase tracking-wide text-white/45">
          <GraduationCap className="h-3.5 w-3.5 text-gold-400" />
          {course.title}
          <span className="text-white/25">/</span>
          {klass.moduleTitle}
        </p>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold sm:text-2xl">
            <span className="text-gold-300">
              {String(klass.lessonIdx + 1).padStart(2, "0")}.
            </span>{" "}
            {klass.title}
          </h1>
          {done && (
            <span className="badge shrink-0">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
            </span>
          )}
        </div>

        <VideoPlayer
          key={klass.id}
          src={SAMPLE_VIDEO_URL}
          captionsSrc={SAMPLE_CAPTIONS_URL}
          completeAfterSeconds={COMPLETE_AFTER_SECONDS}
          onComplete={handleComplete}
          wide={wide}
          onToggleWide={() => setWide((w) => !w)}
        />
        {!done && (
          <p className="mt-2 text-center text-xs text-white/45">
            Watch 5 minutes of this class and it’s marked complete automatically.
          </p>
        )}

        {/* Prev / next class */}
        <div className="mt-4 flex items-center justify-between gap-3">
          {prev ? (
            <Link
              href={`/student/courses/${course.slug}/classes/${prev.id}`}
              className="btn-ghost min-w-0 flex-1 justify-start"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate text-left">{prev.title}</span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <Link
              href={`/student/courses/${course.slug}/classes/${next.id}`}
              className="btn-ghost min-w-0 flex-1 justify-end"
            >
              <span className="min-w-0 truncate text-right">{next.title}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
          ) : (
            <span className="flex-1" />
          )}
        </div>

        <div className="mt-6">
          <ClassComments slug={course.slug} classId={klass.id} />
        </div>
      </div>

      <CourseCompleteCelebration
        open={celebrate}
        onClose={() => setCelebrate(false)}
        courseTitle={course.title}
      />
    </div>
  );
}
