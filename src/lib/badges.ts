import type { UserProfile } from "@/types";

// ---------------------------------------------------------------------------
// Achievement badges. Pure definitions + an evaluator that returns any newly
// earned badge ids given the user's current stats. Persisting is the caller's
// job (arrayUnion on the profile).
// ---------------------------------------------------------------------------

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
}

export interface BadgeStats {
  questionsAnswered: number;
  correctCount: number;
  streak: number;
  bestStreak: number;
  xpLevel: number;
  essaysSubmitted: number;
  decksCreated: number;
  reviewsDone: number;
  examsCompleted: number;
  topicsMastered: number;
}

export const BADGES: BadgeDef[] = [
  { id: "first-question", name: "First Steps", description: "Answer your first practice question", icon: "🎯" },
  { id: "first-essay", name: "Wordsmith", description: "Submit your first essay for feedback", icon: "✍️" },
  { id: "first-deck", name: "Deck Builder", description: "Create your first flashcard deck", icon: "🃏" },
  { id: "first-review", name: "Memory Lane", description: "Complete your first spaced-repetition review", icon: "🧠" },
  { id: "first-exam", name: "Exam Conditions", description: "Finish a timed past-paper session", icon: "⏱️" },
  { id: "streak-3", name: "Warming Up", description: "Study 3 days in a row", icon: "🔥" },
  { id: "streak-7", name: "One Full Week", description: "Study 7 days in a row", icon: "🔥" },
  { id: "streak-30", name: "Unstoppable", description: "Study 30 days in a row", icon: "🌋" },
  { id: "questions-50", name: "Half Century", description: "Answer 50 practice questions", icon: "🏏" },
  { id: "questions-250", name: "Question Machine", description: "Answer 250 practice questions", icon: "⚙️" },
  { id: "reviews-100", name: "Steel Trap", description: "Complete 100 spaced-repetition reviews", icon: "🗝️" },
  { id: "level-5", name: "Levelling Up", description: "Reach level 5", icon: "⭐" },
  { id: "level-10", name: "Double Digits", description: "Reach level 10", icon: "🌟" },
  { id: "topic-mastered", name: "Topic Tamer", description: "Master a topic (80%+ over 10+ questions)", icon: "👑" },
];

export const BADGES_BY_ID: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.id, b]),
);

const RULES: Record<string, (s: BadgeStats) => boolean> = {
  "first-question": (s) => s.questionsAnswered >= 1,
  "first-essay": (s) => s.essaysSubmitted >= 1,
  "first-deck": (s) => s.decksCreated >= 1,
  "first-review": (s) => s.reviewsDone >= 1,
  "first-exam": (s) => s.examsCompleted >= 1,
  "streak-3": (s) => s.bestStreak >= 3 || s.streak >= 3,
  "streak-7": (s) => s.bestStreak >= 7 || s.streak >= 7,
  "streak-30": (s) => s.bestStreak >= 30 || s.streak >= 30,
  "questions-50": (s) => s.questionsAnswered >= 50,
  "questions-250": (s) => s.questionsAnswered >= 250,
  "reviews-100": (s) => s.reviewsDone >= 100,
  "level-5": (s) => s.xpLevel >= 5,
  "level-10": (s) => s.xpLevel >= 10,
  "topic-mastered": (s) => s.topicsMastered >= 1,
};

/** Return badge ids newly earned (present in stats, absent from profile). */
export function newlyEarnedBadges(
  profile: Pick<UserProfile, "badges">,
  stats: BadgeStats,
): string[] {
  const have = new Set(profile.badges ?? []);
  return BADGES.filter((b) => !have.has(b.id) && RULES[b.id]?.(stats)).map(
    (b) => b.id,
  );
}
