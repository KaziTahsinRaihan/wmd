"use client";

import { useEffect, useState } from "react";
import { Sparkles, ShieldAlert, X } from "lucide-react";

const SHIMMER_DARK: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(100deg, #8a7235 0%, #c9a959 18%, #5e4c22 32%, #8a7235 48%, #c9a959 64%, #5e4c22 80%, #8a7235 100%)",
  backgroundSize: "200% 100%",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

function ScrollRoll({ position }: { position: "top" | "bottom" }) {
  const overlap = position === "top" ? "-mb-3" : "-mt-3";
  return (
    <div aria-hidden className={`relative z-20 mx-auto h-9 w-[97%] ${overlap}`}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "linear-gradient(180deg, #d3b35e 0%, #c9a959 20%, #8a7235 55%, #5e4c22 100%)",
          boxShadow:
            "inset 0 1.5px 1px rgba(255,237,180,0.55), inset 0 -2.5px 3px rgba(0,0,0,0.35), 0 8px 18px -6px rgba(0,0,0,0.55)",
        }}
      />
      <span className="absolute inset-x-5 top-1.5 h-1 rounded-full bg-white/25" />
      <span
        className="absolute -left-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #e8d595 0%, #a88c45 45%, #5e4c22 100%)",
          boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.4)",
        }}
      />
      <span
        className="absolute -right-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 65% 35%, #e8d595 0%, #a88c45 45%, #5e4c22 100%)",
          boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.4)",
        }}
      />
    </div>
  );
}

export default function ChatRoomNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chatroom-notice-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => setOpen(false)}
      />

      <div className="relative w-full max-w-xl animate-scale-in">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-10 -z-10 rounded-[2.5rem] bg-gold-500/25 blur-3xl animate-aura-pulse"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-gold-400/40 via-transparent to-gold-700/40 blur-2xl"
        />

        <div className="relative">
          <ScrollRoll position="top" />

          <div
            className="relative z-10 overflow-hidden border-y border-gold-800/50 px-8 py-10"
            style={{
              background:
                "linear-gradient(180deg, #efd99a 0%, #faecbf 12%, #f6e1a8 50%, #faecbf 88%, #efd99a 100%)",
              boxShadow:
                "inset 0 0 90px rgba(108,78,28,0.20), inset 0 14px 24px -10px rgba(80,55,20,0.35), inset 0 -14px 24px -10px rgba(80,55,20,0.35)",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notice"
              className="absolute right-4 top-4 rounded-lg p-1.5 transition hover:bg-gold-900/10"
              style={{ color: "#5e4c22" }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex flex-col items-center text-center">
              <div className="relative mb-5">
                <span
                  aria-hidden
                  className="absolute inset-0 -m-3 rounded-full bg-gold-500/35 blur-2xl animate-aura-pulse"
                />
                <span
                  className="relative inline-block text-5xl animate-wand-wiggle"
                  style={{
                    filter: "drop-shadow(0 0 14px rgba(201,169,89,0.85))",
                    transformOrigin: "70% 70%",
                  }}
                >
                  📜
                </span>
              </div>

              <div
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold-800/40 px-3 py-1 text-xs uppercase tracking-[0.22em]"
                style={{ background: "rgba(201,169,89,0.20)", color: "#5e4c22" }}
              >
                <ShieldAlert className="h-3 w-3" />
                ChatRoom code
              </div>

              <h2
                id="chatroom-notice-title"
                className="animate-shimmer text-2xl font-black leading-tight tracking-tight sm:text-3xl"
                style={SHIMMER_DARK}
              >
                A pact for the chamber
              </h2>

              <p
                className="mt-5 max-w-md text-base leading-relaxed"
                style={{ color: "#3d3216" }}
              >
                This ChatRoom is only for educational purposes. Any sort of
                promotion, defamation, bullying or harassment and mentioning any
                other institution are strongly discouraged. Infringement of this
                rule may result into permanent ban. Be careful, Wizards!
              </p>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-gold mt-7 px-6 py-2.5"
              >
                <Sparkles className="h-4 w-4" />
                I understand
              </button>

              <p
                className="mt-3 text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "#8a7235" }}
              >
                Press Esc or tap outside to dismiss
              </p>
            </div>
          </div>

          <ScrollRoll position="bottom" />
        </div>
      </div>
    </div>
  );
}
