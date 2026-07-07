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

// POST /api/flashcards — generate a flashcard deck for a subject/topic.

interface Body {
  subjectName: string;
  topic: string;
  count: number; // 5..20
  stage?: string;
}

interface GeneratedCard {
  front: string;
  back: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!methodGuard(req, res)) return;
  try {
    const { subjectName, topic, count, stage } = readBody<Body>(req);
    if (!subjectName || !topic) {
      res.status(400).json({ error: "subjectName and topic are required" });
      return;
    }

    if (!(await enforceUsage(req, res, "aiDeck"))) return;

    const n = Math.max(5, Math.min(20, Math.round(count || 12)));
    const level = stage || "Year 12 (Stage 6 HSC)";

    const system = [
      `You are an expert NSW teacher for ${subjectName} making flashcards on "${topic}" for a student in ${level}.`,
      `Create exactly ${n} high-quality flashcards optimised for ACTIVE RECALL:`,
      "- Front: a specific question, term, or cue — never a vague heading. Test one atomic fact or concept per card.",
      "- Back: a precise, complete answer in 1-3 sentences. Include formulas, definitions with key qualifiers, dates, or NESA terminology where relevant.",
      "- Cover the highest-yield syllabus content for this topic: definitions, processes, formulas, cause/effect, common exam traps.",
      "- Australian English, NESA terminology.",
      "Return ONLY a JSON object, no prose:",
      `{ "cards": [ { "front": string, "back": string } ] }`,
    ].join("\n");

    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 3000,
      temperature: 0.6,
      system,
      messages: [
        {
          role: "user",
          content: `Make ${n} flashcards for ${subjectName} — "${topic}".`,
        },
      ],
    });

    const parsed = parseJSON<{ cards: GeneratedCard[] }>(textOf(message));
    const cards = (parsed.cards ?? [])
      .filter((c) => c?.front?.trim() && c?.back?.trim())
      .slice(0, n);

    if (cards.length === 0) {
      res.status(502).json({ error: "The model returned no usable cards. Try again." });
      return;
    }
    res.status(200).json({ cards });
  } catch (err) {
    fail(res, err);
  }
}
