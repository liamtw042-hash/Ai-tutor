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
  setPremium as persistPremium,
  touchStreak,
} from "@/lib/firestore";
import type { SubjectId, UserProfile } from "@/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  saveSubjects: (subjects: SubjectId[]) => Promise<void>;
  togglePremium: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
    await signInWithPopup(requireAuth(), googleProvider);
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
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        saveSubjects,
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
