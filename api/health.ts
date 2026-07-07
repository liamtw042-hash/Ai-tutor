import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MODEL, anthropic, textOf } from "./_lib.js";

// GET /api/health — reports whether the AI backend is wired up correctly.
//
//   /api/health            → cheap config check (no model call)
//   /api/health?ping=1     → also sends a 1-token request to verify the
//                            configured model id actually works with the key
//
// Use this after deploying (or changing ANTHROPIC_MODEL) to confirm the model
// is valid before students hit a broken tutor/marker.

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const usageEnforced = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT ||
      (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY),
  );

  const base = {
    ok: hasKey,
    model: MODEL,
    anthropicKeyConfigured: hasKey,
    usageEnforcementConfigured: usageEnforced,
  };

  const wantPing =
    req.query?.ping === "1" || req.query?.ping === "true";

  if (!wantPing) {
    res.status(hasKey ? 200 : 503).json({
      ...base,
      hint: hasKey
        ? "Add ?ping=1 to verify the model id actually responds."
        : "ANTHROPIC_API_KEY is not set on the server.",
    });
    return;
  }

  if (!hasKey) {
    res.status(503).json({
      ...base,
      modelOk: false,
      error: "ANTHROPIC_API_KEY is not set on the server.",
    });
    return;
  }

  const started = Date.now();
  try {
    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 4,
      messages: [{ role: "user", content: "ping" }],
    });
    res.status(200).json({
      ...base,
      modelOk: true,
      latencyMs: Date.now() - started,
      sample: textOf(message).slice(0, 40),
    });
  } catch (err) {
    // The most common failure is an invalid/retired model id — surface it
    // clearly so the fix (set ANTHROPIC_MODEL to a valid model) is obvious.
    const status =
      err && typeof err === "object" && "status" in err
        ? Number((err as { status: unknown }).status)
        : undefined;
    res.status(502).json({
      ...base,
      modelOk: false,
      latencyMs: Date.now() - started,
      upstreamStatus: status,
      error:
        err instanceof Error
          ? err.message
          : "The model request failed. Check the model id and API key.",
    });
  }
}
