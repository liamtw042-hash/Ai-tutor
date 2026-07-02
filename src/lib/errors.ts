// Map Firebase auth error codes to friendly, student-facing messages.
const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account found with that email.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/email-already-in-use": "An account with that email already exists.",
  "auth/weak-password": "Please choose a password with at least 6 characters.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/too-many-requests": "Too many attempts. Please try again shortly.",
  "auth/network-request-failed": "Network error. Check your connection.",
};

export function friendlyAuthError(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    if (MESSAGES[code]) return MESSAGES[code];
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}
