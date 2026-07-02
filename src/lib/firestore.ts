import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as qLimit,
  where,
  Timestamp,
  increment,
} from "firebase/firestore";
import { requireDb } from "@/lib/firebase";
import { nextStreak, sydneyDayKey } from "@/lib/dates";
import type {
  Attempt,
  SubjectId,
  TutorSession,
  UserProfile,
  ChatMessage,
} from "@/types";

// ------------------------------- Users -------------------------------------

export async function fetchProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(requireDb(), "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function createProfile(
  uid: string,
  email: string,
  displayName: string,
): Promise<UserProfile> {
  const profile: UserProfile = {
    uid,
    email,
    displayName: displayName || email.split("@")[0],
    subjects: [],
    premium: false,
    createdAt: Date.now(),
    streak: 0,
    lastActiveDay: null,
    questionsAnswered: 0,
    correctCount: 0,
    onboarded: false,
  };
  await setDoc(doc(requireDb(), "users", uid), profile);
  return profile;
}

export async function saveSubjects(
  uid: string,
  subjects: SubjectId[],
): Promise<void> {
  await updateDoc(doc(requireDb(), "users", uid), {
    subjects,
    onboarded: true,
  });
}

export async function setPremium(uid: string, premium: boolean): Promise<void> {
  await updateDoc(doc(requireDb(), "users", uid), { premium });
}

/** Update the streak based on activity today. Returns the new streak. */
export async function touchStreak(profile: UserProfile): Promise<number> {
  const today = sydneyDayKey();
  if (profile.lastActiveDay === today) return profile.streak;
  const streak = nextStreak(profile.streak, profile.lastActiveDay, today);
  await updateDoc(doc(requireDb(), "users", profile.uid), {
    streak,
    lastActiveDay: today,
  });
  return streak;
}

// ------------------------------ Attempts -----------------------------------

export async function recordAttempt(
  uid: string,
  attempt: Omit<Attempt, "id" | "createdAt">,
): Promise<void> {
  const db = requireDb();
  await addDoc(collection(db, "users", uid, "attempts"), {
    ...attempt,
    createdAt: Timestamp.now(),
  });
  await updateDoc(doc(db, "users", uid), {
    questionsAnswered: increment(1),
    correctCount: increment(attempt.correct ? 1 : 0),
  });
}

export interface AttemptRow extends Attempt {
  createdAtMs: number;
}

export async function fetchRecentAttempts(
  uid: string,
  max = 100,
): Promise<AttemptRow[]> {
  const db = requireDb();
  const q = query(
    collection(db, "users", uid, "attempts"),
    orderBy("createdAt", "desc"),
    qLimit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Attempt & { createdAt: Timestamp };
    return {
      ...data,
      id: d.id,
      createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
    };
  });
}

/** Aggregate weak topics: topics with the lowest accuracy (min 2 attempts). */
export interface TopicStat {
  subjectId: SubjectId;
  topic: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

export function computeTopicStats(attempts: AttemptRow[]): TopicStat[] {
  const map = new Map<string, TopicStat>();
  for (const a of attempts) {
    const key = `${a.subjectId}::${a.topic}`;
    const s =
      map.get(key) ??
      ({
        subjectId: a.subjectId,
        topic: a.topic,
        attempts: 0,
        correct: 0,
        accuracy: 0,
      } as TopicStat);
    s.attempts += 1;
    // treat AI-marked written responses (correct === null) as correct when
    // they scored >= 50% of available marks
    const gotIt =
      a.correct === null ? a.awardedMarks / Math.max(a.totalMarks, 1) >= 0.5 : a.correct;
    if (gotIt) s.correct += 1;
    s.accuracy = s.correct / s.attempts;
    map.set(key, s);
  }
  return Array.from(map.values());
}

// ------------------------------ Sessions -----------------------------------

export async function createSession(
  uid: string,
  subjectId: SubjectId,
  title: string,
): Promise<string> {
  const db = requireDb();
  const ref = await addDoc(collection(db, "users", uid, "sessions"), {
    subjectId,
    title,
    messages: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function saveSessionMessages(
  uid: string,
  sessionId: string,
  messages: ChatMessage[],
): Promise<void> {
  await updateDoc(doc(requireDb(), "users", uid, "sessions", sessionId), {
    messages,
    updatedAt: Timestamp.now(),
  });
}

export async function fetchSessions(
  uid: string,
  subjectId?: SubjectId,
): Promise<TutorSession[]> {
  const db = requireDb();
  const base = collection(db, "users", uid, "sessions");
  const q = subjectId
    ? query(base, where("subjectId", "==", subjectId), orderBy("updatedAt", "desc"))
    : query(base, orderBy("updatedAt", "desc"), qLimit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as TutorSession & {
      createdAt: Timestamp;
      updatedAt: Timestamp;
    };
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
      updatedAt: data.updatedAt?.toMillis?.() ?? Date.now(),
    };
  });
}
