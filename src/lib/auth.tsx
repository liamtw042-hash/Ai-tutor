import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  auth,
  googleProvider,
  firebaseConfigured,
  requireAuth,
} from "@/lib/firebase";
import {
  createProfile,
  fetchProfile,
  saveSubjects as persistSubjects,
  saveDailyGoal as persistDailyGoal,
  saveDisplayName as persistDisplayName,
  saveSubjectLevels as persistSubjectLevels,
  saveYearLevel as persistYearLevel,
  setLeaderboardOptIn as persistLeaderboardOptIn,
  setPremium as persistPremium,
  touchStreak,
} from "@/lib/firestore";
import { friendlyAuthError } from "@/lib/errors";
import type { SubjectId, UserProfile, YearLevel } from "@/types";

/** Fields a student can change from Settings after onboarding. */
export interface ProfileSettingsPatch {
  yearLevel?: YearLevel;
  subjects?: SubjectId[];
  subjectLevels?: Record<SubjectId, YearLevel>;
  dailyGoal?: number;
  displayName?: string;
  leaderboardOptIn?: boolean;
  leaderboardAlias?: string;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  /** Error surfaced from a completed Google *redirect* sign-in (e.g. the domain
   *  isn't authorised). Popup errors are thrown from signInWithGoogle instead. */
  authError: string | null;
  clearAuthError: () => void;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  saveSubjects: (subjects: SubjectId[]) => Promise<void>;
  saveSettings: (patch: ProfileSettingsPatch) => Promise<void>;
  togglePremium: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const loadProfile = useCallback(async (u: User) => {
    let p = await fetchProfile(u.uid);
    if (!p) {
      p = await createProfile(u.uid, u.email ?? "", u.displayName ?? "");
    }
    // roll the study streak forward on each app open
    const streak = await touchStreak(p);
    setProfile({ ...p, streak });
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    // Surface any error from a completed Google *redirect* sign-in. On success
    // onAuthStateChanged handles the user; here we only care about failures
    // (e.g. auth/unauthorized-domain) so they never fail silently.
    getRedirectResult(auth).catch((err) => {
      console.error("Google redirect sign-in failed", err);
      setAuthError(friendlyAuthError(err));
    });
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          await loadProfile(u);
        } catch (err) {
          console.error("Failed to load profile", err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [loadProfile]);

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const cred = await createUserWithEmailAndPassword(
        requireAuth(),
        email,
        password,
      );
      if (name) await updateProfile(cred.user, { displayName: name });
      await createProfile(cred.user.uid, email, name);
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(requireAuth(), email, password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const a = requireAuth();
    setAuthError(null);
    try {
      await signInWithPopup(a, googleProvider);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      // Popups are frequently blocked or unsupported (in-app browsers, strict
      // privacy settings). Fall back to a full-page redirect in those cases so
      // sign-in still completes instead of silently doing nothing.
      if (
        code === "auth/popup-blocked" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/operation-not-supported-in-environment"
      ) {
        await signInWithRedirect(a, googleProvider);
        return; // browser navigates away; result handled on return
      }
      // Anything else (including deliberate popup close) is surfaced to the UI.
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(requireAuth());
  }, []);

  const saveSubjects = useCallback(
    async (subjects: SubjectId[]) => {
      if (!user) return;
      await persistSubjects(user.uid, subjects);
      setProfile((prev) =>
        prev ? { ...prev, subjects, onboarded: true } : prev,
      );
    },
    [user],
  );

  const saveSettings = useCallback(
    async (patch: ProfileSettingsPatch) => {
      if (!user || !profile) return;
      // Persist only the fields that changed, each with the right side effect.
      // Progress, streak, XP and badges are never touched here.
      if (patch.yearLevel !== undefined) {
        await persistYearLevel(user.uid, patch.yearLevel);
      }
      if (patch.subjects !== undefined) {
        await persistSubjects(user.uid, patch.subjects);
      }
      if (patch.subjectLevels !== undefined) {
        await persistSubjectLevels(user.uid, patch.subjectLevels);
      }
      if (patch.dailyGoal !== undefined) {
        await persistDailyGoal(user.uid, patch.dailyGoal);
      }
      if (patch.displayName !== undefined) {
        await persistDisplayName(user.uid, patch.displayName);
      }
      if (
        patch.leaderboardOptIn !== undefined ||
        patch.leaderboardAlias !== undefined
      ) {
        const optIn = patch.leaderboardOptIn ?? profile.leaderboardOptIn;
        const alias = patch.leaderboardAlias ?? profile.leaderboardAlias;
        await persistLeaderboardOptIn(user.uid, optIn, alias);
      }
      // Merge into local state so the whole app re-filters immediately.
      setProfile((prev) =>
        prev ? { ...prev, ...patch, onboarded: true } : prev,
      );
    },
    [user, profile],
  );

  const togglePremium = useCallback(async () => {
    if (!user || !profile) return;
    const next = !profile.premium;
    await persistPremium(user.uid, next);
    setProfile((prev) => (prev ? { ...prev, premium: next } : prev));
  }, [user, profile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.uid);
    if (p) setProfile(p);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        configured: firebaseConfigured,
        authError,
        clearAuthError,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        saveSubjects,
        saveSettings,
        togglePremium,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
