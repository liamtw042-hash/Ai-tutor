import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  MODEL,
  anthropic,
  fail,
  methodGuard,
  parseJSON,
  readBody,
  textOf,
} from "./_lib.js";

interface Body {
  subjectName: string;
  answer: string;
  stage?: string;
  question: {
    prompt: string;
    marks: number;
    topic: string;
    markingCriteria?: string[];
  };
}

interface WrittenFeedback {
  awardedMarks: number;
  totalMarks: number;
  band: number;
  maxBand: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  modelPoints: string[];
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!methodGuard(req, res)) return;
  try {
    const { subjectName, answer, question, stage } = readBody<Body>(req);
    if (!answer?.trim()) {
      res.status(400).json({ error: "answer is required" });
      return;
    }
    const level = stage || "Year 12 (Stage 6 HSC)";

    const criteria = question.markingCriteria?.length
      ? question.markingCriteria.map((c) => `- ${c}`).join("\n")
      : "- Award marks according to NESA standards for this response type.";

    const system = [
      `You are an experienced NSW marker for ${subjectName}, marking a response from a student in ${level}.`,
      "Mark the student's response against the marking criteria provided, applying the standard expected at this stage.",
      "Be fair but rigorous — award marks only for what is actually demonstrated. This is a study estimate to guide improvement, not an official NESA mark; don't overstate its authority in the summary.",
      "Return ONLY a JSON object, no prose, matching exactly this shape:",
      `{`,
      `  "awardedMarks": number,      // 0..${question.marks}`,
      `  "totalMarks": ${question.marks},`,
      `  "band": number,              // estimated band 1..6 for this response`,
      `  "maxBand": 6,`,
      `  "summary": string,           // 1-2 sentence holistic judgement`,
      `  "strengths": string[],       // 1-3 specific things done well`,
      `  "improvements": string[],    // 1-3 specific, actionable fixes`,
      `  "modelPoints": string[]      // key points a full-mark answer would include`,
      `}`,
    ].join("\n");

    const user = [
      `TOPIC: ${question.topic}`,
      `MARKS AVAILABLE: ${question.marks}`,
      ``,
      `QUESTION:`,
      question.prompt,
      ``,
      `MARKING CRITERIA:`,
      criteria,
      ``,
      `STUDENT RESPONSE:`,
      answer,
    ].join("\n");

    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 900,
      temperature: 0.3,
      system,
      messages: [{ role: "user", content: user }],
    });

    const parsed = parseJSON<WrittenFeedback>(textOf(message));
    // clamp defensively
    parsed.totalMarks = question.marks;
    parsed.awardedMarks = Math.max(
      0,
      Math.min(question.marks, Math.round(parsed.awardedMarks)),
    );
    res.status(200).json(parsed);
  } catch (err) {
    fail(res, err);
  }
}
