"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Sparkle, Star, X } from "lucide-react";
import { useAuth } from "@/lib/auth";

const SESSION_KEY_PREFIX = "wise-mans-doctrine:wizard-welcome-seen";

// Reused for the title and the word "Wizards" — a moving antique-gold
// shimmer that reads against the parchment background on both themes.
const SHIMMER_DARK: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(100deg, #8a7235 0%, #c9a959 18%, #5e4c22 32%, #8a7235 48%, #c9a959 64%, #5e4c22 80%, #8a7235 100%)",
  backgroundSize: "200% 100%",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

// The rolled cylinder at top/bottom of the scroll — a horizontal pill with
// rounded "wooden" end caps and a highlight stripe for a 3-D feel.
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
      {/* highlight stripe */}
      <span className="absolute inset-x-5 top-1.5 h-1 rounded-full bg-white/25" />
      {/* end caps - small spheres that look like the rod ends */}
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

type Spark = {
  id: number;
  top: string;
  left: string;
  size: number;
  delay: string;
  duration: string;
  kind: "sparkle" | "star" | "dot";
  drift: number;
};

function useSparks(count: number): Spark[] {
  return useMemo(() => {
    const rand = mulberry32(0xa11ce);
    return Array.from({ length: count }, (_, i) => {
      const r = rand();
      const kind: Spark["kind"] =
        r < 0.5 ? "sparkle" : r < 0.85 ? "star" : "dot";
      return {
        id: i,
        top: `${(rand() * 100).toFixed(2)}%`,
        left: `${(rand() * 100).toFixed(2)}%`,
        size: 10 + Math.floor(rand() * 18),
        delay: `${(rand() * 4).toFixed(2)}s`,
        duration: `${(2 + rand() * 3).toFixed(2)}s`,
        kind,
        drift: Math.floor(rand() * 60 - 30),
      };
    });
  }, [count]);
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function WizardWelcome() {
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const sparks = useSparks(34);
  const risers = useSparks(14);

  const sessionKey = `${SESSION_KEY_PREFIX}:${user?.id ?? "guest"}`;

  useEffect(() => {
    if (!ready) return;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(sessionKey) === "1") return;
    const t = setTimeout(() => setOpen(true), 220);
    return () => clearTimeout(t);
  }, [ready, sessionKey]);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(sessionKey, "1");
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-welcome-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={dismiss}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {risers.map((s) => (
          <span
            key={`r-${s.id}`}
            className="absolute animate-float-up text-gold-200"
            style={{
              left: s.left,
              bottom: `-${s.size}px`,
              fontSize: s.size,
              animationDelay: s.delay,
              animationDuration: s.duration,
              filter: "drop-shadow(0 0 6px rgba(201,169,89,0.75))",
            }}
          >
            {s.kind === "star" ? (
              <Star className="h-[1em] w-[1em] fill-current" />
            ) : s.kind === "sparkle" ? (
              <Sparkle className="h-[1em] w-[1em] fill-current" />
            ) : (
              <span className="block h-[0.45em] w-[0.45em] rounded-full bg-current" />
            )}
          </span>
        ))}
      </div>

      <div className="relative w-full max-w-xl animate-scale-in">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-10 -z-10 rounded-[2.5rem] bg-gold-500/25 blur-3xl animate-aura-pulse"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-gold-400/40 via-transparent to-gold-700/40 blur-2xl"
        />

        {/* ====================== ANCIENT SCROLL ====================== */}
        <div className="relative">
          {/* Top scroll roll */}
          <ScrollRoll position="top" />

          {/* Parchment body */}
          <div
            className="relative z-10 overflow-hidden border-y border-gold-800/50 px-8 py-10"
            style={{
              background:
                "linear-gradient(180deg, #efd99a 0%, #faecbf 12%, #f6e1a8 50%, #faecbf 88%, #efd99a 100%)",
              boxShadow:
                "inset 0 0 90px rgba(108,78,28,0.20), inset 0 14px 24px -10px rgba(80,55,20,0.35), inset 0 -14px 24px -10px rgba(80,55,20,0.35)",
            }}
          >
            {/* Inner sparkles - darker so they read on parchment */}
            <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
              {sparks.map((s) => (
                <span
                  key={`s-${s.id}`}
                  className="absolute animate-sparkle"
                  style={{
                    top: s.top,
                    left: s.left,
                    fontSize: s.size,
                    color: "#a88c45",
                    animationDelay: s.delay,
                    animationDuration: s.duration,
                    filter: "drop-shadow(0 0 5px rgba(232,213,149,0.95))",
                  }}
                >
                  {s.kind === "star" ? (
                    <Star className="h-[1em] w-[1em] fill-current" />
                  ) : s.kind === "sparkle" ? (
                    <Sparkle className="h-[1em] w-[1em] fill-current" />
                  ) : (
                    <span className="block h-[0.35em] w-[0.35em] rounded-full bg-current" />
                  )}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Close welcome"
              className="absolute right-4 top-4 rounded-lg p-1.5 transition hover:bg-gold-900/10"
              style={{ color: "#5e4c22" }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex flex-col items-center text-center">
              {/* Scroll icon */}
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
                <Sparkles className="h-3 w-3" />
                Welcome, traveller
              </div>

              <h2
                id="wizard-welcome-title"
                className="animate-shimmer text-3xl font-black leading-tight tracking-tight sm:text-4xl"
                style={SHIMMER_DARK}
              >
                Scroll for new arrivals
              </h2>

              <p
                className="mt-5 max-w-md text-base leading-relaxed"
                style={{ color: "#3d3216" }}
              >
                In case you are new here, the users of this platform are called{" "}
                <span className="animate-shimmer font-semibold" style={SHIMMER_DARK}>
                  Wizards
                </span>
                . You are destined to achieve magical scores. Therefore,
                practice with consistency and diligence, surely victory awaits.
              </p>

              <p
                className="mt-4 max-w-md text-base leading-relaxed"
                style={{ color: "#3d3216" }}
              >
                Go on and show you magic wizards!{" "}
                <span
                  className="inline-block animate-wand-wiggle"
                  style={{ transformOrigin: "70% 70%" }}
                >
                  🪄
                </span>
              </p>

              <button
                type="button"
                onClick={dismiss}
                className="btn-gold mt-7 px-6 py-2.5"
              >
                <Sparkles className="h-4 w-4" />
                Begin the journey
              </button>

              <p
                className="mt-3 text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "#8a7235" }}
              >
                Press Esc or tap outside to dismiss
              </p>
            </div>
          </div>

          {/* Bottom scroll roll */}
          <ScrollRoll position="bottom" />
        </div>
      </div>
    </div>
  );
}
