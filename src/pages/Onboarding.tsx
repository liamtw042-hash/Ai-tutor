import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button, cn } from "@/components/ui";
import { CheckIcon } from "@/components/icons";
import { SUBJECTS } from "@/data/subjects";
import { useAuth } from "@/lib/auth";
import { saveDailyGoal } from "@/lib/firestore";
import type { SubjectId } from "@/types";

const GOALS = [
  { value: 10, label: "Casual", desc: "10 a day — keep the streak alive" },
  { value: 20, label: "Serious", desc: "20 a day — steady mark gains" },
  { value: 35, label: "All-in", desc: "35 a day — trials & HSC season" },
];

export default function Onboarding() {
  const { user, profile, saveSubjects, configured, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<SubjectId[]>([]);
  const [goal, setGoal] = useState(20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.subjects?.length) setSelected(profile.subjects);
    if (profile?.dailyGoal) setGoal(profile.dailyGoal);
  }, [profile]);

  const toggle = (id: SubjectId) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const finish = async () => {
    setSaving(true);
    try {
      if (configured) {
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
        Which subjects are you studying?
      </h1>
      <p className="mt-2 text-ink-300">
        Pick all that apply — we'll tailor your dashboard, practice and tutor to
        them. You can change these later.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {SUBJECTS.map((s) => {
          const active = selected.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={cn(
                "group flex items-center gap-4 rounded-2xl border p-4 text-left transition",
                active
                  ? "border-brand-500/50 bg-brand-500/10 ring-1 ring-inset ring-brand-500/30"
                  : "border-white/8 bg-ink-900/50 hover:border-white/20",
              )}
            >
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xl"
                style={{
                  background: `linear-gradient(135deg, ${s.gradient[0]}, ${s.gradient[1]})`,
                }}
                aria-hidden
              >
                {s.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{s.name}</p>
                <p className="truncate text-xs text-ink-400">{s.blurb}</p>
              </div>
              <div
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition",
                  active
                    ? "border-brand-400 bg-brand-500 text-white"
                    : "border-white/20 text-transparent",
                )}
              >
                <CheckIcon className="h-4 w-4" />
              </div>
            </button>
          );
        })}
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

      <div className="sticky bottom-4 mt-8 flex items-center justify-between rounded-2xl border border-white/10 bg-ink-900/80 p-4 backdrop-blur">
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
