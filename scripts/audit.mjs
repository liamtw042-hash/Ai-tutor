// Runtime browser audit for StudyMate.
// Loads every route at desktop (1440) and mobile (390), capturing console
// errors/warnings, failed network requests, horizontal overflow, elements
// escaping the viewport, and low-contrast / invisible inputs. Writes a JSON
// report + screenshots to scripts/audit-out/.
//
// Usage: node scripts/audit.mjs [baseURL]   (default http://localhost:5173)

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.argv[2] || "http://localhost:5173";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "audit-out");
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  "/",
  "/login",
  "/signup",
  "/onboarding",
  "/dashboard",
  "/review",
  "/practice",
  "/flashcards",
  "/tutor",
  "/upload",
  "/essay",
  "/exam",
  "/planner",
  "/progress",
  "/settings",
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

// Runs inside the page. Finds layout + contrast problems.
function inPageChecks() {
  const vw = window.innerWidth;
  const problems = { overflowX: false, offscreen: [], contrast: [] };

  problems.overflowX =
    document.documentElement.scrollWidth > window.innerWidth + 1;

  const selectorFor = (el) => {
    if (el.id) return `#${el.id}`;
    const cls = (el.className || "")
      .toString()
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join(".");
    return el.tagName.toLowerCase() + (cls ? "." + cls : "");
  };

  const visible = (el, r) => {
    const s = getComputedStyle(el);
    return (
      r.width > 1 &&
      r.height > 1 &&
      s.visibility !== "hidden" &&
      s.display !== "none" &&
      Number(s.opacity) > 0.05
    );
  };

  // Elements escaping the viewport horizontally.
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (!visible(el, r)) continue;
    if (r.right > vw + 2 || r.left < -2) {
      const s = selectorFor(el);
      if (!problems.offscreen.includes(s)) problems.offscreen.push(s);
      if (problems.offscreen.length > 25) break;
    }
  }

  // Contrast — parse rgb, compute relative luminance + WCAG contrast ratio.
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a] = m[1].split(",").map((x) => parseFloat(x));
    return { r, g, b, a: a === undefined ? 1 : a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const la = lum(a);
    const lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const effectiveBg = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const bg = parse(getComputedStyle(node).backgroundColor);
      if (bg && bg.a > 0.5) return bg;
      node = node.parentElement;
    }
    return { r: 10, g: 10, b: 18, a: 1 }; // page bg (ink-950)
  };

  for (const el of document.querySelectorAll(
    "input, textarea, select, button, a, p, h1, h2, h3, label, span",
  )) {
    const r = el.getBoundingClientRect();
    if (!visible(el, r)) continue;
    if (!el.textContent?.trim() && !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
      continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg || fg.a < 0.3) continue;
    const bg = effectiveBg(el);
    const cr = ratio(fg, bg);
    // Flag anything below the WCAG AA large-text floor (3:1); text this low is
    // hard or impossible to read.
    if (cr < 3) {
      problems.contrast.push({
        sel: selectorFor(el),
        ratio: Math.round(cr * 100) / 100,
        color: cs.color,
        tag: el.tagName.toLowerCase(),
        sample: (el.textContent || el.getAttribute("placeholder") || "").trim().slice(0, 30),
      });
    }
    // Also check placeholder text specifically for inputs.
    if (["INPUT", "TEXTAREA"].includes(el.tagName)) {
      const ph = getComputedStyle(el, "::placeholder");
      const pfg = parse(ph.color);
      if (pfg && pfg.a > 0.3) {
        const pcr = ratio(pfg, effectiveBg(el));
        if (pcr < 1.8) {
          problems.contrast.push({
            sel: selectorFor(el) + "::placeholder",
            ratio: Math.round(pcr * 100) / 100,
            color: ph.color,
            tag: "placeholder",
            sample: el.getAttribute("placeholder")?.slice(0, 30) || "",
          });
        }
      }
    }
    if (problems.contrast.length > 40) break;
  }

  return problems;
}

const report = [];

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    colorScheme: "dark",
    deviceScaleFactor: 1,
  });
  for (const route of ROUTES) {
    const page = await context.newPage();
    const consoleErrors = [];
    const consoleWarnings = [];
    const failedRequests = [];

    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === "error") consoleErrors.push(text);
      else if (type === "warning") consoleWarnings.push(text);
    });
    page.on("pageerror", (err) => consoleErrors.push("[pageerror] " + err.message));
    page.on("requestfailed", (req) => {
      const f = req.failure();
      failedRequests.push(`${req.method()} ${req.url()} — ${f?.errorText ?? "failed"}`);
    });
    page.on("response", (res) => {
      if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
    });

    let checks = null;
    let loadError = null;
    try {
      await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(700); // let animations/settle
      checks = await page.evaluate(inPageChecks);
      await page.screenshot({
        path: join(OUT, `${vp.name}${route.replace(/\//g, "_") || "_root"}.png`),
        fullPage: true,
      });
    } catch (err) {
      loadError = err.message;
    }

    report.push({
      route,
      viewport: vp.name,
      loadError,
      consoleErrors: [...new Set(consoleErrors)],
      consoleWarnings: [...new Set(consoleWarnings)],
      failedRequests: [...new Set(failedRequests)].filter(
        // /api/* failures are expected under plain `vite dev` (no serverless).
        (u) => !u.includes("/api/"),
      ),
      apiFailures: [...new Set(failedRequests)].filter((u) => u.includes("/api/")).length,
      overflowX: checks?.overflowX ?? null,
      offscreen: checks?.offscreen ?? [],
      contrast: checks?.contrast ?? [],
    });
    await page.close();
  }
  await context.close();
}
await browser.close();

writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));

// Console summary
let issues = 0;
for (const r of report) {
  const flags = [];
  if (r.loadError) flags.push(`LOAD ERROR: ${r.loadError}`);
  if (r.consoleErrors.length) flags.push(`${r.consoleErrors.length} console error(s)`);
  if (r.consoleWarnings.length) flags.push(`${r.consoleWarnings.length} warning(s)`);
  if (r.failedRequests.length) flags.push(`${r.failedRequests.length} failed request(s)`);
  if (r.overflowX) flags.push("HORIZONTAL OVERFLOW");
  if (r.offscreen.length) flags.push(`${r.offscreen.length} offscreen el(s)`);
  if (r.contrast.length) flags.push(`${r.contrast.length} low-contrast`);
  if (flags.length) {
    issues++;
    console.log(`\n[${r.viewport}] ${r.route}`);
    for (const f of flags) console.log("   - " + f);
    if (r.consoleErrors.length)
      r.consoleErrors.slice(0, 4).forEach((e) => console.log("       err: " + e.slice(0, 160)));
    if (r.overflowX || r.offscreen.length)
      r.offscreen.slice(0, 6).forEach((s) => console.log("       offscreen: " + s));
    if (r.contrast.length)
      r.contrast.slice(0, 6).forEach((c) =>
        console.log(`       contrast ${c.ratio} ${c.tag} "${c.sample}" (${c.color}) ${c.sel}`),
      );
  }
}
console.log(`\n\n=== ${issues} route/viewport combos with issues out of ${report.length} ===`);
console.log("Full report: scripts/audit-out/report.json");
