"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { getLeaderboard, getMyRank, LeaderboardEntry } from "@/lib/leaderboard";
import { getBadgeForBand } from "@/lib/badges";
import { Crown, Medal, Trophy, Sparkles } from "lucide-react";

export default function StudentLeaderboardPage() {
  const { user } = useAuth();
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<{
    rank: number;
    total: number;
    entry: LeaderboardEntry;
  } | null>(null);

  useEffect(() => {
    setTop(getLeaderboard(user?.id, 10));
    if (user?.id) setMyRank(getMyRank(user.id));
  }, [user]);

  const inTop10 = useMemo(
    () => !!user && top.some((e) => e.userId === user.id),
    [top, user],
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Hall of Wizards"
        title={
          <>
            Top <span className="gold-text">10 wizards</span>
          </>
        }
        description="Ranked by the highest band score achieved on a Full Mock Test. Climb by taking more mocks — your best run is what counts."
      />

      <div className="panel overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/50">
              <th className="px-4 py-3 w-16">Rank</th>
              <th className="px-4 py-3">Wizard</th>
              <th className="px-4 py-3">Badge</th>
              <th className="px-4 py-3 text-right">Mocks</th>
              <th className="px-4 py-3 text-right">Best band</th>
            </tr>
          </thead>
          <tbody>
            {top.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-white/55">
                  No mocks completed yet. Be the first to land on the board.
                </td>
              </tr>
            ) : (
              top.map((entry, i) => <Row key={entry.userId} entry={entry} rank={i + 1} />)
            )}
          </tbody>
        </table>
      </div>

      {user && myRank && !inTop10 && (
        <div className="mt-4 panel">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50">
            <Sparkles className="h-3.5 w-3.5" /> Your standing
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-semibold">{myRank.entry.name}</span> — rank{" "}
              <span className="font-semibold gold-text">#{myRank.rank}</span> of{" "}
              {myRank.total}
            </p>
            <p className="text-2xl font-black gold-text">
              {myRank.entry.band.toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {user && !myRank && (
        <div className="mt-4 panel text-center text-sm text-white/65">
          You haven't completed a Full Mock Test yet — take one to claim a spot on
          the board.
        </div>
      )}
    </div>
  );
}

function Row({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const badge = getBadgeForBand(entry.band);
  const Icon = badge.Icon;
  const rankIcon =
    rank === 1 ? Crown : rank === 2 ? Trophy : rank === 3 ? Medal : null;
  const RankIcon = rankIcon as any;

  return (
    <tr
      className={`border-b border-white/5 last:border-0 ${
        entry.isYou ? "bg-gold-500/10" : ""
      }`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {RankIcon && (
            <RankIcon
              className={`h-4 w-4 ${
                rank === 1
                  ? "text-gold-300"
                  : rank === 2
                  ? "text-gold-400"
                  : "text-gold-600"
              }`}
            />
          )}
          <span
            className={`font-bold ${
              rank <= 3 ? "gold-text text-base" : "text-white/85"
            }`}
          >
            #{rank}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium">
          {entry.name}
          {entry.isYou && <span className="ml-2 badge text-[10px] !py-0">You</span>}
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gold-gradient text-ink-950">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs text-white/80">{badge.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right text-white/70">{entry.mocksTaken}</td>
      <td className="px-4 py-3 text-right">
        <span className="text-xl font-black gold-text">
          {entry.band.toFixed(1)}
        </span>
      </td>
    </tr>
  );
}
