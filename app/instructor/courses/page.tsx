"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { CourseIcon } from "@/components/CourseCard";
import { useAuth } from "@/lib/auth";
import {
  COURSES,
  examLabel,
  getAnnouncements,
  addAnnouncement,
  deleteAnnouncement,
  Announcement,
  getEnrollments,
} from "@/lib/courses";
import { Megaphone, Trash2, Users, Clock, CalendarDays, Layers } from "lucide-react";

export default function InstructorCoursesPage() {
  const { user } = useAuth();

  const myCourses = useMemo(() => {
    if (!user) return [];
    return COURSES.filter((c) => c.instructors.includes(user.name));
  }, [user]);

  if (!user) return null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Teaching"
        title={<>Your <span className="gold-text">courses</span></>}
        description="Courses you're listed as instructor for. Post updates that students see on their course page."
      />

      {myCourses.length === 0 ? (
        <div className="panel">
          <p className="text-white/70">
            You're not assigned to any courses yet. Reach out to an admin to be added to a course's instructor roster.
          </p>
          <p className="mt-2 text-xs text-white/50">
            Note: assignment is based on display-name matching for the demo. The seeded
            instructor name is <span className="gold-text font-semibold">Mr. Daniel Cole</span>.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {myCourses.map((course) => (
            <CourseTeachingPanel key={course.slug} course={course} authorName={user.name} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseTeachingPanel({ course, authorName }: { course: typeof COURSES[number]; authorName: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [message, setMessage] = useState("");
  const [enrolledCount, setEnrolledCount] = useState(0);

  useEffect(() => {
    setAnnouncements(getAnnouncements(course.slug));
    setEnrolledCount(countEnrollmentsAcrossUsers(course.slug));
  }, [course.slug]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    const next = addAnnouncement(course.slug, authorName, trimmed);
    setAnnouncements(next);
    setMessage("");
  };

  const remove = (id: string) => {
    const next = deleteAnnouncement(course.slug, id);
    setAnnouncements(next);
  };

  return (
    <div className="panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
          <CourseIcon slug={course.slug} className="h-7 w-7" />
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{course.title}</h3>
            <span className="badge">{examLabel(course.exam)}</span>
            <span className="badge">
              {course.format === "live" ? "Live cohort" : course.format === "hybrid" ? "Hybrid" : "Self-paced"}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/65">{course.tagline}</p>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={Users} label="Enrolled" value={`${enrolledCount}`} />
            <Stat icon={Layers} label="Modules" value={`${course.modules.length}`} />
            <Stat icon={CalendarDays} label="Duration" value={`${course.durationWeeks} wks`} />
            <Stat
              icon={Clock}
              label="Schedule"
              value={
                course.schedule
                  ? course.schedule.map((s) => `${s.day.slice(0, 3)} ${s.time}`).join(" · ")
                  : "On demand"
              }
            />
          </dl>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold-300/80">
            Curriculum
          </h4>
          <ul className="space-y-1.5 text-sm text-white/75">
            {course.modules.map((m, i) => (
              <li key={m.title} className="flex items-start gap-2">
                <span className="text-gold-300">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="font-medium text-white/90">{m.title}</span>
                  <span className="text-white/50"> — {m.lessons.length} lessons</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gold-300/80">
            <Megaphone className="h-4 w-4" /> Course updates
          </h4>
          <form onSubmit={submit} className="space-y-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Post an update for enrolled students…"
              rows={3}
              className="input-field resize-none"
            />
            <button type="submit" className="btn-gold !py-2 !px-3 text-sm" disabled={!message.trim()}>
              Post update
            </button>
          </form>

          <ul className="mt-4 space-y-2">
            {announcements.length === 0 && (
              <p className="text-xs text-white/50">No updates posted yet.</p>
            )}
            {announcements.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-ink-800/50 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white/85">{a.message}</p>
                  <p className="mt-1 text-xs text-white/50">
                    {a.by} · {new Date(a.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  aria-label="Delete update"
                  className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-800/40 px-3 py-2">
      <p className="flex items-center gap-1 text-xs text-white/50">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function countEnrollmentsAcrossUsers(slug: string): number {
  if (typeof window === "undefined") return 0;
  let count = 0;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith("wise-mans-doctrine:enrollments:")) continue;
    try {
      const list = JSON.parse(window.localStorage.getItem(key) || "[]") as string[];
      if (list.includes(slug)) count++;
    } catch {
      /* ignore */
    }
  }
  return count;
}
