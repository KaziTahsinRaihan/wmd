"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { enrolledClasses, performanceHistory, practiceModules } from "@/lib/mock-data";
import { getMockResults } from "@/lib/full-mocks";
import { getEarnedBadge, roundToHalf } from "@/lib/badges";
import {
  BONUS_STREAK_MILESTONE,
  bonusMocksEarned,
  daysToNextBonus,
  useStreak,
} from "@/lib/streak";
import {
  ArrowRight,
  ClipboardCheck,
  Flame,
  GraduationCap,
  LineChart,
  Lock,
  ScrollText,
  Sparkles,
  Target,
} from "lucide-react";

export default function StudentOverviewPage() {
  const { user } = useAuth();
  const streak = useStreak(user?.id);
  const [bestMockBand, setBestMockBand] = useState(0);

  useEffect(() => {
    if (!user) return;
    const results = Object.values(getMockResults(user.id));
    setBestMockBand(results.reduce((a, b) => Math.max(a, b.band), 0));
  }, [user]);

  if (!user) return null;

  const latest = performanceHistory[performanceHistory.length - 1];
  const rawAverage =
    (latest.listening + latest.reading + latest.writing + latest.speaking) / 4;

  // Bands are quoted at 0.5 increments — never as raw averages like 6.875.
  const averageBand = roundToHalf(rawAverage);
  const target = user.targetScore ?? 7;
  const gap = roundToHalf(Math.max(0, target - averageBand));
  const next = enrolledClasses[0];

  const earnedBadge = getEarnedBadge(bestMockBand);
  const EarnedIcon = earnedBadge?.Icon;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Student workspace"
        title={
          <>
            Hello, <span className="gold-text">{user.name.split(" ")[0]}</span> 👋
          </>
        }
        description="Here’s a snapshot of your IELTS journey today."
      />

      {/* Current highest held badge — prominent banner. New users see a locked card. */}
      <div className="panel mb-4 overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {earnedBadge && EarnedIcon ? (
              <span
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full ring-2 ring-gold-500/60"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, #fff5d4 0%, #c9a959 45%, #5e4c22 100%)",
                  boxShadow:
                    "inset 0 -3px 4px rgba(0,0,0,0.35), 0 8px 22px -8px rgba(201,169,89,0.7)",
                }}
              >
                <EarnedIcon
                  className="h-7 w-7"
                  style={{
                    color: "#3d2a07",
                    filter:
                      "drop-shadow(0 1px 0 rgba(255,255,255,0.5)) drop-shadow(0 -1px 0 rgba(0,0,0,0.35))",
                  }}
                />
              </span>
            ) : (
              <span
                aria-hidden
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full ring-2 ring-white/10"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, #4a3f1d 0%, #2a2515 60%)",
                  boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.4)",
                }}
              >
                <Lock className="h-6 w-6 text-white/35" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold-300/80">
                Your current rank
              </p>
              {earnedBadge ? (
                <>
                  <h2 className="mt-0.5 text-xl font-bold gold-text leading-tight">
                    {earnedBadge.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-white/55">
                    Band {earnedBadge.band.toFixed(1)} · best mock {bestMockBand.toFixed(1)}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mt-0.5 text-xl font-bold text-white/85 leading-tight">
                    No badge yet
                  </h2>
                  <p className="mt-0.5 text-xs text-white/55">
                    Take your first Full Mock Test to claim your rank.
                  </p>
                </>
              )}
            </div>
          </div>
          <Link
            href={earnedBadge ? "/student/performance" : "/student/mock-practice"}
            className={earnedBadge ? "btn-outline whitespace-nowrap" : "btn-gold whitespace-nowrap"}
          >
            {earnedBadge ? (
              <>
                <Sparkles className="h-4 w-4" /> View ascent
              </>
            ) : (
              <>
                <ScrollText className="h-4 w-4" /> Take a mock
              </>
            )}
          </Link>
        </div>
      </div>

      <StreakBanner streak={streak} />

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="panel">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50">
            <Target className="h-3.5 w-3.5 text-gold-400" /> Target band
          </div>
          <p className="mt-2 text-3xl font-bold gold-text">
            {target.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {user.targetMonth} {user.targetYear}
          </p>
        </div>
        <div className="panel">
          <div className="text-xs uppercase tracking-wide text-white/50">Current avg.</div>
          <p className="mt-2 text-3xl font-bold">{averageBand.toFixed(1)}</p>
          <p className="mt-1 text-xs text-white/50">Rounded to nearest 0.5</p>
        </div>
        <div className="panel">
          <div className="text-xs uppercase tracking-wide text-white/50">Gap to target</div>
          <p className="mt-2 text-3xl font-bold text-gold-300">
            {gap.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {gap === 0 ? "On target" : "Bands of 0.5 away from goal"}
          </p>
        </div>
        <div className="panel">
          <div className="text-xs uppercase tracking-wide text-white/50">Upcoming class</div>
          <p className="mt-2 font-semibold leading-snug">{next.title}</p>
          <p className="mt-1 text-xs text-white/50">
            {next.date} · {next.time}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Link href="/student/mock-practice" className="panel panel-hover group">
          <ClipboardCheck className="h-6 w-6 text-gold-400" />
          <h3 className="mt-3 text-lg font-bold">Mock Practice</h3>
          <p className="mt-1 text-sm text-white/60">
            Sharpen each module — Listening, Reading, Writing, Speaking.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold-300 group-hover:gap-2 transition-all">
            Start practicing <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
        <Link href="/student/classes" className="panel panel-hover group">
          <GraduationCap className="h-6 w-6 text-gold-400" />
          <h3 className="mt-3 text-lg font-bold">Join Class</h3>
          <p className="mt-1 text-sm text-white/60">
            Your enrolled live classes — join with one click.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm text-gold-300 group-hover:gap-2 transition-all">
            View classes <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>

      <section className="mt-8 panel">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Module readiness</h3>
            <p className="text-sm text-white/60">
              Latest band per module vs. your target of {target.toFixed(1)}.
            </p>
          </div>
          <Link href="/student/performance" className="btn-outline">
            <LineChart className="h-4 w-4" /> Full tracker
          </Link>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {practiceModules.map((m) => {
            const score = (latest as any)[m.key] as number;
            const pct = Math.min(100, (score / 9) * 100);
            const targetPct = Math.min(100, (target / 9) * 100);
            return (
              <div
                key={m.key}
                className="rounded-xl border border-gold-500/20 bg-ink-800/60 p-4"
              >
                <p className="text-sm font-semibold">{m.label}</p>
                <p className="mt-1 text-2xl font-bold gold-text">{score.toFixed(1)}</p>
                <div className="relative mt-3 h-2 rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-gold-gradient"
                    style={{ width: `${pct}%` }}
                  />
                  <div
                    className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-white/80"
                    style={{ left: `${targetPct}%` }}
                    title={`Target ${target.toFixed(1)}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StreakBanner({
  streak,
}: {
  streak: ReturnType<typeof useStreak>;
}) {
  const bonuses = bonusMocksEarned(streak);
  const remaining = daysToNextBonus(streak);
  const cycleProgress =
    ((streak.current % BONUS_STREAK_MILESTONE) / BONUS_STREAK_MILESTONE) * 100;
  // When the streak lands exactly on a milestone the progress bar should read
  // 100% (not wrap back to 0).
  const pct =
    streak.current > 0 && streak.current % BONUS_STREAK_MILESTONE === 0
      ? 100
      : cycleProgress;

  return (
    <div className="panel mb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full ring-2 ring-orange-400/60"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #ffd9a3 0%, #f59425 45%, #b94a09 100%)",
            boxShadow:
              "inset 0 -2px 3px rgba(0,0,0,0.3), 0 6px 18px -6px rgba(245,148,37,0.7)",
          }}
          aria-hidden
        >
          <Flame
            className="h-7 w-7"
            style={{
              color: "#3d1e02",
              filter:
                "drop-shadow(0 1px 0 rgba(255,255,255,0.4)) drop-shadow(0 -1px 0 rgba(0,0,0,0.35))",
            }}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-300/80">
            Daily streak
          </p>
          <p className="mt-0.5 text-xl font-bold leading-tight">
            <span className="gold-text">{streak.current}</span>
            <span className="ml-1.5 text-white/70">
              day{streak.current === 1 ? "" : "s"}
            </span>
          </p>
          <p className="mt-1 text-xs text-white/55">
            Longest: {streak.longest} day{streak.longest === 1 ? "" : "s"}
            {bonuses > 0 && (
              <>
                {" · "}
                <span className="text-gold-200">
                  {bonuses} bonus mock{bonuses === 1 ? "" : "s"} earned
                </span>
              </>
            )}
          </p>

          {/* Progress to the next bonus mock */}
          <div className="mt-3 max-w-md">
            <div className="relative h-2 rounded-full bg-white/5">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${pct}%`,
                  background:
                    "linear-gradient(90deg, #f59425 0%, #ffd9a3 100%)",
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-white/55">
              <Flame className="mr-1 inline h-3 w-3 text-orange-400" />
              <span className="font-semibold text-white/80">
                Hit a {BONUS_STREAK_MILESTONE}-day streak to unlock 1 extra free
                full mock.
              </span>{" "}
              {streak.current === 0
                ? `${BONUS_STREAK_MILESTONE} days to go.`
                : remaining === BONUS_STREAK_MILESTONE
                ? `Milestone reached — next bonus in ${BONUS_STREAK_MILESTONE} more days.`
                : `${remaining} day${remaining === 1 ? "" : "s"} to your next bonus.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
