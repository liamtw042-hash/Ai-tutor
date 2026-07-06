import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  MODEL,
  anthropic,
  fail,
  methodGuard,
  readBody,
  requirePremium,
  textOf,
} from "./_lib.js";

// POST /api/analyze — read a student's uploaded work (photo or PDF) with
// Claude's vision / document understanding and help with it.

type Action = "explain" | "mark" | "generate" | "ask";

interface Body {
  action: Action;
  /** caller identity, used for the owner/premium check */
  email?: string;
  premium?: boolean;
  subjectName?: string;
  stage?: string;
  /** the student's own question (for the "ask" action) */
  question?: string;
  /** base64 image, no data: prefix */
  image?: { data: string; mediaType: string };
  /** base64 PDF, no data: prefix */
  pdf?: { data: string };
  /** already-extracted text, if the client provides it instead of a file */
  text?: string;
}

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function instruction(action: Action, subject: string, level: string, question?: string): string {
  const base = `The student is studying ${subject} at ${level} (NSW). The attached material is their own schoolwork — it may be handwritten, a worksheet, a past task, a marking guide or an assessment notification. First read it carefully (including handwriting), then:`;
  const common =
    "\n\nUse Australian English and NSW/NESA terminology. Be warm and encouraging. If you cannot read part of the material, say so plainly rather than guessing. Do not invent specific NESA outcome codes or marking criteria you are not sure of. This is a study aid, not an official NESA mark.";
  switch (action) {
    case "explain":
      return `${base}\n- Explain what the task/question is actually asking.\n- Break down the key concepts and what a strong response needs.\n- Where the student has attempted work, point out what's on track and where the thinking goes wrong — Socratically, with a guiding question, not just the full answer.${common}`;
    case "mark":
      return `${base}\n- Identify the question(s) and marks available if shown.\n- Mark the student's response against the standard expected at their stage, giving an estimated mark/band, specific strengths, and specific, actionable improvements.\n- Be fair but honest. Make clear this is a study estimate to guide improvement, not an official mark.${common}`;
    case "generate":
      return `${base}\n- Identify the topic and style of the material.\n- Write 3–5 fresh, original practice questions in the same style and at the same standard, with brief solutions or marking points. These are modelled on syllabus style, not official past-paper questions.${common}`;
    case "ask":
      return `${base}\n- Answer the student's question about this material: "${question || "Help me with this."}"\n- Guide them Socratically where it's a problem to solve; answer directly where it's a factual/clarifying question.${common}`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!methodGuard(req, res)) return;
  try {
    const body = readBody<Body>(req);
    // Photo & document help is a Premium feature — enforce it here, not just
    // in the UI. Owner/comp emails pass via requirePremium.
    if (!requirePremium(res, body)) return;
    const { action, subjectName, stage, question, image, pdf, text } = body;

    if (!action) {
      res.status(400).json({ error: "action is required" });
      return;
    }
    if (!image && !pdf && !text?.trim()) {
      res.status(400).json({ error: "No file or text provided to analyse." });
      return;
    }

    const subject = subjectName || "their subject";
    const level = stage || "Year 12 (Stage 6 HSC)";

    // Build the multimodal user message.
    // Typed loosely so PDF "document" blocks work across SDK versions.
    const content: unknown[] = [];

    if (image) {
      const mediaType = IMAGE_TYPES.has(image.mediaType)
        ? image.mediaType
        : "image/jpeg";
      content.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: image.data },
      });
    }
    if (pdf) {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: pdf.data,
        },
      });
    }
    if (text?.trim()) {
      content.push({
        type: "text",
        text: `MATERIAL (text):\n${text.trim().slice(0, 12000)}`,
      });
    }
    content.push({ type: "text", text: instruction(action, subject, level, question) });

    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 1600,
      temperature: action === "generate" ? 0.7 : 0.4,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: [{ role: "user", content: content as any }],
    });

    res.status(200).json({ result: textOf(message) });
  } catch (err) {
    fail(res, err);
  }
}
