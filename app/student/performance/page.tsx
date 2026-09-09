"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import BadgeUpScroll from "@/components/BadgeUpScroll";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { performanceHistory } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { getMockResults } from "@/lib/full-mocks";
import {
  BADGES,
  getBadgeForBand,
  getEarnedBadge,
  getNextBadge,
  detectClimb,
  setSeenBands,
  getSeenBands,
  ModuleKey,
  Badge as BadgeType,
} from "@/lib/badges";
import { Lock, CheckCircle2 } from "lucide-react";

type ModuleSlug = "listening" | "reading" | "writing" | "speaking";

// The chart needs a 4th line color that contrasts with the 3 antique-gold lines
// *and* stays visible on either background. In dark theme that was pure white;
// in light theme white is invisible, so we swap to a deep umber-gold that
// extends the existing gold scale (lighter→darker: e8d595, c9a959, 8a7235, …)
// to a new value not yet used elsewhere in the palette.
const SPEAKING_DARK = "#ffffff";
const SPEAKING_LIGHT = "#6b4a1b";

function moduleStylesFor(isLight: boolean): { key: ModuleSlug; color: string }[] {
  return [
    { key: "listening", color: "#e8d595" },
    { key: "reading", color: "#c9a959" },
    { key: "writing", color: "#8a7235" },
    { key: "speaking", color: isLight ? SPEAKING_LIGHT : SPEAKING_DARK },
  ];
}

type ClimbState = { badge: BadgeType; scopeLabel: string; preTitle: string };

export default function PerformancePage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const moduleStyles = useMemo(() => moduleStylesFor(isLight), [isLight]);
  const target = user?.targetScore ?? 7;

  // Compute current bands
  const latest = performanceHistory[performanceHistory.length - 1] as any;
  const previous = performanceHistory[0] as any;
  const moduleBands: Record<ModuleSlug, number> = useMemo(
    () => ({
      listening: latest.listening,
      reading: latest.reading,
      writing: latest.writing,
      speaking: latest.speaking,
    }),
    [latest],
  );

  // Overall band = best Full Mock band, falls back to current performance average.
  const [bestMockBand, setBestMockBand] = useState(0);
  useEffect(() => {
    if (!user) return;
    const results = Object.values(getMockResults(user.id));
    const best = results.reduce((a, b) => Math.max(a, b.band), 0);
    setBestMockBand(best);
  }, [user]);

  // Overall band reflects only what the wizard has earned through a Full Mock.
  // New users (no mocks taken) have no overall band and therefore no badge yet.
  const overallBand = bestMockBand;
  const earnedBadge = getEarnedBadge(overallBand);
  const nextBadge = overallBand > 0 ? getNextBadge(overallBand) : BADGES[0];

  // -------------------- Climb detection --------------------
  const [climbQueue, setClimbQueue] = useState<ClimbState[]>([]);

  useEffect(() => {
    if (!user) return;
    const queue: ClimbState[] = [];

    const overallClimb = detectClimb(user.id, "overall", overallBand);
    if (overallClimb) {
      queue.push({
        badge: overallClimb,
        scopeLabel: "Overall band-up",
        preTitle: "You've ascended to",
      });
    }

    (Object.keys(moduleBands) as ModuleSlug[]).forEach((m) => {
      const climb = detectClimb(user.id, m as ModuleKey, moduleBands[m]);
      if (climb) {
        queue.push({
          badge: climb,
          scopeLabel: `${m} band-up`,
          preTitle: `Your ${m} now sings of`,
        });
      }
    });

    setClimbQueue(queue);
  }, [user, overallBand, moduleBands]);

  const onCloseClimb = () => {
    if (!user || climbQueue.length === 0) return;
    const [first, ...rest] = climbQueue;
    // Mark the badge for the appropriate scope as seen.
    const seen = getSeenBands(user.id);
    let key: ModuleKey = "overall";
    if (first.scopeLabel.startsWith("listening")) key = "listening";
    else if (first.scopeLabel.startsWith("reading")) key = "reading";
    else if (first.scopeLabel.startsWith("writing")) key = "writing";
    else if (first.scopeLabel.startsWith("speaking")) key = "speaking";
    setSeenBands(user.id, { ...seen, [key]: first.badge.band });
    setClimbQueue(rest);
  };

  return (
    <div className="animate-fade-in">
      {climbQueue.length > 0 && (
        <BadgeUpScroll
          badge={climbQueue[0].badge}
          scopeLabel={climbQueue[0].scopeLabel}
          preTitle={climbQueue[0].preTitle}
          onClose={onCloseClimb}
        />
      )}

      <PageHeader
        eyebrow="Performance Tracker"
        title={
          <>
            Your IELTS <span className="gold-text">trajectory</span>
          </>
        }
        description="Module-by-module band history. The dashed line is your target band."
      />

      <div className="panel">
        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={performanceHistory}
              margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid stroke="#243869" strokeDasharray="3 3" />
              <XAxis dataKey="test" stroke="#8298c7" tick={{ fill: "#8298c7", fontSize: 12 }} />
              <YAxis
                domain={[4, 9]}
                ticks={[4, 5, 6, 7, 8, 9]}
                stroke="#8298c7"
                tick={{ fill: "#8298c7", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  background: isLight ? "#ffffff" : "#1a2b56",
                  border: "1px solid rgba(201,169,89,0.45)",
                  borderRadius: 12,
                  color: isLight ? "#1a2b56" : "#ffffff",
                }}
                labelStyle={{ color: "#c9a959", fontWeight: 600 }}
              />
              <Legend
                wrapperStyle={{
                  color: isLight ? "#1a2b56" : "#ffffff",
                  paddingTop: 12,
                }}
                iconType="circle"
              />
              <ReferenceLine
                y={target}
                stroke="#c9a959"
                strokeDasharray="6 6"
                label={{
                  value: `Target ${target.toFixed(1)}`,
                  fill: "#c9a959",
                  position: "right",
                }}
              />
              {moduleStyles.map((m) => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  stroke={m.color}
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    stroke: m.color,
                    fill: isLight ? "#ffffff" : "#1a2b56",
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {moduleStyles.map((m) => {
          const delta = latest[m.key] - previous[m.key];
          return (
            <div key={m.key} className="panel">
              <p className="text-xs uppercase tracking-wide text-white/50 capitalize">
                {m.key}
              </p>
              <p className="mt-2 text-2xl font-bold" style={{ color: m.color }}>
                {latest[m.key].toFixed(1)}
              </p>
              <p className="mt-1 text-xs text-white/50">
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} since diagnostic
              </p>
            </div>
          );
        })}
      </div>

      {/* ============================== BADGES ============================== */}
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-[0.18em] text-gold-300/80">
        Badges of the order
      </h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <BadgeLadder earned={earnedBadge} next={nextBadge} band={overallBand} />
        <ModuleBadges bands={moduleBands} />
      </div>
    </div>
  );
}

// ============================== Sub-components ==============================

function BadgeMedallion({
  badge,
  size = 56,
  active = true,
  locked = false,
}: {
  badge: BadgeType;
  size?: number;
  active?: boolean;
  locked?: boolean;
}) {
  const Icon = badge.Icon;
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full ring-2 ${
        active
          ? "ring-gold-500/60"
          : locked
          ? "ring-white/10"
          : "ring-white/15"
      }`}
      style={{
        width: size,
        height: size,
        background: locked
          ? "radial-gradient(circle at 30% 30%, #4a3f1d 0%, #2a2515 60%)"
          : active
          ? "radial-gradient(circle at 30% 30%, #fff5d4 0%, #c9a959 45%, #5e4c22 100%)"
          : "radial-gradient(circle at 30% 30%, #d3b35e 0%, #8a7235 60%, #3d3216 100%)",
        boxShadow: active
          ? "inset 0 -3px 4px rgba(0,0,0,0.35), 0 8px 22px -8px rgba(201,169,89,0.7)"
          : "inset 0 -2px 3px rgba(0,0,0,0.4)",
      }}
    >
      {locked ? (
        <Lock className="h-[40%] w-[40%] text-white/40" />
      ) : (
        <Icon
          className="h-[45%] w-[45%]"
          style={{
            color: active ? "#3d2a07" : "#1f1605",
            filter: active
              ? "drop-shadow(0 1px 0 rgba(255,255,255,0.5)) drop-shadow(0 -1px 0 rgba(0,0,0,0.35))"
              : undefined,
          }}
        />
      )}
    </span>
  );
}

function BadgeLadder({
  earned,
  next,
  band,
}: {
  earned: BadgeType | null;
  next: BadgeType | null;
  band: number;
}) {
  const hasEarned = earned !== null;
  // Display badge list with band 9 on top and band 1 at the bottom.
  const ladderDesc = [...BADGES].reverse();

  return (
    <div className="panel">
      <div className="flex items-start gap-4 border-b border-white/10 pb-4">
        {hasEarned ? (
          <BadgeMedallion badge={earned!} size={72} />
        ) : (
          <span
            aria-hidden
            className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full ring-2 ring-white/10"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, #4a3f1d 0%, #2a2515 60%)",
              boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.4)",
            }}
          >
            <Lock className="h-7 w-7 text-white/35" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-300/80">
            Your overall rank
          </p>
          {hasEarned ? (
            <>
              <h3 className="mt-1 text-xl font-bold gold-text leading-tight">
                {earned!.name}
              </h3>
              <p className="mt-1 text-xs text-white/55">
                Band {earned!.band.toFixed(1)} · best mock {band.toFixed(1)}
              </p>
              <p className="mt-2 text-sm text-white/75">{earned!.description}</p>
              {next && next.band > earned!.band && (
                <p className="mt-3 text-xs text-white/60">
                  Next:{" "}
                  <span className="font-semibold text-gold-200">{next.name}</span>{" "}
                  at Band {next.band.toFixed(1)} —{" "}
                  <span className="text-white/50">
                    {Math.max(0.5, next.band - earned!.band).toFixed(1)} band to go
                  </span>
                </p>
              )}
            </>
          ) : (
            <>
              <h3 className="mt-1 text-xl font-bold text-white/85 leading-tight">
                No badge yet
              </h3>
              <p className="mt-1 text-xs text-white/55">Awaiting your first mock</p>
              <p className="mt-2 text-sm text-white/70">
                Take your first Full Mock Test to lock in a band score and claim a rank.
                Wizards earn their badge only by stepping into the arena.
              </p>
            </>
          )}
        </div>
      </div>

      <p className="mt-4 mb-3 text-xs uppercase tracking-wide text-white/50">
        The full ascent — band 9 to band 1
      </p>
      <ul className="space-y-1.5">
        {ladderDesc.map((b) => {
          const isCurrent = hasEarned && b.band === earned!.band;
          const reached = hasEarned && band + 1e-6 >= b.band;
          return (
            <li
              key={b.band}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition ${
                isCurrent
                  ? "border-gold-500/50 bg-gold-500/10"
                  : reached
                  ? "border-white/10 bg-ink-800/40"
                  : "border-white/10 bg-ink-800/20 opacity-70"
              }`}
            >
              <BadgeMedallion
                badge={b}
                size={32}
                active={isCurrent}
                locked={!reached}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {b.name}
                  {isCurrent && (
                    <span className="ml-2 badge text-[10px] !py-0">You</span>
                  )}
                </p>
                <p className="text-[11px] text-white/50">Band {b.band.toFixed(1)}</p>
              </div>
              {reached && !isCurrent && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-gold-400" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ModuleBadges({ bands }: { bands: Record<ModuleSlug, number> }) {
  const entries: { slug: ModuleSlug; label: string }[] = [
    { slug: "listening", label: "Listening" },
    { slug: "reading", label: "Reading" },
    { slug: "writing", label: "Writing" },
    { slug: "speaking", label: "Speaking" },
  ];
  return (
    <div className="space-y-3">
      <div className="panel">
        <p className="text-xs uppercase tracking-wide text-white/50">
          Module-wise badges
        </p>
        <p className="mt-1 text-xs text-white/55">
          One rank per skill — based on your latest performance entry.
        </p>
      </div>
      {entries.map(({ slug, label }) => {
        const band = bands[slug];
        const badge = getBadgeForBand(band);
        const next = getNextBadge(band);
        return (
          <div key={slug} className="panel">
            <div className="flex items-start gap-3">
              <BadgeMedallion badge={badge} size={56} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-gold-300/80">
                    {label}
                  </p>
                  <span className="text-xs text-white/50">
                    Band {band.toFixed(1)}
                  </span>
                </div>
                <h3 className="mt-1 font-bold gold-text leading-tight">
                  {badge.name}
                </h3>
                <p className="mt-1 text-xs text-white/65 line-clamp-2">
                  {badge.description}
                </p>
                {next && (
                  <p className="mt-2 text-[11px] text-white/55">
                    Next: <span className="text-gold-200">{next.name}</span>{" "}
                    <span className="text-white/40">(Band {next.band.toFixed(1)})</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
