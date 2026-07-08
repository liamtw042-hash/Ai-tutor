// Shared harness for the live browser audit. Persistent profile so Firebase
// auth (IndexedDB) survives across stage scripts — which also lets us test
// "close and reopen" persistence for real.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const BASE = "http://localhost:5173";
export const OUT = join(dirname(fileURLToPath(import.meta.url)), "out");
mkdirSync(OUT, { recursive: true });

export const CREDS = {
  name: "Audit Tester",
  email: "smaudit1@example.com",
  password: "AuditPass!234",
};

export async function launch({ viewport } = {}) {
  const ctx = await chromium.launchPersistentContext(
    join(dirname(fileURLToPath(import.meta.url)), ".chrome-profile"),
    {
      viewport: viewport ?? { width: 1440, height: 900 },
      colorScheme: "dark",
    },
  );
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  const issues = [];
  page.on("console", (m) => {
    if (m.type() === "error") issues.push({ kind: "console.error", text: m.text() });
    if (m.type() === "warning") issues.push({ kind: "console.warn", text: m.text() });
  });
  page.on("pageerror", (e) => issues.push({ kind: "pageerror", text: e.message }));
  page.on("response", async (r) => {
    if (r.status() >= 400) {
      let body = "";
      try {
        body = (await r.text()).slice(0, 200);
      } catch { /* ignore */ }
      issues.push({ kind: `http ${r.status()}`, text: `${r.request().method()} ${r.url()} ${body}` });
    }
  });
  page.on("requestfailed", (r) =>
    issues.push({ kind: "requestfailed", text: `${r.method()} ${r.url()} ${r.failure()?.errorText}` }),
  );

  return { ctx, page, issues };
}

let stepN = 0;
export function step(name) {
  stepN += 1;
  console.log(`\n--- [${stepN}] ${name}`);
}

export function ok(msg) {
  console.log(`    ✓ ${msg}`);
}

export function bad(msg) {
  console.log(`    ✗ ISSUE: ${msg}`);
}

export async function shot(page, name) {
  await page.screenshot({ path: join(OUT, name + ".png"), fullPage: true });
}

export function reportIssues(issues) {
  const interesting = issues.filter(
    (i) =>
      // Firestore/gRPC streams legitimately abort on navigation; ignore noise.
      !i.text.includes("net::ERR_ABORTED") || !i.text.includes("google.firestore"),
  );
  console.log(`\n=== captured ${interesting.length} runtime issue(s) ===`);
  for (const i of interesting.slice(0, 40)) console.log(`  [${i.kind}] ${i.text.slice(0, 220)}`);
  return interesting;
}
