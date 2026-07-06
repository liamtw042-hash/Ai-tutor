import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as qLimit,
  where,
  Timestamp,
  increment,
  arrayUnion,
  writeBatch,
  documentId,
} from "firebase/firestore";
import { requireDb } from "@/lib/firebase";
import { addDaysToKey, nextStreak, sydneyDayKey } from "@/lib/dates";
import { INITIAL_SM2, applyGrade } from "@/lib/sm2";
import { XP_REWARDS, levelForXp, type XPEvent } from "@/lib/xp";
import type {
  Attempt,
  ChatMessage,
  DayStat,
  Deck,
  EssayFeedback,
  EssayRecord,
  ExamResult,
  Flashcard,
  LeaderboardEntry,
  Question,
  ReviewGrade,
  SRSItem,
  StudyPlan,
  SubjectId,
  TutorSession,
  UserProfile,
} from "@/types";

// ------------------------------- Users -------------------------------------

/** Fill in fields added since an older profile was created. */
function withProfileDefaults(p: Partial<UserProfile> & { uid: string }): UserProfile {
  return {
    email: "",
    displayName: "Student",
    subjects: [],
    premium: false,
    createdAt: Date.now(),
    streak: 0,
    bestStreak: 0,
    lastActiveDay: null,
    questionsAnswered: 0,
    correctCount: 0,
    onboarded: false,
    xp: 0,
    dailyGoal: 20,
    badges: [],
    leaderboardOptIn: false,
    leaderboardAlias: "",
    ...p,
  };
}

export async function fetchProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(requireDb(), "users", uid));
  if (!snap.exists()) return null;
  return withProfileDefaults(snap.data() as Partial<UserProfile> & { uid: string });
}

export async function createProfile(
  uid: string,
  email: string,
  displayName: string,
): Promise<UserProfile> {
  const profile = withProfileDefaults({
    uid,
    email,
    displayName: displayName || email.split("@")[0],
  });
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

export async function saveDailyGoal(uid: string, dailyGoal: number): Promise<void> {
  await updateDoc(doc(requireDb(), "users", uid), { dailyGoal });
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
    bestStreak: Math.max(profile.bestStreak ?? 0, streak),
  });
  return streak;
}

export async function awardBadges(uid: string, badgeIds: string[]): Promise<void> {
  if (badgeIds.length === 0) return;
  await updateDoc(doc(requireDb(), "users", uid), {
    badges: arrayUnion(...badgeIds),
  });
}

// ---------------------------- XP + daily stats ------------------------------

export type DayStatField = "questions" | "reviews" | "essays" | "tutorMessages";

/**
 * Award XP for an event and roll today's activity counters in one shot.
 * Keeps the profile aggregate and the per-day doc (heatmap / goal ring)
 * consistent without a round trip per counter.
 */
export async function awardXp(
  uid: string,
  event: XPEvent,
  dayField?: DayStatField,
): Promise<number> {
  const db = requireDb();
  const amount = XP_REWARDS[event];
  const today = sydneyDayKey();
  await updateDoc(doc(db, "users", uid), { xp: increment(amount) });
  const dayPatch: Record<string, unknown> = {
    day: today,
    xp: increment(amount),
  };
  if (dayField) dayPatch[dayField] = increment(1);
  await setDoc(doc(db, "users", uid, "days", today), dayPatch, { merge: true });
  return amount;
}

export async function fetchDayStats(uid: string, days = 140): Promise<DayStat[]> {
  const db = requireDb();
  const from = addDaysToKey(sydneyDayKey(), -(days - 1));
  const q = query(
    collection(db, "users", uid, "days"),
    where(documentId(), ">=", from),
    orderBy(documentId(), "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Partial<DayStat>;
    return {
      day: d.id,
      questions: data.questions ?? 0,
      reviews: data.reviews ?? 0,
      essays: data.essays ?? 0,
      tutorMessages: data.tutorMessages ?? 0,
      xp: data.xp ?? 0,
    };
  });
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
  max = 400,
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

// --------------------------- Spaced repetition ------------------------------

function srsCol(uid: string) {
  return collection(requireDb(), "users", uid, "srs");
}

/**
 * Add (or refresh) an item in the review system. Question attempts and studied
 * flashcards both funnel through here; content is snapshotted onto the doc.
 */
export async function upsertSRSItem(
  uid: string,
  input: {
    kind: "question" | "flashcard";
    refId: string;
    subjectId: SubjectId;
    topic: string;
    front: string;
    back: string;
    options?: string[];
    correctIndex?: number;
  },
): Promise<void> {
  const db = requireDb();
  // Deterministic doc id so re-answering the same question doesn't duplicate.
  const id = `${input.kind}-${input.refId}`.replace(/[^\w:-]/g, "_").slice(0, 400);
  const ref = doc(db, "users", uid, "srs", id);
  const existing = await getDoc(ref);
  if (existing.exists()) return; // scheduling state is owned by reviews
  const item: Omit<SRSItem, "id"> = {
    kind: input.kind,
    refId: input.refId,
    subjectId: input.subjectId,
    topic: input.topic,
    front: input.front,
    back: input.back,
    ...(input.options ? { options: input.options } : {}),
    ...(input.correctIndex !== undefined ? { correctIndex: input.correctIndex } : {}),
    ...INITIAL_SM2,
    due: sydneyDayKey(), // first review available immediately
    lastReviewed: null,
    createdAt: Date.now(),
  };
  await setDoc(ref, item);
}

/** Items due today or earlier — the daily review queue. */
export async function fetchDueSRSItems(uid: string, max = 60): Promise<SRSItem[]> {
  const today = sydneyDayKey();
  const q = query(srsCol(uid), where("due", "<=", today), orderBy("due", "asc"), qLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Omit<SRSItem, "id">), id: d.id }));
}

export interface SRSSummary {
  dueToday: number;
  total: number;
  learned: number; // interval >= 21 days
}

export async function fetchSRSSummary(uid: string): Promise<SRSSummary> {
  const snap = await getDocs(query(srsCol(uid), qLimit(1000)));
  const today = sydneyDayKey();
  let dueToday = 0;
  let learned = 0;
  snap.docs.forEach((d) => {
    const item = d.data() as SRSItem;
    if (item.due <= today) dueToday += 1;
    if (item.interval >= 21) learned += 1;
  });
  return { dueToday, total: snap.size, learned };
}

/** Grade a review and persist the new SM-2 schedule. Returns the new interval. */
export async function reviewSRSItem(
  uid: string,
  item: SRSItem,
  grade: ReviewGrade,
): Promise<number> {
  const next = applyGrade(item, grade);
  await updateDoc(doc(requireDb(), "users", uid, "srs", item.id), { ...next });
  return next.interval;
}

/** Called from practice: schedule the question and, if it exists, reschedule by outcome. */
export async function scheduleQuestionReview(
  uid: string,
  question: Question,
  correct: boolean,
): Promise<void> {
  const db = requireDb();
  const id = `question-${question.id}`.replace(/[^\w:-]/g, "_").slice(0, 400);
  const ref = doc(db, "users", uid, "srs", id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const item = { ...(existing.data() as Omit<SRSItem, "id">), id };
    const grade: ReviewGrade = correct ? "good" : "again";
    await updateDoc(ref, { ...applyGrade(item, grade) });
    return;
  }
  const base: Omit<SRSItem, "id"> = {
    kind: "question",
    refId: question.id,
    subjectId: question.subjectId,
    topic: question.topic,
    front: question.prompt,
    back: question.solution,
    ...(question.options ? { options: question.options } : {}),
    ...(question.correctIndex !== undefined
      ? { correctIndex: question.correctIndex }
      : {}),
    ...INITIAL_SM2,
    due: sydneyDayKey(),
    lastReviewed: null,
    createdAt: Date.now(),
  };
  // A wrong answer comes back tomorrow; a right one starts on the SM-2 track.
  const scheduled = applyGrade(base, correct ? "good" : "again");
  await setDoc(ref, { ...base, ...scheduled });
}

/**
 * Grade one flashcard study (flip/write modes). Creates the SRS item on first
 * study, then applies the SM-2 grade — so deck study and the review queue
 * share a single schedule per card.
 */
export async function studyFlashcard(
  uid: string,
  deckId: string,
  card: Flashcard,
  subjectId: SubjectId,
  topic: string,
  grade: ReviewGrade,
): Promise<void> {
  const db = requireDb();
  const refId = `${deckId}:${card.id}`;
  const id = `flashcard-${refId}`.replace(/[^\w:-]/g, "_").slice(0, 400);
  const ref = doc(db, "users", uid, "srs", id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const item = { ...(existing.data() as Omit<SRSItem, "id">), id };
    await updateDoc(ref, { ...applyGrade(item, grade) });
    return;
  }
  const base: Omit<SRSItem, "id"> = {
    kind: "flashcard",
    refId,
    subjectId,
    topic,
    front: card.front,
    back: card.back,
    ...INITIAL_SM2,
    due: sydneyDayKey(),
    lastReviewed: null,
    createdAt: Date.now(),
  };
  await setDoc(ref, { ...base, ...applyGrade(base, grade) });
}

// ------------------------------ Flashcards ----------------------------------

export async function createDeck(
  uid: string,
  deck: { name: string; subjectId: SubjectId; topic: string; aiGenerated: boolean },
  cards: { front: string; back: string }[],
): Promise<string> {
  const db = requireDb();
  const ref = await addDoc(collection(db, "users", uid, "decks"), {
    ...deck,
    cardCount: cards.length,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  const batch = writeBatch(db);
  for (const card of cards) {
    batch.set(doc(collection(db, "users", uid, "decks", ref.id, "cards")), {
      front: card.front,
      back: card.back,
      createdAt: Timestamp.now(),
    });
  }
  await batch.commit();
  return ref.id;
}

export async function addCard(
  uid: string,
  deckId: string,
  card: { front: string; back: string },
): Promise<void> {
  const db = requireDb();
  await addDoc(collection(db, "users", uid, "decks", deckId, "cards"), {
    ...card,
    createdAt: Timestamp.now(),
  });
  await updateDoc(doc(db, "users", uid, "decks", deckId), {
    cardCount: increment(1),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteCard(
  uid: string,
  deckId: string,
  cardId: string,
): Promise<void> {
  const db = requireDb();
  await deleteDoc(doc(db, "users", uid, "decks", deckId, "cards", cardId));
  await updateDoc(doc(db, "users", uid, "decks", deckId), {
    cardCount: increment(-1),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteDeck(uid: string, deckId: string): Promise<void> {
  const db = requireDb();
  const cards = await getDocs(collection(db, "users", uid, "decks", deckId, "cards"));
  const batch = writeBatch(db);
  cards.docs.forEach((c) => batch.delete(c.ref));
  batch.delete(doc(db, "users", uid, "decks", deckId));
  await batch.commit();
}

export async function fetchDecks(uid: string): Promise<Deck[]> {
  const db = requireDb();
  const snap = await getDocs(
    query(collection(db, "users", uid, "decks"), orderBy("updatedAt", "desc")),
  );
  return snap.docs.map((d) => {
    const data = d.data() as Omit<Deck, "id" | "createdAt" | "updatedAt"> & {
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

export async function fetchCards(uid: string, deckId: string): Promise<Flashcard[]> {
  const db = requireDb();
  const snap = await getDocs(
    query(
      collection(db, "users", uid, "decks", deckId, "cards"),
      orderBy("createdAt", "asc"),
    ),
  );
  return snap.docs.map((d) => {
    const data = d.data() as Omit<Flashcard, "id" | "createdAt"> & {
      createdAt: Timestamp;
    };
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
    };
  });
}

// -------------------------------- Exams ------------------------------------

export async function saveExamResult(
  uid: string,
  result: Omit<ExamResult, "id" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(collection(requireDb(), "users", uid, "exams"), {
    ...result,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function fetchExamResults(uid: string, max = 20): Promise<ExamResult[]> {
  const snap = await getDocs(
    query(
      collection(requireDb(), "users", uid, "exams"),
      orderBy("createdAt", "desc"),
      qLimit(max),
    ),
  );
  return snap.docs.map((d) => {
    const data = d.data() as Omit<ExamResult, "id" | "createdAt"> & {
      createdAt: Timestamp;
    };
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
    };
  });
}

// ---------------------------- Essay history --------------------------------

export async function saveEssayRecord(
  uid: string,
  subjectId: SubjectId,
  questionType: string,
  wordCount: number,
  feedback: EssayFeedback,
): Promise<void> {
  await addDoc(collection(requireDb(), "users", uid, "essays"), {
    subjectId,
    questionType,
    band: feedback.band,
    maxBand: feedback.maxBand,
    overall: feedback.overall,
    criteria: feedback.criteria,
    wordCount,
    createdAt: Timestamp.now(),
  });
}

export async function fetchEssayRecords(uid: string, max = 30): Promise<EssayRecord[]> {
  const snap = await getDocs(
    query(
      collection(requireDb(), "users", uid, "essays"),
      orderBy("createdAt", "desc"),
      qLimit(max),
    ),
  );
  return snap.docs.map((d) => {
    const data = d.data() as Omit<EssayRecord, "id" | "createdAt"> & {
      createdAt: Timestamp;
    };
    return {
      ...data,
      id: d.id,
      createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
    };
  });
}

// ------------------------------ Study plan ----------------------------------

export async function saveStudyPlan(uid: string, plan: StudyPlan): Promise<void> {
  await setDoc(doc(requireDb(), "users", uid, "plans", "current"), plan);
}

export async function fetchStudyPlan(uid: string): Promise<StudyPlan | null> {
  const snap = await getDoc(doc(requireDb(), "users", uid, "plans", "current"));
  return snap.exists() ? (snap.data() as StudyPlan) : null;
}

// ------------------------------ Leaderboard ---------------------------------

export async function setLeaderboardOptIn(
  uid: string,
  optIn: boolean,
  alias: string,
): Promise<void> {
  const db = requireDb();
  await updateDoc(doc(db, "users", uid), {
    leaderboardOptIn: optIn,
    leaderboardAlias: alias,
  });
  if (!optIn) {
    await deleteDoc(doc(db, "leaderboard", uid)).catch(() => undefined);
  }
}

/** Push the user's public entry. Call after XP-earning sessions if opted in. */
export async function syncLeaderboard(profile: UserProfile): Promise<void> {
  if (!profile.leaderboardOptIn || !profile.leaderboardAlias) return;
  const entry: LeaderboardEntry = {
    uid: profile.uid,
    alias: profile.leaderboardAlias,
    xp: profile.xp,
    level: levelForXp(profile.xp),
    streak: profile.streak,
    updatedAt: Date.now(),
  };
  await setDoc(doc(requireDb(), "leaderboard", profile.uid), entry);
}

export async function fetchLeaderboard(max = 50): Promise<LeaderboardEntry[]> {
  const snap = await getDocs(
    query(collection(requireDb(), "leaderboard"), orderBy("xp", "desc"), qLimit(max)),
  );
  return snap.docs.map((d) => d.data() as LeaderboardEntry);
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
