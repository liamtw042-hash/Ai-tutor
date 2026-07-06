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
  questionType: string;
  maxBand: number;
  essay: string;
  /** the essay question / stimulus the student was answering, if provided */
  question?: string;
}

interface EssayFeedback {
  band: number;
  maxBand: number;
  overall: string;
  criteria: {
    name: string;
    score: number;
    max: number;
    band: number;
    comment: string;
  }[];
  nextSteps: string[];
}

// Condensed NESA band descriptors the marker anchors against. Real HSC marking
// is holistic against descriptors like these, not a points checklist.
const BAND_DESCRIPTORS = `
NESA BAND CHARACTERISTICS (English/Humanities extended response):
- Band 6: sophisticated, sustained thesis; skilful analysis of how meaning is shaped; judicious, well-integrated evidence; controlled, precise expression.
- Band 5: effective thesis; sound analysis with some sophistication; well-chosen evidence, mostly integrated; clear, organised expression.
- Band 4: sound understanding; describes rather than analyses at times; relevant but sometimes undeveloped evidence; adequate structure.
- Band 3: limited argument; retells or describes; sparse or poorly linked evidence; lapses in structure and expression.
- Band 2/1: minimal engagement with the question; little or no evidence; fragmented expression.
`.trim();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!methodGuard(req, res)) return;
  try {
    const { subjectName, questionType, maxBand, essay, question } =
      readBody<Body>(req);
    if (!essay?.trim() || essay.trim().length < 40) {
      res.status(400).json({ error: "Please provide a longer response to mark." });
      return;
    }

    const band = maxBand && maxBand > 0 ? maxBand : 6;

    const system = [
      `You are a senior NSW HSC marker and ${subjectName} teacher marking a ${questionType}.`,
      "Mark holistically against NESA band descriptors, the way real HSC marking centres do.",
      BAND_DESCRIPTORS,
      "",
      "For EACH criterion, estimate which band that dimension of the response sits in — a response can be Band 5 on thesis but Band 3 on evidence.",
      "Be specific and constructive: quote or closely paraphrase the student's own words in comments. Never invent content they didn't write.",
      "If the response doesn't address the question given, say so plainly in `overall` — alignment to the question is the first thing markers check.",
      "Return ONLY a JSON object (no prose) matching exactly:",
      `{`,
      `  "band": number,        // overall band 1..${band}`,
      `  "maxBand": ${band},`,
      `  "overall": string,     // 2-3 sentence holistic judgement referencing the band descriptors`,
      `  "criteria": [          // exactly these four, in order`,
      `    { "name": "Thesis & Argument",      "score": number, "max": 5, "band": number, "comment": string },`,
      `    { "name": "Evidence",               "score": number, "max": 5, "band": number, "comment": string },`,
      `    { "name": "Analysis",               "score": number, "max": 5, "band": number, "comment": string },`,
      `    { "name": "Expression & Structure", "score": number, "max": 5, "band": number, "comment": string }`,
      `  ],`,
      `  "nextSteps": string[]  // 3 prioritised improvements, each concrete enough to act on tonight`,
      `}`,
    ].join("\n");

    const userContent = [
      `QUESTION TYPE: ${questionType}`,
      `SUBJECT: ${subjectName}`,
      question?.trim() ? `QUESTION / STIMULUS:\n${question.trim()}` : "",
      ``,
      `STUDENT RESPONSE:`,
      essay,
    ]
      .filter(Boolean)
      .join("\n");

    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.4,
      system,
      messages: [{ role: "user", content: userContent }],
    });

    const parsed = parseJSON<EssayFeedback>(textOf(message));
    parsed.maxBand = band;
    parsed.band = Math.max(1, Math.min(band, Math.round(parsed.band)));
    parsed.criteria = (parsed.criteria ?? []).map((c) => ({
      ...c,
      band: Math.max(1, Math.min(band, Math.round(c.band || parsed.band))),
    }));
    res.status(200).json(parsed);
  } catch (err) {
    fail(res, err);
  }
}
