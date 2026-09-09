"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Star, X } from "lucide-react";
import { Badge } from "@/lib/badges";

const SHIMMER_DARK: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(100deg, #8a7235 0%, #c9a959 18%, #5e4c22 32%, #8a7235 48%, #c9a959 64%, #5e4c22 80%, #8a7235 100%)",
  backgroundSize: "200% 100%",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

const CONFETTI_COLORS = [
  "#c9a959", // antique gold
  "#e8d595", // light gold
  "#8a7235", // deep gold
  "#1a2b56", // brand navy
  "#3a5694", // light navy
  "#ffffff", // white
];

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

type ConfettiPiece = {
  id: number;
  left: string;
  delay: string;
  duration: string;
  size: number;
  color: string;
  rotate: number;
  isStar: boolean;
};

function useConfetti(count: number): ConfettiPiece[] {
  return useMemo(() => {
    const rand = mulberry32(0xb4de7);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${(rand() * 100).toFixed(2)}%`,
      delay: `${(rand() * 1.4).toFixed(2)}s`,
      duration: `${(2 + rand() * 2.5).toFixed(2)}s`,
      size: 6 + Math.floor(rand() * 10),
      color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)],
      rotate: Math.floor(rand() * 360),
      isStar: rand() < 0.35,
    }));
  }, [count]);
}

export default function BadgeUpScroll({
  badge,
  preTitle = "You've ascended to",
  scopeLabel,
  onClose,
}: {
  badge: Badge | null;
  preTitle?: string;
  scopeLabel?: string;
  onClose: () => void;
}) {
  const [show, setShow] = useState(false);
  const confetti = useConfetti(60);

  useEffect(() => {
    if (!badge) return;
    const t = setTimeout(() => setShow(true), 80);
    return () => clearTimeout(t);
  }, [badge]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [show, onClose]);

  if (!badge || !show) return null;

  const Icon = badge.Icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-up-title"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* falling confetti — full-screen */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((p) => (
          <span
            key={p.id}
            className="absolute animate-float-up"
            style={{
              left: p.left,
              top: `-${p.size}px`,
              bottom: "auto",
              fontSize: p.size,
              color: p.color,
              transform: `rotate(${p.rotate}deg)`,
              animationDelay: p.delay,
              animationDuration: p.duration,
              animationDirection: "reverse",
              filter: `drop-shadow(0 0 4px ${p.color})`,
            }}
          >
            {p.isStar ? (
              <Star className="h-[1em] w-[1em] fill-current" />
            ) : (
              <span
                className="block rounded-[2px]"
                style={{
                  width: p.size,
                  height: Math.max(3, Math.floor(p.size / 2)),
                  background: p.color,
                }}
              />
            )}
          </span>
        ))}
      </div>

      <div className="relative w-full max-w-lg animate-scale-in">
        {/* aura halos */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-10 -z-10 rounded-[2.5rem] bg-gold-500/30 blur-3xl animate-aura-pulse"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-gold-400/45 via-transparent to-gold-700/40 blur-2xl"
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
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-lg p-1.5 transition hover:bg-gold-900/10"
              style={{ color: "#5e4c22" }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex flex-col items-center text-center">
              <div className="relative mb-5">
                <span
                  aria-hidden
                  className="absolute inset-0 -m-4 rounded-full bg-gold-500/40 blur-2xl animate-aura-pulse"
                />
                <span
                  className="relative grid h-24 w-24 place-items-center rounded-full ring-4 ring-gold-700/60 animate-wand-wiggle"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, #fff5d4 0%, #c9a959 45%, #5e4c22 100%)",
                    boxShadow:
                      "inset 0 -3px 4px rgba(0,0,0,0.35), 0 12px 28px -8px rgba(201,169,89,0.7)",
                    transformOrigin: "50% 60%",
                  }}
                >
                  <Icon
                    className="h-11 w-11"
                    style={{
                      color: "#3d2a07",
                      filter:
                        "drop-shadow(0 1px 0 rgba(255,255,255,0.5)) drop-shadow(0 -1px 0 rgba(0,0,0,0.35))",
                    }}
                  />
                </span>
              </div>

              <div
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold-800/40 px-3 py-1 text-xs uppercase tracking-[0.22em]"
                style={{ background: "rgba(201,169,89,0.20)", color: "#5e4c22" }}
              >
                <Sparkles className="h-3 w-3" />
                {scopeLabel ?? "Band band-up"}
              </div>

              <p
                className="text-[11px] uppercase tracking-[0.22em]"
                style={{ color: "#7a5e1d" }}
              >
                {preTitle}
              </p>
              <h2
                id="badge-up-title"
                className="animate-shimmer mt-1 text-2xl font-black leading-tight tracking-tight sm:text-3xl"
                style={SHIMMER_DARK}
              >
                {badge.name}
              </h2>
              <p
                className="mt-1 text-sm font-semibold"
                style={{ color: "#5e4c22" }}
              >
                Band {badge.band.toFixed(1)}
              </p>

              <p
                className="mt-4 max-w-md text-sm leading-relaxed"
                style={{ color: "#3d3216" }}
              >
                {badge.description}
              </p>

              <button
                type="button"
                onClick={onClose}
                className="btn-gold mt-6 px-6 py-2.5"
              >
                <Sparkles className="h-4 w-4" />
                Carry on, wizard
              </button>
            </div>
          </div>

          <ScrollRoll position="bottom" />
        </div>
      </div>
    </div>
  );
}
