// ---------------------------------------------------------------------------
// Shared domain types for StudyMate HSC
// ---------------------------------------------------------------------------

export type SubjectId =
  | "math-adv"
  | "math-ext1"
  | "english-adv"
  | "english-std"
  | "biology"
  | "chemistry"
  | "physics"
  | "modern-history"
  | "economics"
  | "business-studies";

export interface Subject {
  id: SubjectId;
  name: string;
  short: string;
  /** NESA learning area grouping */
  area: "Mathematics" | "English" | "Science" | "HSIE";
  /** tailwind gradient stops for the subject accent */
  gradient: [string, string];
  icon: string; // emoji/glyph used in cards
  blurb: string;
  topics: string[];
  /** how many marking bands this subject reports (most HSC = 5, some 6) */
  bands: number;
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
  difficulty: "foundation" | "standard" | "challenge";
}

// ---------- Firestore documents ----------

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  subjects: SubjectId[];
  premium: boolean;
  createdAt: number;
  // streak tracking
  streak: number;
  lastActiveDay: string | null; // yyyy-mm-dd (Australia/Sydney)
  // aggregate stats
  questionsAnswered: number;
  correctCount: number;
  onboarded: boolean;
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
    comment: string;
  }[];
  nextSteps: string[];
}
