import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, EmptyState, Progress, cn } from "@/components/ui";
import {
  ArrowRightIcon,
  ChatIcon,
  DocIcon,
  FlameIcon,
  PenIcon,
  TargetIcon,
  TrophyIcon,
} from "@/components/icons";
import { SUBJECTS, getSubject } from "@/data/subjects";
import { questionsForSubject } from "@/data/questions";
import { useAuth } from "@/lib/auth";
import {
  computeTopicStats,
  fetchRecentAttempts,
  type AttemptRow,
  type TopicStat,
} from "@/lib/firestore";
import type { SubjectId } from "@/types";

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "brand",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "brand" | "green" | "amber";
}) {
  const tones = {
    brand: "text-brand-300 bg-brand-500/15 ring-brand-500/25",
    green: "text-emerald-300 bg-emerald-500/15 ring-emerald-500/25",
    amber: "text-amber-300 bg-amber-500/15 ring-amber-500/25",
  };
  return (
    <Card className="flex items-center gap-4">
      <div
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ring-inset",
          tones[tone],
        )}
      >
        {icon}
      </div>
      <div>
        <div className="font-display text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-ink-400">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-ink-500">{hint}</div>}
      </div>
    </Card>
  );
}

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);

  const subjects: SubjectId[] =
    profile?.subjects?.length ? profile.subjects : SUBJECTS.map((s) => s.id);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!profile) {
        setLoading(false);
        return;
      }
      try {
        const rows = await fetchRecentAttempts(profile.uid, 100);
        if (active) setAttempts(rows);
      } catch {
        /* demo mode / no data */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [profile]);

  const weakTopics: TopicStat[] = useMemo(() => {
    return computeTopicStats(attempts)
      .filter((t) => t.attempts >= 1)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 4);
  }, [attempts]);

  const firstName = (profile?.displayName || "there").split(" ")[0];
  const answered = profile?.questionsAnswered ?? attempts.length;
  const streak = profile?.streak ?? 0;
  const accuracy =
    profile && profile.questionsAnswered > 0
      ? profile.correctCount / profile.questionsAnswered
      : attempts.length
        ? attempts.filter((a) => a.correct).length / attempts.length
        : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Hey {firstName} 👋
          </h1>
          <p className="mt-1 text-ink-300">
            {streak > 0
              ? `You're on a ${streak}-day streak. Keep it rolling.`
              : "Let's get a study streak started today."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/practice" className="btn-primary">
            <PenIcon className="h-4 w-4" /> Start practising
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<PenIcon className="h-5 w-5" />}
          label="Questions answered"
          value={answered}
        />
        <StatCard
          icon={<FlameIcon className="h-5 w-5" />}
          label="Day streak"
          value={streak}
          tone="amber"
          hint={streak > 0 ? "Come back tomorrow to keep it" : "Answer 1 to start"}
        />
        <StatCard
          icon={<TrophyIcon className="h-5 w-5" />}
          label="Accuracy"
          value={`${Math.round(accuracy * 100)}%`}
          tone="green"
        />
        <StatCard
          icon={<TargetIcon className="h-5 w-5" />}
          label="Subjects"
          value={subjects.length}
        />
      </div>

      {/* Subjects */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">
            Your subjects
          </h2>
          <Link
            to="/onboarding"
            className="text-sm text-brand-300 hover:text-brand-200"
          >
            Edit subjects
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((id) => {
            const s = getSubject(id);
            const qCount = questionsForSubject(id).length;
            const stat = computeTopicStats(
              attempts.filter((a) => a.subjectId === id),
            );
            const attemptsForSubject = stat.reduce(
              (n, t) => n + t.attempts,
              0,
            );
            const correctForSubject = stat.reduce((n, t) => n + t.correct, 0);
            const acc =
              attemptsForSubject > 0
                ? correctForSubject / attemptsForSubject
                : 0;
            return (
              <Link
                key={id}
                to={`/practice?subject=${id}`}
                className="card group relative overflow-hidden p-5 transition hover:border-brand-500/30"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{
                    background: `linear-gradient(90deg, ${s.gradient[0]}, ${s.gradient[1]})`,
                  }}
                />
                <div className="flex items-start justify-between">
                  <div
                    className="grid h-11 w-11 place-items-center rounded-xl text-xl"
                    style={{
                      background: `linear-gradient(135deg, ${s.gradient[0]}, ${s.gradient[1]})`,
                    }}
                    aria-hidden
                  >
                    {s.icon}
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-brand-300" />
                </div>
                <h3 className="mt-3 font-semibold text-white">{s.name}</h3>
                <p className="mt-0.5 text-xs text-ink-400">{qCount} questions</p>
                {attemptsForSubject > 0 && (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[11px] text-ink-400">
                      <span>{attemptsForSubject} attempted</span>
                      <span>{Math.round(acc * 100)}% correct</span>
                    </div>
                    <Progress
                      value={acc}
                      tone={acc >= 0.7 ? "green" : acc >= 0.4 ? "amber" : "red"}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weak topics */}
        <section>
          <h2 className="mb-4 font-display text-xl font-bold text-white">
            Topics to work on
          </h2>
          {loading ? (
            <Card className="h-40 shimmer" >{" "}</Card>
          ) : weakTopics.length === 0 ? (
            <EmptyState
              icon={<TargetIcon className="h-6 w-6" />}
              title="No weak spots yet"
            >
              Answer a few practice questions and we'll surface the topics that
              need the most attention.
            </EmptyState>
          ) : (
            <Card className="space-y-4">
              {weakTopics.map((t) => (
                <div key={`${t.subjectId}-${t.topic}`}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-100">
                        {t.topic}
                      </p>
                      <p className="text-xs text-ink-500">
                        {getSubject(t.subjectId).short}
                      </p>
                    </div>
                    <Badge
                      tone={
                        t.accuracy >= 0.7
                          ? "green"
                          : t.accuracy >= 0.4
                            ? "amber"
                            : "red"
                      }
                    >
                      {Math.round(t.accuracy * 100)}%
                    </Badge>
                  </div>
                  <Progress
                    value={t.accuracy}
                    tone={
                      t.accuracy >= 0.7
                        ? "green"
                        : t.accuracy >= 0.4
                          ? "amber"
                          : "red"
                    }
                  />
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* Recent activity */}
        <section>
          <h2 className="mb-4 font-display text-xl font-bold text-white">
            Recent activity
          </h2>
          {loading ? (
            <Card className="h-40 shimmer">{" "}</Card>
          ) : attempts.length === 0 ? (
            <EmptyState
              icon={<PenIcon className="h-6 w-6" />}
              title="Nothing here yet"
            >
              Your answered questions will appear here. Jump into practice to get
              started.
            </EmptyState>
          ) : (
            <Card className="divide-y divide-white/5 p-0">
              {attempts.slice(0, 6).map((a) => {
                const s = getSubject(a.subjectId);
                const ok =
                  a.correct === null
                    ? a.awardedMarks / Math.max(a.totalMarks, 1) >= 0.5
                    : a.correct;
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm"
                      style={{
                        background: `linear-gradient(135deg, ${s.gradient[0]}, ${s.gradient[1]})`,
                      }}
                      aria-hidden
                    >
                      {s.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink-100">{a.topic}</p>
                      <p className="text-xs text-ink-500">
                        {s.short} · {timeAgo(a.createdAtMs)}
                      </p>
                    </div>
                    <Badge tone={ok ? "green" : "red"}>
                      {a.awardedMarks}/{a.totalMarks}
                    </Badge>
                  </div>
                );
              })}
            </Card>
          )}
        </section>
      </div>

      {/* Shortcuts */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/tutor"
          className="card flex items-center gap-4 p-5 transition hover:border-brand-500/30"
        >
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/25">
            <ChatIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Ask the AI tutor</p>
            <p className="text-sm text-ink-400">
              Stuck on a concept? Talk it through.
            </p>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-ink-500" />
        </Link>
        <Link
          to="/essay"
          className="card flex items-center gap-4 p-5 transition hover:border-brand-500/30"
        >
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/25">
            <DocIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Get essay feedback</p>
            <p className="text-sm text-ink-400">
              Marked against NESA band criteria.
            </p>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-ink-500" />
        </Link>
      </section>
    </div>
  );
}
