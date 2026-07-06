import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  fetchDayStats,
  fetchRecentAttempts,
  fetchSRSSummary,
  awardBadges,
  syncLeaderboard,
  type AttemptRow,
  type SRSSummary,
} from "@/lib/firestore";
import {
  computeSubjectMastery,
  masteredTopics,
  weakestTopics,
} from "@/lib/mastery";
import { levelForXp, levelProgress, levelTitle } from "@/lib/xp";
import { BADGES_BY_ID, newlyEarnedBadges } from "@/lib/badges";
import { getSubject } from "@/data/subjects";
import { sydneyDayKey } from "@/lib/dates";
import { Heatmap } from "@/components/Heatmap";
import {
  Badge,
  Card,
  EmptyState,
  FadeUp,
  Progress,
  ProgressRing,
  Stat,
  cn,
} from "@/components/ui";
import {
  ArrowRightIcon,
  BoltIcon,
  BrainIcon,
  FlameIcon,
  PenIcon,
  SparkIcon,
  TargetIcon,
} from "@/components/icons";
import type { DayStat } from "@/types";

export default function Dashboard() {
  const { user, profile, configured, refreshProfile } = useAuth();
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [days, setDays] = useState<DayStat[]>([]);
  const [srs, setSrs] = useState<SRSSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!configured || !user) {
        setLoading(false);
        return;
      }
      try {
        const [a, d, s] = await Promise.all([
          fetchRecentAttempts(user.uid),
          fetchDayStats(user.uid),
          fetchSRSSummary(user.uid),
        ]);
        if (cancelled) return;
        setAttempts(a);
        setDays(d);
        setSrs(s);
      } catch (err) {
        console.error("Dashboard load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [configured, user]);

  // Badge sweep + leaderboard sync once data is in.
  useEffect(() => {
    if (!user || !profile || loading) return;
    const reviewsDone = days.reduce((s, d) => s + d.reviews, 0);
    const essaysSubmitted = days.reduce((s, d) => s + d.essays, 0);
    const earned = newlyEarnedBadges(profile, {
      questionsAnswered: profile.questionsAnswered,
      correctCount: profile.correctCount,
      streak: profile.streak,
      bestStreak: profile.bestStreak ?? profile.streak,
      xpLevel: levelForXp(profile.xp ?? 0),
      essaysSubmitted,
      decksCreated: 0, // awarded at creation time
      reviewsDone,
      examsCompleted: 0, // awarded at completion time
      topicsMastered: masteredTopics(attempts).length,
    });
    if (earned.length > 0) {
      awardBadges(user.uid, earned)
        .then(refreshProfile)
        .catch(() => undefined);
    }
    syncLeaderboard(profile).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const today = sydneyDayKey();
  const todayStat = days.find((d) => d.day === today);
  const doneToday = (todayStat?.questions ?? 0) + (todayStat?.reviews ?? 0);
  const goal = profile?.dailyGoal || 20;
  const goalPct = Math.min(1, doneToday / goal);

  const weak = useMemo(() => weakestTopics(attempts), [attempts]);
  const mastery = useMemo(
    () => computeSubjectMastery(attempts, profile?.subjects ?? []),
    [attempts, profile?.subjects],
  );

  const lp = levelProgress(profile?.xp ?? 0);
  const firstName = (profile?.displayName || "there").split(" ")[0];
  const accuracy =
    profile && profile.questionsAnswered > 0
      ? profile.correctCount / profile.questionsAnswered
      : null;

  const recentBadges = (profile?.badges ?? [])
    .map((id) => BADGES_BY_ID[id])
    .filter(Boolean)
    .slice(-4)
    .reverse();

  return (
    <div className="space-y-6">
      {/* Header row */}
      <FadeUp>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              {doneToday >= goal
                ? "Daily goal smashed — anything extra is a bonus. 🎉"
                : srs && srs.dueToday > 0
                  ? `You have ${srs.dueToday} review${srs.dueToday === 1 ? "" : "s"} due — clearing them is the highest-value 10 minutes today.`
                  : "Little and often beats cramming. Let's get started."}
            </p>
          </div>
          {recentBadges.length > 0 && (
            <div className="flex items-center gap-1.5">
              {recentBadges.map((b) => (
                <span
                  key={b.id}
                  title={`${b.name} — ${b.description}`}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-lg"
                >
                  {b.icon}
                </span>
              ))}
            </div>
          )}
        </div>
      </FadeUp>

      {/* Goal ring + stats */}
      <FadeUp delay={0.05}>
        <div className="grid gap-4 md:grid-cols-[auto_1fr]">
          <Card className="flex items-center gap-5 md:min-w-[300px]">
            <ProgressRing
              value={goalPct}
              size={96}
              stroke={9}
              tone={goalPct >= 1 ? "green" : "brand"}
            >
              <div className="text-center">
                <div className="text-xl font-bold text-white">{doneToday}</div>
                <div className="text-[10px] text-ink-400">of {goal}</div>
              </div>
            </ProgressRing>
            <div>
              <p className="font-semibold text-white">Daily goal</p>
              <p className="mt-0.5 text-xs text-ink-400">
                Questions + reviews today
              </p>
              <Link
                to={srs && srs.dueToday > 0 ? "/review" : "/practice"}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200"
              >
                {srs && srs.dueToday > 0 ? "Clear reviews" : "Practise now"}
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label="Day streak"
              value={profile?.streak ?? 0}
              hint={`best ${profile?.bestStreak ?? profile?.streak ?? 0}`}
              icon={<FlameIcon className="h-5 w-5" />}
            />
            <Stat
              label={`Level ${lp.level}`}
              value={`${profile?.xp ?? 0} XP`}
              hint={levelTitle(lp.level)}
              icon={<SparkIcon className="h-5 w-5" />}
            />
            <Stat
              label="Questions answered"
              value={profile?.questionsAnswered ?? 0}
              hint={
                accuracy !== null ? `${Math.round(accuracy * 100)}% right` : undefined
              }
              icon={<PenIcon className="h-5 w-5" />}
            />
            <Stat
              label="In long-term memory"
              value={srs?.learned ?? 0}
              hint={srs ? `${srs.total} tracked` : undefined}
              icon={<BrainIcon className="h-5 w-5" />}
            />
          </div>
        </div>
      </FadeUp>

      {/* Review queue + weak topics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <FadeUp delay={0.1}>
          <Card className="h-full">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-white">
                <BrainIcon className="h-[18px] w-[18px] text-brand-300" />
                Today's review
              </h2>
              {srs && srs.dueToday > 0 && (
                <Badge tone="amber">{srs.dueToday} due</Badge>
              )}
            </div>
            {srs && srs.dueToday > 0 ? (
              <>
                <p className="mt-3 text-sm text-ink-300">
                  {srs.dueToday} item{srs.dueToday === 1 ? "" : "s"} scheduled by
                  spaced repetition — timed for the moment before you'd forget
                  them. This is the highest-retention studying you can do today.
                </p>
                <Link to="/review" className="btn-primary mt-4 inline-flex">
                  Start review <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-400">
                {srs && srs.total > 0
                  ? "Nothing due — you're all caught up. Answer practice questions or study flashcards to keep the queue fed."
                  : "Answer practice questions or study flashcards and they'll come back here at scientifically-timed intervals."}
              </p>
            )}
          </Card>
        </FadeUp>

        <FadeUp delay={0.15}>
          <Card className="h-full">
            <h2 className="flex items-center gap-2 font-semibold text-white">
              <TargetIcon className="h-[18px] w-[18px] text-brand-300" />
              Focus areas
            </h2>
            {weak.length > 0 ? (
              <div className="mt-3 space-y-2.5">
                {weak.map((t) => (
                  <Link
                    key={`${t.subjectId}-${t.topic}`}
                    to={`/practice?subject=${t.subjectId}&topic=${encodeURIComponent(t.topic)}`}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-brand-500/30 hover:bg-brand-500/5"
                  >
                    <span className="text-lg">{getSubject(t.subjectId).icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-100">
                        {t.topic}
                      </p>
                      <p className="text-xs text-ink-400">
                        {getSubject(t.subjectId).short} ·{" "}
                        {Math.round(t.accuracy * 100)}% accuracy over {t.attempts}
                      </p>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-500" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-400">
                Once you've answered a few questions, your weakest topics show up
                here so every session starts where it counts.
              </p>
            )}
          </Card>
        </FadeUp>
      </div>

      {/* Heatmap */}
      <FadeUp delay={0.2}>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-white">
              <BoltIcon className="h-[18px] w-[18px] text-brand-300" />
              Study activity
            </h2>
            <span className="text-xs text-ink-400">
              {days.filter((d) => d.questions + d.reviews + d.essays > 0).length}{" "}
              active days
            </span>
          </div>
          <Heatmap stats={days} />
        </Card>
      </FadeUp>

      {/* Subject mastery */}
      <FadeUp delay={0.25}>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">Your subjects</h2>
            <Link
              to="/progress"
              className="text-xs font-semibold text-brand-300 hover:text-brand-200"
            >
              Full analytics →
            </Link>
          </div>
          {(profile?.subjects?.length ?? 0) === 0 ? (
            <EmptyState title="No subjects selected yet">
              Head to onboarding to pick your HSC subjects.
            </EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mastery.map((m) => {
                const subject = getSubject(m.subjectId);
                return (
                  <Link
                    key={m.subjectId}
                    to={`/practice?subject=${m.subjectId}`}
                    className="card group p-5 transition hover:border-brand-500/30"
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-xl text-lg"
                        style={{
                          background: `linear-gradient(135deg, ${subject.gradient[0]}33, ${subject.gradient[1]}33)`,
                        }}
                      >
                        {subject.icon}
                      </span>
                      <span
                        className={cn(
                          "text-lg font-bold",
                          m.mastery >= 0.7
                            ? "text-emerald-400"
                            : m.mastery >= 0.4
                              ? "text-amber-400"
                              : "text-ink-300",
                        )}
                      >
                        {m.attempts > 0 ? `${Math.round(m.mastery * 100)}%` : "—"}
                      </span>
                    </div>
                    <p className="mt-3 font-semibold text-white group-hover:text-brand-200">
                      {subject.name}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {m.attempts > 0
                        ? `${m.attempts} questions · ${Math.round(m.coverage * 100)}% of topics touched`
                        : "No practice yet — mastery builds as you answer"}
                    </p>
                    <Progress
                      value={m.mastery}
                      className="mt-3"
                      tone={
                        m.mastery >= 0.7 ? "green" : m.mastery >= 0.4 ? "amber" : "brand"
                      }
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </FadeUp>
    </div>
  );
}

function greeting(): string {
  const h = Number(
    new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      hour12: false,
      timeZone: "Australia/Sydney",
    }).format(new Date()),
  );
  if (h < 5) return "Late one";
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}
