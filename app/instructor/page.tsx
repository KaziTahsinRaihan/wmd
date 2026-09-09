"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import {
  instructorSchedule,
  writingSubmissions,
  speakingSubmissions,
} from "@/lib/mock-data";
import {
  ArrowRight,
  CalendarDays,
  FileCheck,
  Mic,
  Video,
} from "lucide-react";

export default function InstructorOverview() {
  const { user } = useAuth();
  if (!user) return null;

  const nextClass = instructorSchedule[0];

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Instructor workspace"
        title={
          <>
            Welcome, <span className="gold-text">{user.name.split(" ").slice(-1)}</span>
          </>
        }
        description="Today’s evaluations and your next class at a glance."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel">
          <FileCheck className="h-6 w-6 text-gold-400" />
          <p className="mt-3 text-xs uppercase tracking-wide text-white/50">
            Writing submissions
          </p>
          <p className="mt-1 text-3xl font-bold gold-text">{writingSubmissions.length}</p>
          <p className="text-xs text-white/50">Task 1 + Task 2 to grade</p>
        </div>
        <div className="panel">
          <Mic className="h-6 w-6 text-gold-400" />
          <p className="mt-3 text-xs uppercase tracking-wide text-white/50">
            Speaking submissions
          </p>
          <p className="mt-1 text-3xl font-bold gold-text">{speakingSubmissions.length}</p>
          <p className="text-xs text-white/50">Audio responses queued</p>
        </div>
        <div className="panel">
          <CalendarDays className="h-6 w-6 text-gold-400" />
          <p className="mt-3 text-xs uppercase tracking-wide text-white/50">
            Next class
          </p>
          <p className="mt-1 font-semibold leading-snug">{nextClass.title}</p>
          <p className="text-xs text-white/50">
            {nextClass.date} · {nextClass.time}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Link href="/instructor/scripts" className="panel panel-hover group">
          <h3 className="text-lg font-bold">Check Scripts</h3>
          <p className="mt-1 text-sm text-white/60">
            Grade student writing tasks with the official IELTS band descriptors.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold-300 group-hover:gap-2 transition-all">
            Open queue <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
        <Link href="/instructor/speaking" className="panel panel-hover group">
          <h3 className="text-lg font-bold">Evaluate Speaking Tests</h3>
          <p className="mt-1 text-sm text-white/60">
            Listen to recordings and provide band-level feedback by criterion.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold-300 group-hover:gap-2 transition-all">
            Open queue <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
        <Link href="/instructor/class" className="panel panel-hover group">
          <h3 className="text-lg font-bold">Conduct Class</h3>
          <p className="mt-1 text-sm text-white/60">
            Launch a live class room for any scheduled session.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold-300 group-hover:gap-2 transition-all">
            <Video className="h-4 w-4" /> Start a class
          </span>
        </Link>
        <Link href="/instructor/availability" className="panel panel-hover group">
          <h3 className="text-lg font-bold">Speaking Availability</h3>
          <p className="mt-1 text-sm text-white/60">
            Publish or update the dates and times you’re free for speaking mocks.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold-300 group-hover:gap-2 transition-all">
            Update availability <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>
    </div>
  );
}
