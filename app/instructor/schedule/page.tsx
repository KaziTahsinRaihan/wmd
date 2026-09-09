"use client";

import PageHeader from "@/components/PageHeader";
import { instructorSchedule } from "@/lib/mock-data";
import { CalendarDays, Clock, Users } from "lucide-react";

export default function SchedulePage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Upcoming Schedule"
        title={<>Your <span className="gold-text">upcoming</span> sessions</>}
        description="Sessions you’re leading over the coming weeks."
      />

      <div className="overflow-hidden rounded-2xl border border-gold-500/20 bg-ink-900/60 backdrop-blur">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead className="bg-ink-800/60">
            <tr className="text-left text-xs uppercase tracking-wide text-white/50">
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Cohort</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Seats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {instructorSchedule.map((s) => (
              <tr key={s.id} className="hover:bg-white/5 transition">
                <td className="px-4 py-3 font-semibold">{s.title}</td>
                <td className="px-4 py-3 text-white/70">{s.cohort}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-white/70">
                    <CalendarDays className="h-3.5 w-3.5 text-gold-400" /> {s.date}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-white/70">
                    <Clock className="h-3.5 w-3.5 text-gold-400" /> {s.time}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-white/70">
                    <Users className="h-3.5 w-3.5 text-gold-400" /> {s.seats}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
