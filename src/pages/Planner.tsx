import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { isPremium } from "@/lib/premium";
import { generatePlan } from "@/lib/claude";
import {
  fetchRecentAttempts,
  fetchStudyPlan,
  saveStudyPlan,
} from "@/lib/firestore";
import { weakestTopics } from "@/lib/mastery";
import { DEMO_SUBJECT_IDS, SUBJECTS, getSubject } from "@/data/subjects";
import { dayDiff, dayLabel, sydneyDayKey } from "@/lib/dates";
import {
  Badge,
  Button,
  Card,
  Modal,
  Spinner,
  cn,
} from "@/components/ui";
import {
  BrainIcon,
  CalendarIcon,
  CardsIcon,
  ClockIcon,
  DocIcon,
  LockIcon,
  PenIcon,
  RefreshIcon,
  SparkIcon,
} from "@/components/icons";
import type { PlanExam, StudyPlan, SubjectId } from "@/types";

const ACTIVITY_META: Record<
  string,
  { icon: (p: { className?: string }) => JSX.Element; label: string; to: string }
> = {
  practice: { icon: PenIcon, label: "Practice", to: "/practice" },
  review: { icon: BrainIcon, label: "Review", to: "/review" },
  flashcards: { icon: CardsIcon, label: "Flashcards", to: "/flashcards" },
  essay: { icon: DocIcon, label: "Essay", to: "/essay" },
  "past-paper": { icon: ClockIcon, label: "Past paper", to: "/exam" },
};

export default function Planner() {
  const { user, profile, configured, togglePremium } = useAuth();
  const premium = isPremium(profile);

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const subjects: SubjectId[] =
    profile?.subjects?.length ? profile.subjects : DEMO_SUBJECT_IDS;
  const [dates, setDates] = useState<Record<string, string>>({});
  const [hours, setHours] = useState(10);

  useEffect(() => {
    if (!configured || !user || !premium) {
      setLoading(false);
      return;
    }
    fetchStudyPlan(user.uid)
      .then((p) => {
        setPlan(p);
        if (p) {
          setHours(p.hoursPerWeek);
          setDates(Object.fromEntries(p.exams.map((e) => [e.subjectId, e.date])));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [configured, user, premium]);

  const build = async () => {
    setError("");
    const exams: PlanExam[] = Object.entries(dates)
      .filter(([, d]) => d)
      .map(([subjectId, date]) => ({ subjectId: subjectId as SubjectId, date }));
    if (exams.length === 0) {
      setError("Add at least one exam date.");
      return;
    }
    setBusy(true);
    try {
      const attempts = user ? await fetchRecentAttempts(user.uid) : [];
      const selected = new Set(profile?.subjects ?? []);
      const weak = weakestTopics(
        attempts.filter((a) => selected.has(a.subjectId)),
        6,
      ).map((w) => ({
        subjectName: getSubject(w.subjectId).name,
        topic: w.topic,
        accuracy: w.accuracy,
      }));
      const res = await generatePlan(
        exams.map((e) => ({
          subjectName: getSubject(e.subjectId).name,
          subjectId: e.subjectId,
          date: e.date,
        })),
        hours,
        weak,
        sydneyDayKey(),
        { email: profile?.email, premium },
      );
      const newPlan: StudyPlan = {
        exams,
        hoursPerWeek: hours,
        summary: res.summary,
        weeks: res.weeks,
        createdAt: Date.now(),
      };
      if (user) await saveStudyPlan(user.uid, newPlan);
      setPlan(newPlan);
      setSetupOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't generate the plan. Is the API deployed?",
      );
    } finally {
      setBusy(false);
    }
  };

  const today = sydneyDayKey();
  const currentWeekIdx = useMemo(() => {
    if (!plan) return -1;
    let idx = -1;
    plan.weeks.forEach((w, i) => {
      if (dayDiff(w.startDay, today) >= 0) idx = i;
    });
    return idx;
  }, [plan, today]);

  if (!premium) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="p-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
            <LockIcon className="h-7 w-7" />
          </div>
          <h1 className="page-title">
            Study plans are a Premium feature
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            Enter your exam dates and available hours, and StudyMate builds a
            week-by-week schedule counting down to the HSC — weighted toward
            your weak topics, switching to past papers as each exam closes in.
          </p>
          <Button className="mt-6" onClick={togglePremium}>
            <SparkIcon className="h-4 w-4" /> Upgrade — $20/mo
          </Button>
          <p className="mt-2 text-[11px] text-ink-500">
            Demo: toggles instantly, no card required
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Spinner className="h-7 w-7 text-brand-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">
            Study Plan
          </h1>
          <p className="page-subtitle">
            A personalised countdown to your exams, rebuilt around your real
            weak spots.
          </p>
        </div>
        <Button variant={plan ? "ghost" : "primary"} onClick={() => setSetupOpen(true)}>
          {plan ? (
            <>
              <RefreshIcon className="h-4 w-4" /> Rebuild plan
            </>
          ) : (
            <>
              <CalendarIcon className="h-4 w-4" /> Set up my plan
            </>
          )}
        </Button>
      </div>

      {!plan ? (
        <Card className="p-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
            <CalendarIcon className="h-7 w-7" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">
            No plan yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-400">
            Tell StudyMate when each exam is and how many hours a week you can
            give it. The AI coach does the rest — and updates the weighting as
            your performance data grows.
          </p>
          <Button className="mx-auto mt-5" onClick={() => setSetupOpen(true)}>
            <CalendarIcon className="h-4 w-4" /> Set up my plan
          </Button>
        </Card>
      ) : (
        <>
          {/* Exam countdowns */}
          <div className="flex flex-wrap gap-3">
            {plan.exams
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((e) => {
                const days = dayDiff(today, e.date);
                const s = getSubject(e.subjectId);
                return (
                  <div
                    key={e.subjectId}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-2.5",
                      days <= 14
                        ? "border-red-500/30 bg-red-500/5"
                        : days <= 42
                          ? "border-amber-500/25 bg-amber-500/5"
                          : "border-white/10 bg-white/[0.03]",
                    )}
                  >
                    <span className="text-lg">{s.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {s.short}
                      </p>
                      <p className="text-xs text-ink-400">
                        {days >= 0 ? `${days} days — ${dayLabel(e.date)}` : "done"}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>

          <Card>
            <p className="text-sm leading-relaxed text-ink-200">{plan.summary}</p>
            <p className="mt-2 text-xs text-ink-500">
              {plan.hoursPerWeek} hrs/week · built{" "}
              {new Date(plan.createdAt).toLocaleDateString("en-AU")}
            </p>
          </Card>

          {/* Weeks */}
          <div className="space-y-4">
            {plan.weeks.map((week, i) => {
              const isCurrent = i === currentWeekIdx;
              const isPast = dayDiff(week.startDay, today) > 6;
              return (
                <Card
                  key={week.startDay}
                  className={cn(
                    isCurrent && "border-brand-500/40",
                    isPast && !isCurrent && "opacity-55",
                  )}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">
                      Week of {dayLabel(week.startDay)}
                    </h3>
                    {isCurrent && <Badge tone="brand">This week</Badge>}
                    <span className="text-xs text-ink-400">— {week.focus}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {week.tasks.map((task, ti) => {
                      const meta = ACTIVITY_META[task.activity] ?? ACTIVITY_META.practice;
                      const Icon = meta.icon;
                      const subj = SUBJECTS.find((s) => s.id === task.subjectId);
                      return (
                        <Link
                          key={ti}
                          to={meta.to}
                          className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/15"
                        >
                          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-ink-300">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink-100">
                              {subj?.short ?? task.subjectId} · {task.topic}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-ink-400">
                              {meta.label} · {task.minutes} min — {task.note}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Setup modal */}
      <Modal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        title="Build your study plan"
        wide
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-300">
            Add the exam date for each subject you're planning for (skip any you
            aren't).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {subjects.map((id) => {
              const s = getSubject(id);
              return (
                <div key={id}>
                  <label className="label">
                    {s.icon} {s.short}
                  </label>
                  <input
                    type="date"
                    className="input"
                    min={sydneyDayKey()}
                    value={dates[id] ?? ""}
                    onChange={(e) =>
                      setDates((d) => ({ ...d, [id]: e.target.value }))
                    }
                  />
                </div>
              );
            })}
          </div>
          <div>
            <label className="label">
              Study hours per week (outside school) — {hours}h
            </label>
            <input
              type="range"
              min={2}
              max={35}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <Button className="w-full" onClick={build} loading={busy}>
            <SparkIcon className="h-4 w-4" />
            {busy ? "Building your plan…" : "Generate my plan"}
          </Button>
          <p className="text-center text-xs text-ink-500">
            Uses your real practice data to weight weak topics. Takes ~20
            seconds.
          </p>
        </div>
      </Modal>
    </div>
  );
}
