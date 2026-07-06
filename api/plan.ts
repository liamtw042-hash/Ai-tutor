import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  MODEL,
  anthropic,
  fail,
  methodGuard,
  parseJSON,
  readBody,
  requirePremium,
  textOf,
} from "./_lib.js";

// POST /api/plan — generate a personalised week-by-week HSC study plan.

interface Body {
  /** caller identity, used for the owner/premium check */
  email?: string;
  premium?: boolean;
  exams: { subjectName: string; subjectId: string; date: string }[];
  hoursPerWeek: number;
  weakTopics: { subjectName: string; topic: string; accuracy: number }[];
  todayKey: string; // yyyy-mm-dd (Sydney)
}

interface PlanTask {
  subjectId: string;
  topic: string;
  activity: "practice" | "review" | "flashcards" | "essay" | "past-paper";
  minutes: number;
  note: string;
}

interface PlanWeek {
  startDay: string;
  focus: string;
  tasks: PlanTask[];
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!methodGuard(req, res)) return;
  try {
    const body = readBody<Body>(req);
    // Study plans are a Premium feature — enforce server-side (owner bypass).
    if (!requirePremium(res, body)) return;
    const { exams, hoursPerWeek, weakTopics, todayKey } = body;
    if (!Array.isArray(exams) || exams.length === 0) {
      res.status(400).json({ error: "At least one exam date is required" });
      return;
    }
    const hours = Math.max(2, Math.min(50, Math.round(hoursPerWeek || 10)));

    const weakList =
      weakTopics?.length > 0
        ? weakTopics
            .map(
              (w) =>
                `- ${w.subjectName}: ${w.topic} (currently ${Math.round(w.accuracy * 100)}% accuracy)`,
            )
            .join("\n")
        : "- No performance data yet — allocate time evenly and front-load content coverage.";

    const examList = exams
      .map((e) => `- ${e.subjectName} (id: ${e.subjectId}): exam on ${e.date}`)
      .join("\n");

    const system = [
      "You are an expert NSW HSC study coach who builds realistic, evidence-based study schedules.",
      "Principles you apply:",
      "- Active recall and spaced repetition beat re-reading. Prefer practice questions, flashcard review and past papers over passive study.",
      "- Weight time toward the student's WEAK topics and toward exams that are CLOSER in date.",
      "- Interleave subjects within a week rather than blocking one subject per week.",
      "- Final 2 weeks before each exam: shift to past papers under timed conditions.",
      "- Keep the load inside the student's stated weekly hours — never prescribe more.",
      "Return ONLY a JSON object, no prose, matching exactly:",
      `{`,
      `  "summary": string,   // 2-3 sentences: overall strategy for this student`,
      `  "weeks": [`,
      `    {`,
      `      "startDay": "yyyy-mm-dd",   // the Monday of the week, first week starts on or before today`,
      `      "focus": string,            // one line theme for the week`,
      `      "tasks": [`,
      `        {`,
      `          "subjectId": string,    // one of the ids given`,
      `          "topic": string,`,
      `          "activity": "practice" | "review" | "flashcards" | "essay" | "past-paper",`,
      `          "minutes": number,      // 20-90`,
      `          "note": string          // one actionable sentence`,
      `        }`,
      `      ]`,
      `    }`,
      `  ]`,
      `}`,
      "Cover from today until the last exam, up to a maximum of 12 weeks (if longer, compress the early period into fewer, broader weeks).",
      "5-10 tasks per week, total minutes per week ≈ the student's weekly hours.",
    ].join("\n");

    const user = [
      `TODAY: ${todayKey}`,
      `AVAILABLE STUDY TIME: ${hours} hours/week (outside school)`,
      ``,
      `EXAMS:`,
      examList,
      ``,
      `WEAK TOPICS (from real performance data):`,
      weakList,
    ].join("\n");

    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 6000,
      temperature: 0.4,
      system,
      messages: [{ role: "user", content: user }],
    });

    const parsed = parseJSON<{ summary: string; weeks: PlanWeek[] }>(
      textOf(message),
    );
    if (!parsed.weeks?.length) {
      res.status(502).json({ error: "The model returned no plan. Try again." });
      return;
    }
    res.status(200).json(parsed);
  } catch (err) {
    fail(res, err);
  }
}
