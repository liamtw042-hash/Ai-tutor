// ---------------------------------------------------------------------------
// XP + levels. XP only ever goes up; level is derived from total XP with a
// gently super-linear curve so early levels come fast (hook) and later levels
// signal real work.
// ---------------------------------------------------------------------------

export const XP_REWARDS = {
  questionCorrect: 10,
  questionAttempted: 4,
  reviewDone: 5,
  flashcardStudied: 2,
  essaySubmitted: 25,
  tutorMessage: 2,
  examCompleted: 60,
  deckCreated: 10,
} as const;

export type XPEvent = keyof typeof XP_REWARDS;

/** Total XP required to *reach* level n (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  // 100, 280, 540, 880, 1300 ... (≈90·n² − 170·n + 80 shape, tuned by hand)
  return Math.round(50 * (level - 1) * (level + 0.6));
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export interface LevelProgress {
  level: number;
  /** xp gained inside the current level */
  into: number;
  /** xp needed to go from this level to the next */
  span: number;
  /** 0..1 progress to next level */
  pct: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const span = ceil - floor;
  const into = xp - floor;
  return { level, into, span, pct: span > 0 ? into / span : 0 };
}

/** Level titles — a little Duolingo-style flavour without being childish. */
export function levelTitle(level: number): string {
  if (level >= 25) return "HSC Legend";
  if (level >= 20) return "Band 6 Bound";
  if (level >= 15) return "Exam Machine";
  if (level >= 10) return "Momentum";
  if (level >= 6) return "Consistent";
  if (level >= 3) return "Warming Up";
  return "Getting Started";
}
