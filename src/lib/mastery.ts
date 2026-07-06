import type { SubjectId } from "@/types";
import type { AttemptRow } from "@/lib/firestore";
import { getSubject } from "@/data/subjects";

// ---------------------------------------------------------------------------
// Concept-level mastery. Mastery is accuracy discounted by coverage: you can't
// be "90% mastered" off two lucky questions. Full confidence needs ~10
// attempts on the topic; recent attempts count more than old ones.
// ---------------------------------------------------------------------------

export interface TopicMastery {
  subjectId: SubjectId;
  topic: string;
  attempts: number;
  correct: number;
  /** raw accuracy 0..1 */
  accuracy: number;
  /** coverage-discounted mastery 0..1 */
  mastery: number;
}

export interface SubjectMastery {
  subjectId: SubjectId;
  attempts: number;
  /** mean topic mastery across topics *attempted*, weighted by attempts */
  mastery: number;
  /** fraction of the subject's syllabus topics with at least one attempt */
  coverage: number;
  topics: TopicMastery[];
}

const FULL_CONFIDENCE_ATTEMPTS = 10;
/** Recency half-life in days — an attempt 21 days ago carries half weight. */
const HALF_LIFE_DAYS = 21;

function wasCorrect(a: AttemptRow): boolean {
  return a.correct === null
    ? a.awardedMarks / Math.max(a.totalMarks, 1) >= 0.5
    : a.correct;
}

export function computeTopicMastery(attempts: AttemptRow[]): TopicMastery[] {
  const now = Date.now();
  const map = new Map<
    string,
    { subjectId: SubjectId; topic: string; n: number; c: number; w: number; wc: number }
  >();
  for (const a of attempts) {
    const key = `${a.subjectId}::${a.topic}`;
    const e =
      map.get(key) ??
      { subjectId: a.subjectId, topic: a.topic, n: 0, c: 0, w: 0, wc: 0 };
    const ageDays = Math.max(0, (now - a.createdAtMs) / 86_400_000);
    const weight = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    e.n += 1;
    e.w += weight;
    if (wasCorrect(a)) {
      e.c += 1;
      e.wc += weight;
    }
    map.set(key, e);
  }
  return Array.from(map.values()).map((e) => {
    const accuracy = e.n > 0 ? e.c / e.n : 0;
    const weightedAccuracy = e.w > 0 ? e.wc / e.w : 0;
    const confidence = Math.min(1, e.n / FULL_CONFIDENCE_ATTEMPTS);
    return {
      subjectId: e.subjectId,
      topic: e.topic,
      attempts: e.n,
      correct: e.c,
      accuracy,
      mastery: weightedAccuracy * confidence,
    };
  });
}

export function computeSubjectMastery(
  attempts: AttemptRow[],
  subjects: SubjectId[],
): SubjectMastery[] {
  const topicStats = computeTopicMastery(attempts);
  return subjects.map((subjectId) => {
    const topics = topicStats.filter((t) => t.subjectId === subjectId);
    const totalAttempts = topics.reduce((s, t) => s + t.attempts, 0);
    const mastery =
      totalAttempts > 0
        ? topics.reduce((s, t) => s + t.mastery * t.attempts, 0) / totalAttempts
        : 0;
    const syllabusTopics = getSubject(subjectId).topics.length;
    return {
      subjectId,
      attempts: totalAttempts,
      mastery,
      coverage: syllabusTopics > 0 ? Math.min(1, topics.length / syllabusTopics) : 0,
      topics: topics.sort((a, b) => a.mastery - b.mastery),
    };
  });
}

/** Topics the student should focus on: attempted, low mastery, weakest first. */
export function weakestTopics(
  attempts: AttemptRow[],
  max = 4,
  minAttempts = 2,
): TopicMastery[] {
  return computeTopicMastery(attempts)
    .filter((t) => t.attempts >= minAttempts && t.mastery < 0.7)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, max);
}

/** A topic counts as mastered at 80%+ mastery over 10+ attempts. */
export function masteredTopics(attempts: AttemptRow[]): TopicMastery[] {
  return computeTopicMastery(attempts).filter(
    (t) => t.attempts >= 10 && t.mastery >= 0.8,
  );
}
