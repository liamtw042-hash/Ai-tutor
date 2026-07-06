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

/** Add n days to a yyyy-mm-dd key. */
export function addDaysToKey(key: string, n: number): string {
  const d = new Date(key + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The last n day keys ending today (inclusive), oldest first. */
export function lastNDayKeys(n: number, today: string = sydneyDayKey()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDaysToKey(today, -i));
  return out;
}

/** Short human label for a day key, e.g. "12 Mar". */
export function dayLabel(key: string): string {
  const d = new Date(key + "T00:00:00Z");
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

/** Weekday label for a day key, e.g. "Mon". */
export function weekdayLabel(key: string): string {
  const d = new Date(key + "T00:00:00Z");
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    timeZone: "UTC",
  }).format(d);
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
