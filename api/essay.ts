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
}

interface EssayFeedback {
  band: number;
  maxBand: number;
  overall: string;
  criteria: { name: string; score: number; max: number; comment: string }[];
  nextSteps: string[];
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (!methodGuard(req, res)) return;
  try {
    const { subjectName, questionType, maxBand, essay } = readBody<Body>(req);
    if (!essay?.trim() || essay.trim().length < 40) {
      res.status(400).json({ error: "Please provide a longer response to mark." });
      return;
    }

    const band = maxBand && maxBand > 0 ? maxBand : 6;

    const system = [
      `You are a senior NSW HSC marker and English/Humanities teacher marking a ${questionType} for ${subjectName}.`,
      "Assess the response against NESA marking guidelines and band descriptors.",
      "Evaluate four dimensions: Thesis/Argument, Evidence/Textual Support, Analysis/Reasoning, and Expression/Structure.",
      "Be specific and constructive — quote or paraphrase the student's own words when giving feedback.",
      "Return ONLY a JSON object (no prose) matching exactly:",
      `{`,
      `  "band": number,        // overall band 1..${band}`,
      `  "maxBand": ${band},`,
      `  "overall": string,     // 2-3 sentence holistic judgement referencing the band`,
      `  "criteria": [          // exactly these four, in order`,
      `    { "name": "Thesis & Argument",   "score": number, "max": 5, "comment": string },`,
      `    { "name": "Evidence",            "score": number, "max": 5, "comment": string },`,
      `    { "name": "Analysis",            "score": number, "max": 5, "comment": string },`,
      `    { "name": "Expression & Structure", "score": number, "max": 5, "comment": string }`,
      `  ],`,
      `  "nextSteps": string[]  // 3 prioritised, actionable improvements`,
      `}`,
    ].join("\n");

    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 1300,
      temperature: 0.4,
      system,
      messages: [
        {
          role: "user",
          content: `QUESTION TYPE: ${questionType}\nSUBJECT: ${subjectName}\n\nSTUDENT RESPONSE:\n${essay}`,
        },
      ],
    });

    const parsed = parseJSON<EssayFeedback>(textOf(message));
    parsed.maxBand = band;
    parsed.band = Math.max(1, Math.min(band, Math.round(parsed.band)));
    res.status(200).json(parsed);
  } catch (err) {
    fail(res, err);
  }
}
