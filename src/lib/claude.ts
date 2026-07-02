import type {
  ChatMessage,
  EssayFeedback,
  Question,
  WrittenFeedback,
} from "@/types";

// ---------------------------------------------------------------------------
// Thin client wrappers around the serverless /api endpoints. The Claude API
// key never touches the browser — these call our own backend which proxies to
// Anthropic. During local `vite dev` (no serverless runtime) the endpoints are
// unavailable, so callers should handle the thrown error gracefully.
// ---------------------------------------------------------------------------

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(
      detail || `Request failed (${res.status}). Is the API deployed?`,
    );
  }
  return res.json() as Promise<T>;
}

export function tutorReply(
  subjectName: string,
  messages: ChatMessage[],
): Promise<{ reply: string }> {
  return postJSON("/api/tutor", { subjectName, messages });
}

export function markWritten(
  question: Pick<Question, "prompt" | "marks" | "markingCriteria" | "topic">,
  subjectName: string,
  answer: string,
): Promise<WrittenFeedback> {
  return postJSON("/api/mark", { question, subjectName, answer });
}

export function reviewEssay(
  subjectName: string,
  questionType: string,
  maxBand: number,
  essay: string,
): Promise<EssayFeedback> {
  return postJSON("/api/essay", { subjectName, questionType, maxBand, essay });
}
