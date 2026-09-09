"use client";

import Link from "next/link";
import { ArrowRight, Rocket, Trophy } from "lucide-react";
import Modal from "./Modal";

const CONFETTI = ["🎉", "✨", "🎊", "⭐", "🏆", "🌟", "🎈", "💫"];

// Repeated so the scrolling banner reads continuously as it crosses the box.
const SCROLL_MESSAGE =
  "🌟 Congratulations — you've completed every class! 🌟 You put in the work and it shows. 🌟 ";

export default function CourseCompleteCelebration({
  open,
  onClose,
  courseTitle,
}: {
  open: boolean;
  onClose: () => void;
  courseTitle: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="🎉 Course complete!"
      subtitle={`You finished every class in ${courseTitle}.`}
      maxWidth="max-w-xl"
    >
      <div className="relative overflow-hidden">
        {/* Confetti drifting up behind the content */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="absolute animate-float-up text-xl"
              style={{
                left: `${(i + 1) * 11}%`,
                animationDelay: `${i * 0.45}s`,
                animationDuration: `${6 + (i % 4)}s`,
              }}
            >
              {c}
            </span>
          ))}
        </div>

        <div className="relative">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold-gradient text-ink-950 shadow-gold">
            <Trophy className="h-8 w-8" />
          </div>

          {/* Scrolling congratulations message */}
          <div className="mt-5 overflow-hidden rounded-lg border border-gold-500/30 bg-ink-900/60 py-2">
            <p className="animate-marquee whitespace-nowrap font-semibold text-gold-200">
              {SCROLL_MESSAGE.repeat(3)}
            </p>
          </div>

          <p className="mt-5 text-center text-white/80">
            You've mastered the lessons — now it's time to prove it under real exam
            conditions. A full mock test is the fastest way to turn this preparation
            into a confident band score.
          </p>

          <Link
            href="/student/mock-practice"
            onClick={onClose}
            className="btn-gold mt-5 w-full justify-center"
          >
            <Rocket className="h-4 w-4" /> Start mock practice now
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button onClick={onClose} className="btn-ghost mt-2 w-full justify-center">
            Maybe later
          </button>
        </div>
      </div>
    </Modal>
  );
}
