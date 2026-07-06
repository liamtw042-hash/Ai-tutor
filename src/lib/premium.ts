import type { UserProfile } from "@/types";

// ---------------------------------------------------------------------------
// Premium access — the single source of truth for the whole app.
//
// A user is premium if they have a real active subscription (`profile.premium`)
// OR their email is on the owner/comp list. Owner emails are configurable via
// the VITE_OWNER_EMAILS env var (comma-separated), defaulting to the owner's
// address. The serverless API mirrors this logic in api/_lib.ts so premium is
// also enforced server-side, not just hidden in the UI.
// ---------------------------------------------------------------------------

const DEFAULT_OWNER_EMAILS = "liamtw042@gmail.com";

function parseEmails(raw: string | undefined): string[] {
  return (raw && raw.trim() ? raw : DEFAULT_OWNER_EMAILS)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Owner/comp emails that always receive premium, regardless of subscription. */
export const OWNER_EMAILS = parseEmails(
  import.meta.env.VITE_OWNER_EMAILS as string | undefined,
);

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * True when the user should have full premium access: a real active
 * subscription OR an owner/comp email. This is the only check the app should
 * use to gate premium features.
 */
export function isPremium(
  profile: Pick<UserProfile, "premium" | "email"> | null | undefined,
): boolean {
  if (!profile) return false;
  return Boolean(profile.premium) || isOwnerEmail(profile.email);
}
