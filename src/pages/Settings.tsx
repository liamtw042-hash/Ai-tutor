import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  defaultLevelFor,
  getSubject,
  selectableSubjectsForBaseYear,
} from "@/data/subjects";
import { SubjectPicker } from "@/components/SubjectPicker";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  cn,
} from "@/components/ui";
import { CheckIcon, SettingsIcon, UsersIcon } from "@/components/icons";
import {
  YEAR_LEVELS,
  yearLevelMeta,
  type SubjectId,
  type YearLevel,
} from "@/types";

const GOAL_PRESETS = [
  { value: 10, label: "Casual" },
  { value: 20, label: "Serious" },
  { value: 35, label: "All-in" },
];

export default function Settings() {
  const { profile, configured, saveSettings } = useAuth();

  const [yearLevel, setYearLevel] = useState<YearLevel>("year12");
  const [subjects, setSubjects] = useState<SubjectId[]>([]);
  const [levels, setLevels] = useState<Record<SubjectId, YearLevel>>({});
  const [dailyGoal, setDailyGoal] = useState(20);
  const [displayName, setDisplayName] = useState("");
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false);
  const [leaderboardAlias, setLeaderboardAlias] = useState("");

  const [dropped, setDropped] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Seed local state from the profile.
  useEffect(() => {
    if (!profile) return;
    setYearLevel(profile.yearLevel);
    setSubjects(profile.subjects ?? []);
    setLevels(profile.subjectLevels ?? {});
    setDailyGoal(profile.dailyGoal || 20);
    setDisplayName(profile.displayName ?? "");
    setLeaderboardOptIn(profile.leaderboardOptIn ?? false);
    setLeaderboardAlias(profile.leaderboardAlias ?? "");
  }, [profile]);


  const chooseYear = (id: YearLevel) => {
    setSaved(false);
    setYearLevel(id);
    const allowed = new Set(selectableSubjectsForBaseYear(id).map((s) => s.id));
    const keep = subjects.filter((s) => allowed.has(s));
    const lost = subjects.filter((s) => !allowed.has(s));
    setSubjects(keep);
    setLevels(() => {
      const next: Record<SubjectId, YearLevel> = {};
      for (const sid of keep) {
        next[sid] = defaultLevelFor(getSubject(sid), id);
      }
      return next;
    });
    setDropped(lost.map((s) => getSubject(s).name));
  };

  const toggleSubject = (id: SubjectId) => {
    setSaved(false);
    setSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
    setLevels((prev) => {
      const next = { ...prev };
      if (subjects.includes(id)) delete next[id];
      else next[id] = defaultLevelFor(getSubject(id), yearLevel);
      return next;
    });
  };

  const setLevel = (id: SubjectId, level: YearLevel) => {
    setSaved(false);
    setLevels((prev) => ({ ...prev, [id]: level }));
  };

  const dirty = useMemo(() => {
    if (!profile) return false;
    const sameSubjects =
      subjects.length === (profile.subjects?.length ?? 0) &&
      subjects.every((s) => profile.subjects?.includes(s));
    const savedLevels = profile.subjectLevels ?? {};
    const sameLevels =
      subjects.every((s) => (levels[s] ?? null) === (savedLevels[s] ?? null)) &&
      Object.keys(savedLevels).every((s) => subjects.includes(s));
    return (
      yearLevel !== profile.yearLevel ||
      !sameSubjects ||
      !sameLevels ||
      dailyGoal !== (profile.dailyGoal || 20) ||
      displayName.trim() !== (profile.displayName ?? "") ||
      leaderboardOptIn !== (profile.leaderboardOptIn ?? false) ||
      leaderboardAlias.trim() !== (profile.leaderboardAlias ?? "")
    );
  }, [
    profile,
    yearLevel,
    subjects,
    levels,
    dailyGoal,
    displayName,
    leaderboardOptIn,
    leaderboardAlias,
  ]);

  const save = async () => {
    setError("");
    if (subjects.length === 0) {
      setError("Pick at least one subject.");
      return;
    }
    const name = displayName.trim();
    if (!name) {
      setError("Your name can't be empty.");
      return;
    }
    let alias = leaderboardAlias.trim();
    if (leaderboardOptIn && !alias) {
      alias = `Student-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      setLeaderboardAlias(alias);
    }
    setSaving(true);
    try {
      await saveSettings({
        yearLevel,
        subjects,
        subjectLevels: levels,
        dailyGoal,
        displayName: name,
        leaderboardOptIn,
        leaderboardAlias: alias,
      });
      setDropped([]);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!configured || !profile) {
    return (
      <EmptyState
        icon={<SettingsIcon className="h-7 w-7" />}
        title="Settings need an account"
      >
        Sign in (configure Firebase) to change your year level, subjects and
        profile.
      </EmptyState>
    );
  }

  const meta = yearLevelMeta(yearLevel);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-24">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/25">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="text-sm text-ink-400">
            Change your year, subjects and profile any time — your streak, XP and
            progress stay exactly where they are.
          </p>
        </div>
      </div>

      {/* Year level */}
      <Card>
        <h2 className="font-semibold text-white">Year level</h2>
        <p className="mt-0.5 text-sm text-ink-400">
          Topics, practice, marking and the AI tutor all adapt to your stage.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
              <p className="font-display text-xl font-bold text-white">
                {y.label}
              </p>
              <p className="text-xs font-semibold text-brand-200">{y.stage}</p>
            </button>
          ))}
        </div>
        {dropped.length > 0 && (
          <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {dropped.join(", ")} {dropped.length === 1 ? "isn't" : "aren't"}{" "}
            offered at {meta.label}, so {dropped.length === 1 ? "it was" : "they were"}{" "}
            removed from your subjects. Everything else carries over.
          </p>
        )}
      </Card>

      {/* Subjects */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Subjects</h2>
            <p className="mt-0.5 text-sm text-ink-400">
              Subjects for {meta.label}. Studying one ahead? Bump a subject up a
              stage — it stays at that level everywhere.
            </p>
          </div>
          <Badge tone={subjects.length ? "brand" : "amber"}>
            {subjects.length} selected
          </Badge>
        </div>
        <div className="mt-4">
          <SubjectPicker
            baseYear={yearLevel}
            selected={subjects}
            levels={levels}
            onToggle={toggleSubject}
            onSetLevel={setLevel}
          />
        </div>
      </Card>

      {/* Daily goal */}
      <Card>
        <h2 className="font-semibold text-white">Daily goal</h2>
        <p className="mt-0.5 text-sm text-ink-400">
          Questions + reviews per day. Small and consistent wins.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {GOAL_PRESETS.map((g) => (
            <button
              key={g.value}
              onClick={() => {
                setSaved(false);
                setDailyGoal(g.value);
              }}
              className={cn(
                "chip transition",
                dailyGoal === g.value
                  ? "border-brand-500/40 bg-brand-500/10 text-brand-200"
                  : "hover:border-white/25",
              )}
            >
              {g.label} · {g.value}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4">
          <input
            type="range"
            min={5}
            max={50}
            value={dailyGoal}
            onChange={(e) => {
              setSaved(false);
              setDailyGoal(Number(e.target.value));
            }}
            className="flex-1 accent-brand-500"
          />
          <span className="w-16 shrink-0 text-right font-display text-2xl font-bold text-white">
            {dailyGoal}
          </span>
        </div>
      </Card>

      {/* Profile */}
      <Card>
        <h2 className="font-semibold text-white">Profile</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              className="input"
              value={displayName}
              onChange={(e) => {
                setSaved(false);
                setDisplayName(e.target.value);
              }}
              placeholder="Your name"
            />
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-[18px] w-[18px] text-ink-500" />
                <div>
                  <p className="text-sm font-medium text-ink-100">
                    Anonymous leaderboard
                  </p>
                  <p className="text-xs text-ink-400">
                    Appear on the leaderboard under an alias only.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={leaderboardOptIn}
                onClick={() => {
                  setSaved(false);
                  setLeaderboardOptIn((v) => !v);
                }}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition",
                  leaderboardOptIn ? "bg-brand-500" : "bg-white/15",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
                    leaderboardOptIn ? "left-[22px]" : "left-0.5",
                  )}
                />
              </button>
            </div>
            {leaderboardOptIn && (
              <div className="mt-3">
                <label className="label" htmlFor="alias">
                  Leaderboard alias
                </label>
                <input
                  id="alias"
                  className="input"
                  value={leaderboardAlias}
                  maxLength={40}
                  onChange={(e) => {
                    setSaved(false);
                    setLeaderboardAlias(e.target.value);
                  }}
                  placeholder="e.g. QuietAchiever"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/85 p-3.5 backdrop-blur">
        <span className="text-sm text-ink-300">
          {saved && !dirty ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <CheckIcon className="h-4 w-4" /> Saved
            </span>
          ) : dirty ? (
            "You have unsaved changes"
          ) : (
            "All changes saved"
          )}
        </span>
        <Button onClick={save} loading={saving} disabled={!dirty || saving}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
