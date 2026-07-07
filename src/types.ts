// ---------------------------------------------------------------------------
// Shared domain types for StudyMate (NSW Years 10–12)
// ---------------------------------------------------------------------------

/**
 * NSW stage/year the student is working at.
 * - year10 → Stage 5 (RoSA)
 * - year11 → Stage 6, Preliminary
 * - year12 → Stage 6, HSC
 */
export type YearLevel = "year10" | "year11" | "year12";

export const YEAR_LEVELS: {
  id: YearLevel;
  label: string;
  short: string;
  stage: string;
  blurb: string;
}[] = [
  {
    id: "year10",
    label: "Year 10",
    short: "Yr 10",
    stage: "Stage 5",
    blurb: "Stage 5 — building toward your Record of School Achievement (RoSA).",
  },
  {
    id: "year11",
    label: "Year 11",
    short: "Yr 11",
    stage: "Stage 6 Preliminary",
    blurb: "Preliminary (Stage 6) — the foundation for your HSC courses.",
  },
  {
    id: "year12",
    label: "Year 12",
    short: "Yr 12",
    stage: "Stage 6 HSC",
    blurb: "HSC year (Stage 6) — the exams that count.",
  },
];

export function yearLevelMeta(id: YearLevel) {
  return YEAR_LEVELS.find((y) => y.id === id) ?? YEAR_LEVELS[2];
}

/** Human stage string passed to the AI, e.g. "Year 11 (Stage 6 Preliminary)". */
export function stageLabel(id: YearLevel | undefined | null): string {
  const m = yearLevelMeta(id ?? "year12");
  return `${m.label} (${m.stage})`;
}

/** The year level one stage above the given one (Year 12 has none). */
export function nextYearLevel(id: YearLevel): YearLevel | null {
  if (id === "year10") return "year11";
  if (id === "year11") return "year12";
  return null;
}

/**
 * A subject/course id. Now a free string rather than a fixed union so the app
 * can carry the full NESA course range across Years 10–12 (see data/subjects).
 */
export type SubjectId = string;

/** NESA key learning areas (KLAs) used to group the subject picker. */
export type SubjectArea =
  | "English"
  | "Mathematics"
  | "Science"
  | "HSIE"
  | "Creative Arts"
  | "TAS"
  | "PDHPE"
  | "Languages"
  | "VET";

/**
 * How confident we are in a subject's *topic structure* (the subject's
 * existence, name and KLA are confirmed against the NESA course index):
 *  - "verified"   → topic/module list confirmed against a NESA syllabus page
 *  - "structural" → follows the established real syllabus structure (not
 *                   re-fetched page-by-page this session)
 *  - "approx"     → indicative topic list, not closely mapped to the syllabus
 */
export type Verification = "verified" | "structural" | "approx";

export interface Subject {
  id: SubjectId;
  name: string;
  short: string;
  /** NESA key learning area (KLA) grouping */
  area: SubjectArea;
  /** tailwind gradient stops for the subject accent */
  gradient: [string, string];
  icon: string; // emoji/glyph used in cards
  blurb: string;
  /**
   * Union of topics across all years (kept for back-compat / broad listings).
   * Prefer `topicsByYear` + `topicsForYear()` when a year context is known.
   */
  topics: string[];
  /** Syllabus topics/modules split by year level. */
  topicsByYear: Record<YearLevel, string[]>;
  /**
   * Which years this subject is offered. Stage 6 courses (e.g. Extension) may
   * not exist at Year 10.
   */
  years: YearLevel[];
  /** how many marking bands this subject reports (most HSC = 5, some 6) */
  bands: number;
  /** confidence in this subject's topic structure (see Verification) */
  verification: Verification;
}

export type QuestionType = "multiple-choice" | "short-answer" | "extended-response";

export interface Question {
  id: string;
  subjectId: SubjectId;
  topic: string;
  type: QuestionType;
  /** total marks available */
  marks: number;
  /** the question stem (may contain line breaks) */
  prompt: string;
  /** multiple-choice options (A–D). Only for multiple-choice. */
  options?: string[];
  /** index into options for the correct answer. Only for multiple-choice. */
  correctIndex?: number;
  /** short model answer / worked solution shown after answering */
  solution: string;
  /** NESA-style marking criteria / band descriptors for written responses */
  markingCriteria?: string[];
  /** NESA syllabus outcome codes this question targets */
  outcomes?: string[];
  /** Year level this question targets. Undefined is treated as year12 (HSC). */
  yearLevel?: YearLevel;
  difficulty: "foundation" | "standard" | "challenge";
  /** true when this question was AI-generated on demand (not in the seed bank) */
  generated?: boolean;
}

// ---------- Firestore documents ----------

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  /** NSW year level (Stage 5 / Preliminary / HSC). Defaults to year12. */
  yearLevel: YearLevel;
  subjects: SubjectId[];
  /**
   * Per-subject year level for accelerated study. Maps a subject id to the
   * year/stage the student actually studies it at (which may be one stage above
   * their base yearLevel). Absent → the subject uses the base year default.
   */
  subjectLevels: Record<SubjectId, YearLevel>;
  premium: boolean;
  createdAt: number;
  // streak tracking
  streak: number;
  bestStreak: number;
  lastActiveDay: string | null; // yyyy-mm-dd (Australia/Sydney)
  // aggregate stats
  questionsAnswered: number;
  correctCount: number;
  onboarded: boolean;
  // gamification
  xp: number;
  /** daily goal — target questions + reviews per day */
  dailyGoal: number;
  /** badge ids earned (see lib/badges.ts) */
  badges: string[];
  // leaderboard (opt-in, anonymous alias)
  leaderboardOptIn: boolean;
  leaderboardAlias: string;
}

export interface Attempt {
  id: string;
  questionId: string;
  subjectId: SubjectId;
  topic: string;
  type: QuestionType;
  correct: boolean | null; // null for written responses that were AI-marked by band
  awardedMarks: number;
  totalMarks: number;
  createdAt: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TutorSession {
  id: string;
  subjectId: SubjectId;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// ---------- Spaced repetition (SM-2) ----------

/**
 * One reviewable item in the spaced-repetition system. Content is snapshotted
 * onto the item so the review queue renders without joins (AI-generated
 * questions and flashcards have no bank entry to look up).
 */
export interface SRSItem {
  id: string;
  kind: "question" | "flashcard";
  /** question id or `${deckId}:${cardId}` */
  refId: string;
  subjectId: SubjectId;
  topic: string;
  /** the year/stage the item was studied at (accelerated subjects). Optional
   *  for legacy items created before per-subject levels existed. */
  yearLevel?: YearLevel;
  // snapshot content
  front: string; // question prompt or card front
  back: string; // solution or card back
  options?: string[];
  correctIndex?: number;
  // SM-2 state
  ease: number; // easiness factor, min 1.3
  interval: number; // days
  reps: number; // consecutive successful reviews
  lapses: number;
  due: string; // yyyy-mm-dd Sydney day key
  lastReviewed: number | null;
  createdAt: number;
}

/** Self-graded review quality, mapped onto SM-2's 0–5 scale. */
export type ReviewGrade = "again" | "hard" | "good" | "easy";

// ---------- Flashcards ----------

export interface Deck {
  id: string;
  name: string;
  subjectId: SubjectId;
  topic: string;
  cardCount: number;
  /** true when generated by AI rather than hand-made */
  aiGenerated: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  createdAt: number;
}

// ---------- Daily activity (goal ring + heatmap) ----------

export interface DayStat {
  /** yyyy-mm-dd Sydney day key (doc id) */
  day: string;
  questions: number;
  reviews: number;
  essays: number;
  tutorMessages: number;
  xp: number;
}

// ---------- Exams (past paper mode) ----------

export interface ExamQuestionResult {
  questionId: string;
  topic: string;
  type: QuestionType;
  prompt: string;
  answerGiven: string;
  correct: boolean | null;
  awardedMarks: number;
  totalMarks: number;
  feedback?: string;
}

export interface ExamResult {
  id: string;
  subjectId: SubjectId;
  totalMarks: number;
  awardedMarks: number;
  durationSeconds: number;
  timeLimitSeconds: number;
  questions: ExamQuestionResult[];
  createdAt: number;
}

// ---------- Essay history ----------

export interface EssayRecord {
  id: string;
  subjectId: SubjectId;
  questionType: string;
  band: number;
  maxBand: number;
  overall: string;
  criteria: { name: string; score: number; max: number; band: number; comment: string }[];
  wordCount: number;
  createdAt: number;
}

// ---------- Study plan ----------

export interface PlanExam {
  subjectId: SubjectId;
  /** yyyy-mm-dd */
  date: string;
}

export interface PlanTask {
  subjectId: SubjectId;
  topic: string;
  activity: "practice" | "review" | "flashcards" | "essay" | "past-paper";
  minutes: number;
  note: string;
}

export interface PlanWeek {
  /** yyyy-mm-dd of the Monday starting the week */
  startDay: string;
  focus: string;
  tasks: PlanTask[];
}

export interface StudyPlan {
  exams: PlanExam[];
  hoursPerWeek: number;
  summary: string;
  weeks: PlanWeek[];
  createdAt: number;
}

// ---------- Leaderboard ----------

export interface LeaderboardEntry {
  uid: string;
  alias: string;
  xp: number;
  level: number;
  streak: number;
  updatedAt: number;
}

// ---------- Uploads (photos & documents) ----------

export interface Upload {
  id: string;
  /** original file name */
  name: string;
  kind: "image" | "pdf";
  /** MIME type, e.g. image/jpeg or application/pdf */
  mediaType: string;
  /** bytes */
  size: number;
  /** path in Firebase Storage (owner-scoped) */
  storagePath: string;
  /** download URL */
  url: string;
  subjectId?: SubjectId;
  createdAt: number;
}

export type UploadAction = "explain" | "mark" | "generate" | "ask";

// ---------- AI response shapes (from /api) ----------

export interface WrittenFeedback {
  awardedMarks: number;
  totalMarks: number;
  band: number;
  maxBand: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  modelPoints: string[];
}

export interface EssayFeedback {
  band: number;
  maxBand: number;
  overall: string;
  criteria: {
    name: string;
    score: number;
    max: number;
    /** estimated band this criterion sits in */
    band: number;
    comment: string;
  }[];
  nextSteps: string[];
}

export interface GeneratedQuestion {
  topic: string;
  type: QuestionType;
  marks: number;
  prompt: string;
  options?: string[];
  correctIndex?: number;
  solution: string;
  markingCriteria?: string[];
  difficulty: "foundation" | "standard" | "challenge";
}

export interface GeneratedCard {
  front: string;
  back: string;
}
