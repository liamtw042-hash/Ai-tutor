import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  fetchDayStats,
  fetchEssayRecords,
  fetchLeaderboard,
  fetchRecentAttempts,
  setLeaderboardOptIn,
  syncLeaderboard,
  type AttemptRow,
} from "@/lib/firestore";
import { computeSubjectMastery } from "@/lib/mastery";
import { BADGES } from "@/lib/badges";
import { getSubject } from "@/data/subjects";
import { addDaysToKey, dayLabel, sydneyDayKey } from "@/lib/dates";
import { Heatmap } from "@/components/Heatmap";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Progress as Bar,
  Spinner,
  cn,
} from "@/components/ui";
import {
  ChartIcon,
  LockIcon,
  SparkIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/icons";
import type { DayStat, EssayRecord, LeaderboardEntry } from "@/types";

export default function ProgressPage() {
  const { user, profile, configured, togglePremium, refreshProfile } = useAuth();
  const premium = profile?.premium ?? false;

  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [days, setDays] = useState<DayStat[]>([]);
  const [essays, setEssays] = useState<EssayRecord[]>([]);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [optingIn, setOptingIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!configured || !user) {
        setLoading(false);
        return;
      }
      try {
        const [a, d, e, lb] = await Promise.all([
          fetchRecentAttempts(user.uid),
          fetchDayStats(user.uid),
          fetchEssayRecords(user.uid),
          fetchLeaderboard(20).catch(() => [] as LeaderboardEntry[]),
        ]);
        if (cancelled) return;
        setAttempts(a);
        setDays(d);
        setEssays(e);
        setBoard(lb);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [configured, user]);

  // Weekly accuracy trend (last 8 weeks)
  const weekly = useMemo(() => {
    const today = sydneyDayKey();
    const out: { label: string; attempts: number; accuracy: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const start = addDaysToKey(today, -(w * 7 + 6));
      const end = addDaysToKey(today, -(w * 7));
      const startMs = new Date(start + "T00:00:00Z").getTime();
      const endMs = new Date(end + "T23:59:59Z").getTime();
      const rows = attempts.filter(
        (a) => a.createdAtMs >= startMs && a.createdAtMs <= endMs,
      );
      const correct = rows.filter((a) =>
        a.correct === null
          ? a.awardedMarks / Math.max(a.totalMarks, 1) >= 0.5
          : a.correct,
      ).length;
      out.push({
        label: dayLabel(end),
        attempts: rows.length,
        accuracy: rows.length > 0 ? correct / rows.length : 0,
      });
    }
    return out;
  }, [attempts]);

  const mastery = useMemo(
    () => computeSubjectMastery(attempts, profile?.subjects ?? []),
    [attempts, profile?.subjects],
  );

  const earned = new Set(profile?.badges ?? []);
  const totalActiveDays = days.filter(
    (d) => d.questions + d.reviews + d.essays > 0,
  ).length;

  const optIn = async () => {
    if (!user || !profile) return;
    setOptingIn(true);
    try {
      if (profile.leaderboardOptIn) {
        await setLeaderboardOptIn(user.uid, false, "");
      } else {
        const alias =
          profile.leaderboardAlias ||
          `Student-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        await setLeaderboardOptIn(user.uid, true, alias);
        await syncLeaderboard({
          ...profile,
          leaderboardOptIn: true,
          leaderboardAlias: alias,
        });
      }
      await refreshProfile();
      setBoard(await fetchLeaderboard(20).catch(() => []));
    } finally {
      setOptingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner className="h-7 w-7 text-brand-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Progress</h1>
        <p className="mt-1 text-ink-300">
          Real numbers from your work — no vanity metrics.
        </p>
      </div>

      {/* Heatmap — everyone */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">Study activity</h2>
          <span className="text-xs text-ink-400">
            {totalActiveDays} active days · best streak{" "}
            {profile?.bestStreak ?? profile?.streak ?? 0}
          </span>
        </div>
        <Heatmap stats={days} />
      </Card>

      {/* Accuracy trend — premium detail */}
      <div className="relative">
        <Card className={cn(!premium && "pointer-events-none select-none")}>
          <h2 className="mb-4 font-semibold text-white">
            Weekly accuracy trend
          </h2>
          {attempts.length === 0 ? (
            <EmptyState icon={<ChartIcon className="h-6 w-6" />} title="No data yet">
              Answer practice questions and your accuracy trend appears here.
            </EmptyState>
          ) : (
            <div className={cn(!premium && "blur-sm")}>
              <TrendChart weekly={weekly} />
            </div>
          )}
        </Card>
        {!premium && attempts.length > 0 && <PremiumOverlay onUpgrade={togglePremium} />}
      </div>

      {/* Per-subject breakdown — premium detail */}
      <div className="relative">
        <Card className={cn(!premium && "pointer-events-none select-none")}>
          <h2 className="mb-4 font-semibold text-white">Topic breakdown</h2>
          {mastery.every((m) => m.attempts === 0) ? (
            <EmptyState icon={<ChartIcon className="h-6 w-6" />} title="No data yet">
              Mastery per topic builds up as you practise each subject.
            </EmptyState>
          ) : (
            <div className={cn("space-y-6", !premium && "blur-sm")}>
              {mastery
                .filter((m) => m.attempts > 0)
                .map((m) => {
                  const s = getSubject(m.subjectId);
                  return (
                    <div key={m.subjectId}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">
                          {s.icon} {s.name}
                        </p>
                        <span className="text-xs text-ink-400">
                          {Math.round(m.mastery * 100)}% mastery
                        </span>
                      </div>
                      <div className="space-y-2">
                        {m.topics.map((t) => (
                          <div key={t.topic} className="flex items-center gap-3">
                            <span className="w-44 shrink-0 truncate text-xs text-ink-300 sm:w-60">
                              {t.topic}
                            </span>
                            <Bar
                              value={t.mastery}
                              className="flex-1"
                              tone={
                                t.mastery >= 0.7
                                  ? "green"
                                  : t.mastery >= 0.4
                                    ? "amber"
                                    : "red"
                              }
                            />
                            <span className="w-16 shrink-0 text-right text-xs text-ink-400">
                              {Math.round(t.accuracy * 100)}% · {t.attempts}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
        {!premium && !mastery.every((m) => m.attempts === 0) && (
          <PremiumOverlay onUpgrade={togglePremium} />
        )}
      </div>

      {/* Essay history */}
      <Card>
        <h2 className="mb-4 font-semibold text-white">Essay band history</h2>
        {essays.length === 0 ? (
          <EmptyState icon={<ChartIcon className="h-6 w-6" />} title="No essays marked yet">
            Submit an essay for feedback and your band trajectory shows here.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {essays.slice(0, 8).map((e) => {
              const s = getSubject(e.subjectId);
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                >
                  <span className="text-lg">{s.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-100">
                      {e.questionType} · {s.short}
                    </p>
                    <p className="text-xs text-ink-400">
                      {new Date(e.createdAt).toLocaleDateString("en-AU")} ·{" "}
                      {e.wordCount} words
                    </p>
                  </div>
                  <Badge
                    tone={
                      e.band / e.maxBand >= 0.8
                        ? "green"
                        : e.band / e.maxBand >= 0.6
                          ? "amber"
                          : "red"
                    }
                  >
                    Band {e.band}/{e.maxBand}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Badges */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <TrophyIcon className="h-[18px] w-[18px] text-brand-300" />
          <h2 className="font-semibold text-white">Achievements</h2>
          <span className="ml-auto text-xs text-ink-400">
            {earned.size}/{BADGES.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {BADGES.map((b) => {
            const has = earned.has(b.id);
            return (
              <div
                key={b.id}
                className={cn(
                  "rounded-xl border p-3.5 text-center transition",
                  has
                    ? "border-brand-500/30 bg-brand-500/8"
                    : "border-white/5 bg-white/[0.02] opacity-45",
                )}
                title={b.description}
              >
                <div className="text-2xl">{has ? b.icon : "🔒"}</div>
                <p className="mt-1.5 text-xs font-semibold text-ink-100">
                  {b.name}
                </p>
                <p className="mt-0.5 text-[10px] leading-tight text-ink-400">
                  {b.description}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Leaderboard (opt-in) */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <UsersIcon className="h-[18px] w-[18px] text-brand-300" />
          <h2 className="font-semibold text-white">Leaderboard</h2>
          <span className="text-xs text-ink-500">anonymous · opt-in</span>
          <Button
            variant="ghost"
            className="ml-auto text-xs"
            onClick={optIn}
            loading={optingIn}
          >
            {profile?.leaderboardOptIn
              ? "Leave leaderboard"
              : "Join anonymously"}
          </Button>
        </div>
        {profile?.leaderboardOptIn && (
          <p className="mb-3 text-xs text-ink-400">
            You appear as{" "}
            <span className="font-semibold text-brand-300">
              {profile.leaderboardAlias}
            </span>
            .
          </p>
        )}
        {board.length === 0 ? (
          <p className="text-sm text-ink-400">
            Nobody has opted in yet — be the first.
          </p>
        ) : (
          <div className="space-y-1.5">
            {board.map((e, i) => (
              <div
                key={e.uid}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2",
                  e.uid === user?.uid
                    ? "bg-brand-500/10 ring-1 ring-inset ring-brand-500/30"
                    : "bg-white/[0.02]",
                )}
              >
                <span
                  className={cn(
                    "w-6 text-center text-sm font-bold",
                    i === 0
                      ? "text-amber-300"
                      : i === 1
                        ? "text-ink-200"
                        : i === 2
                          ? "text-amber-600"
                          : "text-ink-500",
                  )}
                >
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-medium text-ink-100">
                  {e.alias}
                  {e.uid === user?.uid && (
                    <span className="ml-1.5 text-xs text-brand-300">you</span>
                  )}
                </span>
                <span className="text-xs text-ink-400">🔥 {e.streak}</span>
                <span className="w-20 text-right text-sm font-semibold text-brand-200">
                  {e.xp} XP
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function TrendChart({
  weekly,
}: {
  weekly: { label: string; attempts: number; accuracy: number }[];
}) {
  const W = 560;
  const H = 160;
  const pad = 24;
  const maxAttempts = Math.max(1, ...weekly.map((w) => w.attempts));
  const barW = (W - pad * 2) / weekly.length;

  const points = weekly
    .map((w, i) => {
      const x = pad + i * barW + barW / 2;
      const y = pad + (1 - w.accuracy) * (H - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="min-w-[480px] w-full">
        {/* attempt volume bars */}
        {weekly.map((w, i) => {
          const h = (w.attempts / maxAttempts) * (H - pad * 2);
          return (
            <rect
              key={i}
              x={pad + i * barW + barW * 0.2}
              y={H - pad - h}
              width={barW * 0.6}
              height={h}
              rx={4}
              fill="rgba(124,101,241,0.18)"
            />
          );
        })}
        {/* accuracy line */}
        <polyline
          points={points}
          fill="none"
          stroke="#10b981"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {weekly.map((w, i) => {
          const x = pad + i * barW + barW / 2;
          const y = pad + (1 - w.accuracy) * (H - pad * 2);
          return w.attempts > 0 ? (
            <circle key={i} cx={x} cy={y} r={3.5} fill="#10b981" />
          ) : null;
        })}
        {/* labels */}
        {weekly.map((w, i) => (
          <text
            key={i}
            x={pad + i * barW + barW / 2}
            y={H + 12}
            textAnchor="middle"
            fontSize={10}
            fill="#6c6c8a"
          >
            {w.label}
          </text>
        ))}
      </svg>
      <p className="mt-1 text-xs text-ink-500">
        <span className="text-emerald-400">●</span> accuracy ·{" "}
        <span className="text-brand-400">▮</span> questions attempted, by week
      </p>
    </div>
  );
}

function PremiumOverlay({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-ink-950/40">
      <div className="text-center">
        <LockIcon className="mx-auto h-6 w-6 text-brand-300" />
        <p className="mt-2 text-sm font-semibold text-white">
          Detailed analytics is Premium
        </p>
        <Button className="mt-3 text-xs" onClick={onUpgrade}>
          <SparkIcon className="h-3.5 w-3.5" /> Upgrade
        </Button>
      </div>
    </div>
  );
}
