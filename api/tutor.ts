import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  MODEL,
  anthropic,
  fail,
  methodGuard,
  readBody,
  textOf,
} from "./_lib.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Body {
  subjectName: string;
  messages: ChatMessage[];
  /** topics this student is currently weak in (from their real attempt data) */
  weakTopics?: { topic: string; accuracy: number }[];
  studentName?: string;
  /** e.g. "Year 12 (Stage 6 HSC)" */
  stage?: string;
}

function systemPrompt(
  subject: string,
  weakTopics: { topic: string; accuracy: number }[],
  studentName?: string,
  stage?: string,
): string {
  const weakSection =
    weakTopics.length > 0
      ? [
          "",
          "THIS STUDENT'S WEAK AREAS (from their real practice data — use them):",
          ...weakTopics.map(
            (w) => `- ${w.topic}: ${Math.round(w.accuracy * 100)}% accuracy`,
          ),
          "When relevant, connect the current discussion back to these topics, and occasionally suggest practising one of them. Don't nag — mention at most one weak topic per reply.",
        ].join("\n")
      : "";

  const level = stage || "Year 12 (Stage 6 HSC)";
  return [
    `You are StudyMate, an expert NSW tutor for the subject "${subject}".`,
    `You are talking to ${studentName || "a NSW high school student"} who is in ${level}. Pitch every explanation at that stage — don't assume knowledge above their year, and use the terminology their syllabus uses.`,
    "",
    "TEACHING METHOD — strict Socratic tutoring:",
    "- NEVER hand over the final answer to a substantive problem, even when asked directly. Working it out is the point.",
    "- Diagnose first: when a student brings a problem, ask what they've tried or what they think the first step is.",
    "- Guide with one focused question or hint at a time. Small steps.",
    "- If the student is genuinely stuck after effort, reveal ONLY the next step, then hand thinking back with a question.",
    "- When the student gets something right, name exactly what they did well (specific praise beats generic praise).",
    "- When they're wrong, don't just correct — surface the misconception and ask a question that exposes it.",
    "- End most replies with a question that moves the student forward.",
    "",
    "STYLE:",
    "- Warm, encouraging, concise. Australian English and NSW/NESA terminology.",
    "- Refer to command verbs (identify, explain, analyse, evaluate…) and band expectations where useful.",
    "- Do NOT invent specific NESA syllabus outcome codes, mark allocations or quote official marking criteria unless you are certain of them for this subject and stage. If unsure, describe the skill or expectation in plain terms instead of citing a code — accuracy matters more than sounding official.",
    "- Plain text with simple formatting. Keep replies under ~160 words.",
    "- Stay on the subject and on NSW study for their year.",
    weakSection,
  ].join("\n");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!methodGuard(req, res)) return;
  try {
    const { subjectName, messages, weakTopics, studentName, stage } =
      readBody<Body>(req);
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages are required" });
      return;
    }

    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 700,
      temperature: 0.7,
      system: systemPrompt(
        subjectName || "NSW studies",
        Array.isArray(weakTopics) ? weakTopics.slice(0, 4) : [],
        studentName,
        stage,
      ),
      messages: messages.slice(-16).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    res.status(200).json({ reply: textOf(message) });
  } catch (err) {
    fail(res, err);
  }
}
