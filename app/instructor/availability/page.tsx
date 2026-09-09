"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { CalendarDays, Clock, Plus, Trash2 } from "lucide-react";

type Slot = { id: string; date: string; time: string };

const initial: Slot[] = [
  { id: "a-1", date: "2026-05-28", time: "16:00" },
  { id: "a-2", date: "2026-05-28", time: "17:00" },
  { id: "a-3", date: "2026-05-30", time: "11:00" },
];

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>(initial);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saved, setSaved] = useState(false);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return;
    setSlots([...slots, { id: `a-${Date.now()}`, date, time }]);
    setDate("");
    setTime("");
    setSaved(false);
  };

  const remove = (id: string) => {
    setSlots(slots.filter((s) => s.id !== id));
    setSaved(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Speaking Availability"
        title={<>Publish your <span className="gold-text">speaking</span> mock slots</>}
        description="Students see these slots when they choose ‘Book with Instructor’."
      />

      <form onSubmit={add} className="panel">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-white/40">Date</span>
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-white/40">Time</span>
            <input
              type="time"
              className="input-field"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <button className="btn-gold">
            <Plus className="h-4 w-4" /> Add slot
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((s) => (
          <div
            key={s.id}
            className="panel flex items-center justify-between"
          >
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-gold-400" /> {s.date}
              </p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm text-white/70">
                <Clock className="h-4 w-4 text-gold-400" /> {s.time}
              </p>
            </div>
            <button
              onClick={() => remove(s.id)}
              className="rounded-lg p-2 text-white/50 hover:bg-red-500/15 hover:text-red-300 transition"
              aria-label="Remove slot"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-white/40">
          {slots.length} slot{slots.length === 1 ? "" : "s"} published
        </p>
        <button
          onClick={() => setSaved(true)}
          className="btn-gold"
        >
          Save availability
        </button>
      </div>
      {saved && (
        <p className="mt-3 text-sm text-gold-300">✓ Availability updated.</p>
      )}
    </div>
  );
}
