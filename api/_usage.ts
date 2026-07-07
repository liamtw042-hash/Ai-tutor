import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { isOwnerEmail } from "./_lib.js";

// ---------------------------------------------------------------------------
// Server-side free-tier enforcement.
//
// The client also keeps localStorage counters for instant UX, but those are
// trivially reset by clearing browser storage. This module is the real gate:
// it verifies the caller's Firebase ID token, reads their premium status from
// Firestore (never trusting a client-sent flag), and atomically counts daily
// usage per feature in `users/{uid}/usage/{yyyy-mm-dd}`.
//
// Requires a Firebase Admin credential. Provide EITHER:
//   - FIREBASE_SERVICE_ACCOUNT  = the full service-account JSON (as a string)
//   - or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
// When no credential is configured, enforcement fails OPEN (requests are
// allowed) so the app keeps working — but a warning is logged and the limits
// are effectively client-only until the owner sets the credential.
// ---------------------------------------------------------------------------

export const FREE_LIMITS = {
  practice: 15,
  tutor: 10,
  essay: 1,
  generate: 1,
  aiDeck: 1,
} as const;

export type UsageKind = keyof typeof FREE_LIMITS;

let cachedApp: App | null = null;
let initAttempted = false;

function adminApp(): App | null {
  if (cachedApp) return cachedApp;
  if (initAttempted) return cachedApp;
  initAttempted = true;
  try {
    if (getApps().length) {
      cachedApp = getApps()[0]!;
      return cachedApp;
    }
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (raw && raw.trim()) {
      const svc = JSON.parse(raw) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      cachedApp = initializeApp({
        credential: cert({
          projectId: svc.project_id,
          clientEmail: svc.client_email,
          privateKey: svc.private_key,
        }),
        projectId: svc.project_id,
      });
      return cachedApp;
    }
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Vercel stores newlines as literal "\n" — restore them.
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (projectId && clientEmail && privateKey) {
      cachedApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
      return cachedApp;
    }
  } catch (err) {
    console.error("[usage] Firebase Admin init failed:", err);
  }
  return cachedApp; // null → not configured
}

/** yyyy-mm-dd anchored to Australia/Sydney, matching the client's day key. */
function sydneyDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function bearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match ? match[1] : null;
}

/**
 * Enforce a per-user daily free-tier limit for `kind`.
 * Returns true if the request may proceed. Returns false only after it has
 * already sent a 401/429 JSON response, so callers should `return` immediately.
 */
export async function enforceUsage(
  req: VercelRequest,
  res: VercelResponse,
  kind: UsageKind,
): Promise<boolean> {
  const app = adminApp();

  // No admin credential on this deployment → cannot enforce; allow but warn.
  if (!app) {
    console.warn(
      "[usage] Server-side limits disabled (no FIREBASE_SERVICE_ACCOUNT). " +
        "Set it in the environment to enforce free-tier limits.",
    );
    return true;
  }

  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Please sign in to use this feature." });
    return false;
  }

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? undefined;
  } catch {
    res
      .status(401)
      .json({ error: "Your session has expired — please sign in again." });
    return false;
  }

  // Premium bypass, derived server-side (owner email or real subscription).
  if (isOwnerEmail(email)) return true;

  const db = getFirestore(app);
  try {
    const profile = await db.doc(`users/${uid}`).get();
    if (profile.exists && profile.get("premium") === true) return true;
  } catch {
    // If the profile read fails, fall through to the limit check rather than
    // wrongly granting unlimited access.
  }

  const limit = FREE_LIMITS[kind];
  const ref = db.doc(`users/${uid}/usage/${sydneyDayKey()}`);
  try {
    const allowed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = (snap.exists ? (snap.get(kind) as number) : 0) || 0;
      if (current >= limit) return false;
      tx.set(
        ref,
        { [kind]: current + 1, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      return true;
    });
    if (!allowed) {
      res.status(429).json({
        error: `You've reached today's free limit for this feature (${limit}/day). Upgrade to Premium for unlimited.`,
      });
      return false;
    }
    return true;
  } catch (err) {
    // A bookkeeping failure must never block a legitimate request.
    console.error("[usage] counter transaction failed:", err);
    return true;
  }
}
