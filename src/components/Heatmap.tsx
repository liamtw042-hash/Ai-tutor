import { useMemo, useState } from "react";
import type { DayStat } from "@/types";
import { dayLabel, lastNDayKeys } from "@/lib/dates";
import { cn } from "@/components/ui";

// GitHub-contribution-style study heatmap. Renders the last ~20 weeks in
// week-columns; intensity = questions + reviews + essays that day.

const LEVELS = [
  "bg-white/[0.045]",
  "bg-brand-500/25",
  "bg-brand-500/45",
  "bg-brand-500/70",
  "bg-brand-400",
];

function intensity(total: number): number {
  if (total <= 0) return 0;
  if (total < 5) return 1;
  if (total < 12) return 2;
  if (total < 25) return 3;
  return 4;
}

export function Heatmap({ stats, weeks = 20 }: { stats: DayStat[]; weeks?: number }) {
  const [hover, setHover] = useState<{ day: string; total: number } | null>(null);

  const grid = useMemo(() => {
    const byDay = new Map(stats.map((s) => [s.day, s]));
    const days = lastNDayKeys(weeks * 7);
    // pad the start so columns align Monday-first
    const firstDow = (new Date(days[0] + "T00:00:00Z").getUTCDay() + 6) % 7;
    const cells: ({ day: string; total: number } | null)[] = [
      ...Array.from({ length: firstDow }, () => null),
      ...days.map((day) => {
        const s = byDay.get(day);
        const total = s ? s.questions + s.reviews + s.essays : 0;
        return { day, total };
      }),
    ];
    const cols: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
    return cols;
  }, [stats, weeks]);

  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {grid.map((col, ci) => (
          <div key={ci} className="flex shrink-0 flex-col gap-[3px]">
            {col.map((cell, ri) =>
              cell ? (
                <div
                  key={ri}
                  onMouseEnter={() => setHover(cell)}
                  onMouseLeave={() => setHover(null)}
                  className={cn(
                    "h-[11px] w-[11px] rounded-[3px] transition-colors",
                    LEVELS[intensity(cell.total)],
                  )}
                />
              ) : (
                <div key={ri} className="h-[11px] w-[11px]" />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400">
        <span className="min-h-[14px]">
          {hover
            ? hover.total > 0
              ? `${dayLabel(hover.day)} — ${hover.total} item${hover.total === 1 ? "" : "s"} studied`
              : `${dayLabel(hover.day)} — no study`
            : `Last ${weeks} weeks`}
        </span>
        <span className="flex items-center gap-1">
          Less
          {LEVELS.map((l, i) => (
            <span key={i} className={cn("h-[9px] w-[9px] rounded-[2px]", l)} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
