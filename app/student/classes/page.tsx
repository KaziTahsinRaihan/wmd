"use client";

import PageHeader from "@/components/PageHeader";
import { enrolledClasses } from "@/lib/mock-data";
import { Calendar, Clock, User, Video } from "lucide-react";

export default function ClassesPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Join Class"
        title={<>Your <span className="gold-text">enrolled</span> live classes</>}
        description="Only classes from courses you’re currently enrolled in appear here."
      />

      <div className="space-y-3">
        {enrolledClasses.map((c) => {
          const isToday = c.date === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={c.id}
              className="panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-bold">{c.title}</h3>
                  {isToday && <span className="badge">Today</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-gold-400" /> {c.instructor}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-gold-400" /> {c.date}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-gold-400" /> {c.time} · {c.durationMin} min
                  </span>
                </div>
              </div>
              <a href={c.joinUrl} className="btn-gold whitespace-nowrap">
                <Video className="h-4 w-4" /> Join class
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
