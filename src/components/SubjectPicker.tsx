import { useMemo, useState } from "react";
import { subjectsForYearByArea } from "@/data/subjects";
import { cn } from "@/components/ui";
import { CheckIcon } from "@/components/icons";
import type { SubjectId, YearLevel } from "@/types";

// Grouped, searchable subject picker. Groups the (potentially long) subject
// list by NESA key learning area and filters as you type, so choosing from ~30+
// courses per stage stays fast and tidy.

export function SubjectPicker({
  year,
  selected,
  onToggle,
}: {
  year: YearLevel;
  selected: SubjectId[];
  onToggle: (id: SubjectId) => void;
}) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => subjectsForYearByArea(year), [year]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        area: g.area,
        subjects: g.subjects.filter((s) => {
          const hay = [s.name, s.short, s.area, ...s.topics]
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        }),
      }))
      .filter((g) => g.subjects.length > 0);
  }, [groups, q]);

  const total = filtered.reduce((n, g) => n + g.subjects.length, 0);

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 mb-3 bg-transparent px-1">
        <input
          className="input"
          placeholder="Search subjects — e.g. physics, legal, japanese…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search subjects"
        />
      </div>

      {total === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-ink-400">
          No subjects match “{query}”. Try a different search.
        </p>
      ) : (
        <div className="space-y-5">
          {filtered.map((g) => (
            <div key={g.area}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
                  {g.area}
                </h3>
                <span className="text-[11px] text-ink-500">
                  {g.subjects.length}
                </span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {g.subjects.map((s) => {
                  const active = selected.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onToggle(s.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                        active
                          ? "border-brand-500/50 bg-brand-500/10 ring-1 ring-inset ring-brand-500/30"
                          : "border-white/8 bg-ink-900/50 hover:border-white/20",
                      )}
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
                        <p className="truncate text-sm font-semibold text-white">
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
