import { auth } from "@/lib/firebase";
import type {
  ChatMessage,
  EssayFeedback,
  GeneratedCard,
  GeneratedQuestion,
  PlanWeek,
  Question,
  UploadAction,
  WrittenFeedback,
} from "@/types";

// ---------------------------------------------------------------------------
// Thin client wrappers around the serverless /api endpoints. The Claude API
// key never touches the browser — these call our own backend which proxies to
// Anthropic. During local `vite dev` (no serverless runtime) the endpoints are
// unavailable, so callers should handle the thrown error gracefully.
// ---------------------------------------------------------------------------

/**
 * The signed-in user's Firebase ID token, so the serverless functions can
 * identify the caller and enforce free-tier limits server-side (not just in
 * localStorage). Returns no header when signed out or in demo mode.
 */
async function authHeader(): Promise<Record<string, string>> {
  try {
    const user = auth?.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error ?? "";
    } catch {
      /* ignore */
    }
    // 429 (daily limit) and 401/403 (auth/premium) already carry a clear,
    // user-facing message from the server — surface it as-is.
    throw new Error(
      detail || `Request failed (${res.status}). Is the API deployed?`,
    );
  }
  return res.json() as Promise<T>;
}

export function tutorReply(
  subjectName: string,
  messages: ChatMessage[],
  weakTopics: { topic: string; accuracy: number }[] = [],
  studentName?: string,
  stage?: string,
): Promise<{ reply: string }> {
  return postJSON("/api/tutor", {
    subjectName,
    messages,
    weakTopics,
    studentName,
    stage,
  });
}

export function markWritten(
  question: Pick<Question, "prompt" | "marks" | "markingCriteria" | "topic">,
  subjectName: string,
  answer: string,
  stage?: string,
): Promise<WrittenFeedback> {
  return postJSON("/api/mark", { question, subjectName, answer, stage });
}

export function reviewEssay(
  subjectName: string,
  questionType: string,
  maxBand: number,
  essay: string,
  question?: string,
  stage?: string,
): Promise<EssayFeedback> {
  return postJSON("/api/essay", {
    subjectName,
    questionType,
    maxBand,
    essay,
    question,
    stage,
  });
}

export function generateQuestions(
  subjectName: string,
  topic: string,
  count: number,
  type: "multiple-choice" | "short-answer" | "mixed",
  difficulty: "foundation" | "standard" | "challenge",
  stage?: string,
): Promise<{ questions: GeneratedQuestion[] }> {
  return postJSON("/api/generate", {
    subjectName,
    topic,
    count,
    type,
    difficulty,
    stage,
  });
}

export function generateFlashcards(
  subjectName: string,
  topic: string,
  count: number,
  stage?: string,
): Promise<{ cards: GeneratedCard[] }> {
  return postJSON("/api/flashcards", { subjectName, topic, count, stage });
}

export function analyzeWork(payload: {
  action: UploadAction;
  /** caller identity for the server-side premium/owner check */
  email?: string;
  premium?: boolean;
  subjectName?: string;
  stage?: string;
  question?: string;
  image?: { data: string; mediaType: string };
  pdf?: { data: string };
  text?: string;
}): Promise<{ result: string }> {
  return postJSON("/api/analyze", payload);
}

export function generatePlan(
  exams: { subjectName: string; subjectId: string; date: string }[],
  hoursPerWeek: number,
  weakTopics: { subjectName: string; topic: string; accuracy: number }[],
  todayKey: string,
  auth?: { email?: string; premium?: boolean },
): Promise<{ summary: string; weeks: PlanWeek[] }> {
  return postJSON("/api/plan", {
    exams,
    hoursPerWeek,
    weakTopics,
    todayKey,
    email: auth?.email,
    premium: auth?.premium,
  });
}
