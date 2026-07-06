import type { ReviewGrade, SRSItem } from "@/types";
import { addDaysToKey, sydneyDayKey } from "@/lib/dates";

// ---------------------------------------------------------------------------
// SM-2 spaced repetition (the algorithm behind Anki's scheduling core).
//
// Each review is graded 0–5. Below 3 is a lapse: repetitions reset and the
// item comes back tomorrow. At 3+ the interval grows — 1 day, then 6 days,
// then interval × ease — and the easiness factor drifts up or down with the
// quality of the recall. The result: material you struggle with comes back
// quickly, material you know keeps moving further out. This is the schedule
// that produces the ~89% retention the SR literature reports.
// ---------------------------------------------------------------------------

export const GRADE_QUALITY: Record<ReviewGrade, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export interface SM2State {
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
}

export const INITIAL_SM2: SM2State = {
  ease: 2.5,
  interval: 0,
  reps: 0,
  lapses: 0,
};

/** Apply one review of quality q (0–5) to the SM-2 state. */
export function sm2Review(state: SM2State, quality: number): SM2State {
  const q = Math.max(0, Math.min(5, quality));
  // Easiness factor always updates, floored at 1.3 (per SM-2 spec).
  const ease = Math.max(
    1.3,
    state.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  if (q < 3) {
    return { ease, interval: 1, reps: 0, lapses: state.lapses + 1 };
  }

  const reps = state.reps + 1;
  const interval =
    reps === 1 ? 1 : reps === 2 ? 6 : Math.round(state.interval * ease);
  return { ease, interval: Math.max(1, interval), reps, lapses: state.lapses };
}

/** Review an SRS item with a self-grade and return its updated scheduling fields. */
export function applyGrade(
  item: Pick<SRSItem, "ease" | "interval" | "reps" | "lapses">,
  grade: ReviewGrade,
  today: string = sydneyDayKey(),
): Pick<SRSItem, "ease" | "interval" | "reps" | "lapses" | "due" | "lastReviewed"> {
  const next = sm2Review(item, GRADE_QUALITY[grade]);
  return {
    ...next,
    due: addDaysToKey(today, next.interval),
    lastReviewed: Date.now(),
  };
}

/**
 * Map an objective practice outcome onto an SM-2 quality grade.
 * Correct first try → good; correct → hard-ish credit; wrong → again.
 */
export function gradeFromOutcome(correct: boolean, confident: boolean): ReviewGrade {
  if (!correct) return "again";
  return confident ? "good" : "hard";
}

/** Human label for when an item next appears, e.g. "3d" or "today". */
export function intervalLabel(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  return months === 1 ? "1 month" : `${months} months`;
}
