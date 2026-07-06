import Anthropic from "@anthropic-ai/sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// The Claude model used across all StudyMate AI features. Override it in one
// place — set ANTHROPIC_MODEL in the Vercel environment to migrate the whole
// app to a different model without a code change or redeploy of source.
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/** Concatenate all text blocks from a Claude message response. */
export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * Extract the first JSON object from a model response, tolerating markdown
 * code fences or surrounding prose.
 */
export function parseJSON<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in model response.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

export function readBody<T>(req: VercelRequest): T {
  if (typeof req.body === "string") return JSON.parse(req.body) as T;
  return req.body as T;
}

export function methodGuard(
  req: VercelRequest,
  res: VercelResponse,
): boolean {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }
  return true;
}

export function fail(res: VercelResponse, err: unknown): void {
  const message = err instanceof Error ? err.message : "Unknown server error";
  // eslint-disable-next-line no-console
  console.error("[studymate api]", message);
  res.status(500).json({ error: message });
}
