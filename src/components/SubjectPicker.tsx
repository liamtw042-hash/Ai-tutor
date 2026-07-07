import { useMemo, useState } from "react";
import {
  allowedLevels,
  defaultLevelFor,
  getSubject,
  selectableSubjectsByArea,
} from "@/data/subjects";
import { cn } from "@/components/ui";
import { CheckIcon } from "@/components/icons";
import {
  yearLevelMeta,
  type SubjectId,
  type YearLevel,
} from "@/types";

// Grouped, searchable subject picker. Groups the (long) subject list by NESA
// key learning area and filters as you type. Each selected subject can be
// studied at the base year or one stage above (accelerated) where the subject
// is offered at that higher stage — common in NSW schools.

export function SubjectPicker({
  baseYear,
  selected,
  levels,
  onToggle,
  onSetLevel,
}: {
  baseYear: YearLevel;
  selected: SubjectId[];
  levels: Record<SubjectId, YearLevel>;
  onToggle: (id: SubjectId) => void;
  onSetLevel: (id: SubjectId, level: YearLevel) => void;
}) {
  const [query, setQuery] = useState("");
  const groups = useMemo(
    () => selectableSubjectsByArea(baseYear),
    [baseYear],
  );

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        area: g.area,
        subjects: g.subjects.filter((s) =>
          [s.name, s.short, s.area, ...s.topics]
            .join(" ")
            .toLowerCase()
            .includes(q),
        ),
      }))
      .filter((g) => g.subjects.length > 0);
  }, [groups, q]);

  const total = filtered.reduce((n, g) => n + g.subjects.length, 0);

  return (
    <div>
      <input
        className="input mb-4"
        placeholder="Search subjects — e.g. physics, legal, japanese…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search subjects"
      />

      {total === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-ink-400">
          No subjects match “{query}”. Try a different search.
        </p>
      ) : (
        <div className="space-y-6">
          {filtered.map((g) => (
            <div key={g.area}>
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
                {g.area}
              </h3>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {g.subjects.map((s) => {
                  const active = selected.includes(s.id);
                  const allowed = allowedLevels(s, baseYear);
                  const current =
                    levels[s.id] ?? defaultLevelFor(getSubject(s.id), baseYear);
                  const inherentlyAccel =
                    allowed.length === 1 && allowed[0] !== baseYear;
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "rounded-xl border p-3 transition",
                        active
                          ? "border-brand-500/50 bg-brand-500/[0.07]"
                          : "border-white/8 hover:border-white/20",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onToggle(s.id)}
                        className="flex w-full items-center gap-3 text-left"
                      >
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base"
                          style={{
                            background: `linear-gradient(135deg, ${s.gradient[0]}, ${s.gradient[1]})`,
                          }}
                          aria-hidden
                        >
                          {s.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {s.name}
                          </p>
                          <p className="truncate text-xs text-ink-400">
                            {s.blurb}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition",
                            active
                              ? "border-brand-400 bg-brand-500 text-white"
                              : "border-white/20 text-transparent",
                          )}
                        >
                          <CheckIcon className="h-3.5 w-3.5" />
                        </span>
                      </button>

                      {/* Per-subject level (accelerated study) */}
                      {active && allowed.length > 1 && (
                        <div className="mt-2.5 flex items-center gap-1.5 pl-12">
                          <span className="text-[11px] text-ink-500">
                            Studying at
                          </span>
                          {allowed.map((level) => {
                            const on = current === level;
                            const accel = level !== baseYear;
                            return (
                              <button
                                key={level}
                                type="button"
                                onClick={() => onSetLevel(s.id, level)}
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px] font-medium transition",
                                  on
                                    ? "bg-brand-500/20 text-brand-200 ring-1 ring-inset ring-brand-500/40"
                                    : "text-ink-400 hover:text-ink-200",
                                )}
                              >
                                {yearLevelMeta(level).short}
                                {accel ? " · accel" : ""}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {active && inherentlyAccel && (
                        <div className="mt-2 pl-12">
                          <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-inset ring-amber-500/25">
                            {yearLevelMeta(current).short} · accelerated
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
