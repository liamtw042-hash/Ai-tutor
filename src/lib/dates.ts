// Day handling anchored to Australia/Sydney so streaks roll over at local
// midnight for NSW students regardless of the device timezone.

export function sydneyDayKey(date: Date = new Date()): string {
  // en-CA gives an ISO-like yyyy-mm-dd string
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Whole-day difference between two yyyy-mm-dd keys (b − a). */
export function dayDiff(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round((db - da) / 86_400_000);
}

/**
 * Given the previous streak and last-active day, compute the new streak for
 * activity happening on `today`.
 * - same day  → unchanged
 * - next day  → +1
 * - otherwise → reset to 1
 */
export function nextStreak(
  prevStreak: number,
  lastActiveDay: string | null,
  today: string = sydneyDayKey(),
): number {
  if (!lastActiveDay) return 1;
  const diff = dayDiff(lastActiveDay, today);
  if (diff <= 0) return prevStreak || 1;
  if (diff === 1) return prevStreak + 1;
  return 1;
}
