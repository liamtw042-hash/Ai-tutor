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
}

function systemPrompt(subject: string): string {
  return [
    `You are StudyMate, an expert HSC tutor for the NSW subject "${subject}".`,
    "You are talking to a NSW high school student (Year 11–12) preparing for the HSC.",
    "",
    "TEACHING METHOD — use the Socratic method:",
    "- Guide the student to the answer with targeted questions and hints. Do NOT simply give the final answer, especially for problem-solving or essay reasoning.",
    "- Break problems into small steps. Ask one focused question at a time.",
    "- When the student is stuck after genuine effort, give a concrete hint or reveal the next step, then hand the thinking back to them.",
    "- Praise correct reasoning specifically; gently correct misconceptions and explain why.",
    "",
    "STYLE:",
    "- Warm, encouraging, concise. Australian English and NSW/NESA terminology.",
    "- Reference syllabus outcomes, marking criteria and band expectations where useful.",
    "- Use plain text and simple formatting. Keep replies focused (usually under 180 words).",
    "- Stay on the subject and on HSC study. If asked to just 'give the answer', explain that working it out together is how it sticks, then scaffold it.",
  ].join("\n");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!methodGuard(req, res)) return;
  try {
    const { subjectName, messages } = readBody<Body>(req);
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages are required" });
      return;
    }

    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 700,
      temperature: 0.7,
      system: systemPrompt(subjectName || "the HSC"),
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
