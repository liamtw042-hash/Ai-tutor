import { sydneyDayKey } from "@/lib/dates";

// ---------------------------------------------------------------------------
// Freemium daily usage limits.
//
// For a starter app these counters live in localStorage keyed per user + day.
// In production you would enforce these server-side (e.g. a Firestore
// `usage/{uid}/{day}` doc updated in the same transaction as the AI call) so
// they cannot be reset by clearing browser storage.
// ---------------------------------------------------------------------------

export const FREE_LIMITS = {
  practice: 10, // practice questions per day
  tutor: 5, // AI tutor messages per day
  essay: 2, // essay feedback submissions per day
} as const;

export type UsageKind = keyof typeof FREE_LIMITS;

function storageKey(uid: string, kind: UsageKind): string {
  return `sm:usage:${uid}:${kind}:${sydneyDayKey()}`;
}

export function getUsage(uid: string, kind: UsageKind): number {
  if (typeof localStorage === "undefined") return 0;
  return Number(localStorage.getItem(storageKey(uid, kind)) ?? "0");
}

export function incrementUsage(uid: string, kind: UsageKind): number {
  const next = getUsage(uid, kind) + 1;
  localStorage.setItem(storageKey(uid, kind), String(next));
  return next;
}

export function remaining(
  uid: string,
  kind: UsageKind,
  premium: boolean,
): number {
  if (premium) return Infinity;
  return Math.max(0, FREE_LIMITS[kind] - getUsage(uid, kind));
}

export function canUse(uid: string, kind: UsageKind, premium: boolean): boolean {
  return premium || remaining(uid, kind, premium) > 0;
}
