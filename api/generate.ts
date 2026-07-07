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
import { enforceUsage } from "./_usage.js";

// POST /api/generate — produce fresh HSC-style practice questions on demand.

interface Body {
  subjectName: string;
  topic: string;
  count: number; // 1..5
  type: "multiple-choice" | "short-answer" | "mixed";
  difficulty: "foundation" | "standard" | "challenge";
  /** e.g. "Year 11 (Stage 6 Preliminary)" */
  stage?: string;
}

interface GeneratedQuestion {
  topic: string;
  type: "multiple-choice" | "short-answer";
  marks: number;
  prompt: string;
  options?: string[];
  correctIndex?: number;
  solution: string;
  markingCriteria?: string[];
  difficulty: "foundation" | "standard" | "challenge";
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!methodGuard(req, res)) return;
  try {
    const { subjectName, topic, count, type, difficulty, stage } =
      readBody<Body>(req);
    if (!subjectName || !topic) {
      res.status(400).json({ error: "subjectName and topic are required" });
      return;
    }

    if (!(await enforceUsage(req, res, "generate"))) return;

    const n = Math.max(1, Math.min(5, Math.round(count || 3)));
    const level = stage || "Year 12 (Stage 6 HSC)";

    const typeRule =
      type === "multiple-choice"
        ? "Every question must be multiple-choice with exactly 4 options."
        : type === "short-answer"
          ? "Every question must be short-answer worth 3-5 marks with markingCriteria."
          : "Mix multiple-choice (4 options) and short-answer (3-5 marks with markingCriteria).";

    const system = [
      `You are an experienced NSW exam writer for ${subjectName}, writing for a student in ${level}.`,
      `Write ${n} original, exam-authentic questions on the topic "${topic}" at ${difficulty} difficulty, pitched at the ${level} standard (content, depth and command verbs appropriate to that stage — not harder or easier).`,
      "Match the style, command verbs (identify, explain, analyse, evaluate...) and mark weightings NESA uses at this stage.",
      typeRule,
      "Rules:",
      "- Questions must be original (never copied from real past papers).",
      "- Keep every question inside this subject and stage's syllabus scope. If you are unsure whether a sub-topic is in scope for this year, choose a clearly in-scope one instead.",
      "- Multiple-choice: exactly 4 plausible options, one correct, correctIndex 0-3, solution explains why the answer is right AND why each distractor is wrong.",
      "- Short-answer: 3-5 marks, markingCriteria as an array of NESA-style criteria lines with mark allocations, solution is a full-mark model answer.",
      "- Australian English, NESA terminology.",
      "Return ONLY a JSON object, no prose, matching exactly:",
      `{`,
      `  "questions": [`,
      `    {`,
      `      "topic": "${topic}",`,
      `      "type": "multiple-choice" | "short-answer",`,
      `      "marks": number,          // 1 for MC, 3-5 for short answer`,
      `      "prompt": string,`,
      `      "options": string[],      // MC only, exactly 4`,
      `      "correctIndex": number,   // MC only, 0-3`,
      `      "solution": string,`,
      `      "markingCriteria": string[], // short-answer only`,
      `      "difficulty": "${difficulty}"`,
      `    }`,
      `  ]`,
      `}`,
    ].join("\n");

    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 3500,
      temperature: 0.8,
      system,
      messages: [
        {
          role: "user",
          content: `Generate ${n} ${difficulty} HSC-style questions for ${subjectName} on "${topic}".`,
        },
      ],
    });

    const parsed = parseJSON<{ questions: GeneratedQuestion[] }>(textOf(message));
    const questions = (parsed.questions ?? [])
      .filter((q) => q?.prompt && q?.solution)
      .slice(0, n)
      .map((q) => ({
        ...q,
        topic,
        difficulty,
        marks:
          q.type === "multiple-choice"
            ? 1
            : Math.max(2, Math.min(6, Math.round(q.marks || 4))),
      }));

    if (questions.length === 0) {
      res.status(502).json({ error: "The model returned no usable questions. Try again." });
      return;
    }
    res.status(200).json({ questions });
  } catch (err) {
    fail(res, err);
  }
}
