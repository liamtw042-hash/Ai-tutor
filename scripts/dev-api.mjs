// Local runtime for the Vercel serverless functions in api/.
// `vite dev` only serves the SPA; this runs the real handlers on :3001 with a
// minimal Vercel-compatible req/res adapter, and vite proxies /api → here.
//
// Usage: npx tsx scripts/dev-api.mjs   (tsx resolves the .ts handlers)

import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Load .env.local into process.env (node doesn't do this automatically).
try {
  const env = readFileSync(join(ROOT, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {
  console.warn("[dev-api] no .env.local found");
}

// Import every non-underscore api/*.ts handler.
const handlers = {};
for (const f of readdirSync(join(ROOT, "api"))) {
  if (!f.endsWith(".ts") || f.startsWith("_")) continue;
  const name = f.replace(/\.ts$/, "");
  const mod = await import(join(ROOT, "api", f));
  handlers[name] = mod.default;
}
console.log("[dev-api] loaded:", Object.keys(handlers).join(", "));

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const name = url.pathname.replace(/^\/api\//, "").replace(/\/$/, "");
  const handler = handlers[name];
  if (!handler) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `No such function: ${name}` }));
    return;
  }

  // Collect body (Vercel pre-parses JSON bodies).
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  let body = raw;
  if ((req.headers["content-type"] || "").includes("application/json") && raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      /* leave as string; readBody() in _lib handles it */
    }
  }

  // Vercel-style request/response adapter.
  const vreq = Object.assign(req, {
    body,
    query: Object.fromEntries(url.searchParams.entries()),
    cookies: {},
  });
  const vres = Object.assign(res, {
    status(code) {
      res.statusCode = code;
      return vres;
    },
    json(obj) {
      if (!res.headersSent) res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(obj));
      return vres;
    },
    send(data) {
      res.end(typeof data === "string" ? data : JSON.stringify(data));
      return vres;
    },
  });

  try {
    await handler(vreq, vres);
    if (!res.writableEnded) res.end();
  } catch (err) {
    console.error(`[dev-api] ${name} crashed:`, err);
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

const PORT = Number(process.env.DEV_API_PORT || 3001);
server.listen(PORT, () => console.log(`[dev-api] http://localhost:${PORT}/api/*`));
