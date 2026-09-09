"use client";

import { useState } from "react";
import Modal from "./Modal";
import { useAuth } from "@/lib/auth";
import { Target } from "lucide-react";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const bands = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

export default function TargetScoreModal() {
  const { user, updateProfile } = useAuth();
  const open =
    !!user && user.role === "student" && !user.onboarded;

  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState<string>(months[new Date().getMonth()]);
  const [year, setYear] = useState<number>(currentYear);
  const [score, setScore] = useState<number>(7);

  if (!user) return null;

  const submit = () => {
    updateProfile({
      onboarded: true,
      targetMonth: month,
      targetYear: year,
      targetScore: score,
    });
  };

  return (
    <Modal
      open={open}
      onClose={() => undefined}
      closeable={false}
      title="Set your IELTS target"
      subtitle="Tell us when you plan to sit the test and what band you’re aiming for. We’ll personalize your prep plan."
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-gold-500/20 bg-ink-800/60 p-3 text-sm">
          <Target className="h-5 w-5 text-gold-400" />
          <span className="text-white/80">
            Welcome, <span className="font-semibold text-white">{user.name}</span> — let’s map your journey.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">
              Test month
            </span>
            <select
              className="input-field"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-white/50">
              Test year
            </span>
            <select
              className="input-field"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[currentYear, currentYear + 1, currentYear + 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <span className="mb-2 block text-xs uppercase tracking-wide text-white/50">
            Target band score
          </span>
          <div className="grid grid-cols-5 gap-2">
            {bands.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setScore(b)}
                className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                  score === b
                    ? "border-gold-400 bg-gold-gradient text-ink-950 shadow-gold"
                    : "border-gold-500/20 bg-ink-800/60 text-white/80 hover:border-gold-400/60"
                }`}
              >
                {b.toFixed(1)}
              </button>
            ))}
          </div>
        </div>

        <button onClick={submit} className="btn-gold w-full">
          Lock in my goal
        </button>
      </div>
    </Modal>
  );
}
