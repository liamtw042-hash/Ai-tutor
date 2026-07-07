import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button, cn } from "@/components/ui";
import { subjectsForYear } from "@/data/subjects";
import { SubjectPicker } from "@/components/SubjectPicker";
import { DISCLAIMERS } from "@/data/nesa";
import { useAuth } from "@/lib/auth";
import { saveDailyGoal, saveYearLevel } from "@/lib/firestore";
import { YEAR_LEVELS, type SubjectId, type YearLevel } from "@/types";

const GOALS = [
  { value: 10, label: "Casual", desc: "10 a day — keep the streak alive" },
  { value: 20, label: "Serious", desc: "20 a day — steady mark gains" },
  { value: 35, label: "All-in", desc: "35 a day — trials & exam season" },
];

export default function Onboarding() {
  const { user, profile, saveSubjects, configured, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [yearLevel, setYearLevel] = useState<YearLevel>("year12");
  const [selected, setSelected] = useState<SubjectId[]>([]);
  const [goal, setGoal] = useState(20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.yearLevel) setYearLevel(profile.yearLevel);
    if (profile?.subjects?.length) setSelected(profile.subjects);
    if (profile?.dailyGoal) setGoal(profile.dailyGoal);
  }, [profile]);


  const chooseYear = (id: YearLevel) => {
    setYearLevel(id);
    // Drop any selected subjects not offered at the new year level.
    const allowed = new Set(subjectsForYear(id).map((s) => s.id));
    setSelected((prev) => prev.filter((s) => allowed.has(s)));
  };

  const toggle = (id: SubjectId) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const finish = async () => {
    setSaving(true);
    try {
      if (configured) {
        if (user) await saveYearLevel(user.uid, yearLevel);
        await saveSubjects(selected);
        if (user) await saveDailyGoal(user.uid, goal);
        await refreshProfile();
      }
      navigate("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <span className="text-sm text-ink-400">Quick setup · ~30 seconds</span>
      </div>

      <h1 className="font-display text-3xl font-bold text-white">
        What year are you in?
      </h1>
      <p className="mt-2 text-ink-300">
        We'll tailor topics, practice and marking to your NSW stage — Year 10
        (Stage 5), Year 11 (Preliminary) or Year 12 (HSC).
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {YEAR_LEVELS.map((y) => (
          <button
            key={y.id}
            onClick={() => chooseYear(y.id)}
            className={cn(
              "rounded-2xl border p-4 text-left transition",
              yearLevel === y.id
                ? "border-brand-500/50 bg-brand-500/10 ring-1 ring-inset ring-brand-500/30"
                : "border-white/8 bg-ink-900/50 hover:border-white/20",
            )}
          >
            <p className="font-display text-2xl font-bold text-white">
              {y.label}
            </p>
            <p className="text-sm font-semibold text-brand-200">{y.stage}</p>
            <p className="mt-0.5 text-xs text-ink-400">{y.blurb}</p>
          </button>
        ))}
      </div>

      <h2 className="mt-10 font-display text-2xl font-bold text-white">
        Which subjects are you studying?
      </h2>
      <p className="mt-2 text-ink-300">
        Pick all that apply — we'll tailor your dashboard, practice and tutor to
        them. You can change these later.
      </p>

      <div className="mt-8">
        <SubjectPicker
          year={yearLevel}
          selected={selected}
          onToggle={toggle}
        />
      </div>

      <h2 className="mt-10 font-display text-xl font-bold text-white">
        Set your daily goal
      </h2>
      <p className="mt-1 text-sm text-ink-400">
        Questions + reviews per day. Small and consistent beats heroic and
        occasional — you can change this anytime.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {GOALS.map((g) => (
          <button
            key={g.value}
            onClick={() => setGoal(g.value)}
            className={cn(
              "rounded-2xl border p-4 text-left transition",
              goal === g.value
                ? "border-brand-500/50 bg-brand-500/10 ring-1 ring-inset ring-brand-500/30"
                : "border-white/8 bg-ink-900/50 hover:border-white/20",
            )}
          >
            <p className="font-display text-2xl font-bold text-white">
              {g.value}
            </p>
            <p className="text-sm font-semibold text-brand-200">{g.label}</p>
            <p className="mt-0.5 text-xs text-ink-400">{g.desc}</p>
          </button>
        ))}
      </div>

      <p className="mt-8 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-ink-500">
        {DISCLAIMERS.general}
      </p>

      <div className="sticky bottom-4 mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-ink-900/80 p-4 backdrop-blur">
        <span className="text-sm text-ink-300">
          {selected.length} subject{selected.length === 1 ? "" : "s"} selected
        </span>
        <Button onClick={finish} loading={saving} disabled={selected.length === 0}>
          Continue to dashboard
        </Button>
      </div>
    </div>
  );
}
