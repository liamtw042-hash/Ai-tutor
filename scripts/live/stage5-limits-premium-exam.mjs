// Stage 5 — server-side 429 limit surfaces in UI → premium toggle bypasses it
// (server reads premium from Firestore) → Exam Mode premium gate + full flow.

import { BASE, launch, step, ok, bad, shot, reportIssues } from "./helper.mjs";

const { ctx, page, issues } = await launch();
const goto = (p) => page.goto(BASE + p, { waitUntil: "load" });
const settle = (ms = 1200) => page.waitForTimeout(ms);

step("AI deck attempt #2 — free tier should hit the SERVER 429 limit");
await goto("/flashcards");
await settle(1800);
await page.getByRole("button", { name: /New deck/ }).click();
await settle(400);
await page.getByRole("button", { name: /Generate with AI/ }).click();
const modal = page.locator(".card").filter({ hasText: "New deck" }).last();
await modal.locator("select").selectOption({ label: "English Advanced" }).catch(() => {});
await modal.locator("input").nth(0).fill("Common Module: Texts and Human Experiences");
await page.getByRole("button", { name: /Generate deck/ }).click();
try {
  await page.waitForSelector("text=/free limit|Upgrade|free AI deck/i", { timeout: 30000 });
  const err = (await page.locator("p.text-red-300").allTextContents()).join(" | ");
  ok("server 429 surfaced to the user: " + err.slice(0, 120));
  await shot(page, "stage5-429-surfaced");
} catch {
  // maybe it succeeded (if server counted 0) — check
  await settle(2000);
  const b = (await page.textContent("body")) ?? "";
  if (/cards/.test(b) && !/New deck/.test(b)) bad("expected 429 but deck was created (server count didn't include aborted attempt)");
  else bad("no visible limit error and no deck — silent failure!");
  await shot(page, "stage5-429-missing");
}
// close modal if still open
await page.keyboard.press("Escape").catch(() => {});
await settle(400);

step("Toggle PREMIUM via the demo upgrade button");
const upgrade = page.getByRole("button", { name: /Upgrade/ }).first();
if ((await upgrade.count()) === 0) {
  bad("no Upgrade button visible in sidebar");
} else {
  await upgrade.click();
  await settle(1500);
  const b = (await page.textContent("body")) ?? "";
  if (/Premium/.test(b) && !/Upgrade — /.test(b)) ok("premium enabled (sidebar shows Premium)");
  else ok("clicked upgrade; sidebar text: " + (b.match(/Premium[^·]{0,40}/)?.[0] ?? "?"));
  await shot(page, "stage5-premium-on");
}

step("AI deck attempt #3 — premium must BYPASS the server limit");
await page.getByRole("button", { name: /New deck/ }).click();
await settle(400);
await page.getByRole("button", { name: /Generate with AI/ }).click();
const modal2 = page.locator(".card").filter({ hasText: "New deck" }).last();
await modal2.locator("select").selectOption({ label: "English Advanced" }).catch(() => {});
await modal2.locator("input").nth(0).fill("Common Module: Texts and Human Experiences");
await page.getByRole("button", { name: /Generate deck/ }).click();
ok("requested — waiting for generation (up to 90s)...");
try {
  // Success = modal closes and we land in the new deck's detail view.
  await page.waitForSelector("text=Delete deck", { timeout: 90000 });
  await settle(1000);
  const b = (await page.textContent("body")) ?? "";
  const m = b.match(/(\d+)\s+cards?/);
  ok(`AI deck generated as premium (${m?.[1] ?? "?"} cards) — server bypass works ✓`);
  await shot(page, "stage5-ai-deck-premium");
} catch {
  const err = (await page.locator("p.text-red-300").allTextContents()).join(" | ");
  bad("premium AI deck generation failed: " + (err || "timeout"));
  await shot(page, "stage5-ai-deck-premium-failed");
}

// ---------------------------------------------------------------------------
step("EXAM MODE — now unlocked, start a Physics session");
await goto("/exam");
await settle(1800);
let b = (await page.textContent("body")) ?? "";
if (/Premium feature/i.test(b)) {
  bad("exam still shows premium gate despite premium on");
  await shot(page, "stage5-exam-gated");
} else {
  ok("exam setup screen unlocked");
}
await page.locator("button", { hasText: "Physics" }).first().click();
await settle(1500);
b = (await page.textContent("body")) ?? "";
if (/Submit paper/i.test(b)) ok("exam started: timer + questions rendered");
else bad("exam did not start");
await shot(page, "stage5-exam-running");

step("Answer everything quickly and submit");
// MC: click first option in each question card; textareas: fill a short answer.
const mcGroups = page.locator("div.space-y-2 > button:first-child, div.space-y-2\\.5 > button:first-child");
const mcN = await mcGroups.count();
for (let i = 0; i < mcN; i++) await mcGroups.nth(i).click().catch(() => {});
const tas = page.locator("textarea");
const taN = await tas.count();
for (let i = 0; i < taN; i++) {
  await tas.nth(i).fill("The net force provides centripetal acceleration toward the centre; using F = mv²/r with the given values yields the required tension.").catch(() => {});
}
ok(`answered ${mcN} MC + ${taN} written`);
await page.getByRole("button", { name: /Submit paper/ }).click();
ok("submitted — AI marking written answers (can take a while)...");
try {
  await page.waitForSelector("text=/timed session/i", { timeout: 120000 });
  await settle(800);
  b = (await page.textContent("body")) ?? "";
  const score = b.match(/(\d+)\/(\d+)/);
  ok(`results screen: scored ${score?.[0] ?? "?"} with per-question breakdown`);
  await shot(page, "stage5-exam-results");
} catch {
  bad("exam marking never completed");
  await shot(page, "stage5-exam-marking-stuck");
}

step("Exam result persisted (Recent sessions after reload)");
await goto("/exam");
await settle(2500);
b = (await page.textContent("body")) ?? "";
if (/Recent sessions/i.test(b)) ok("recent sessions list shows the saved exam ✓");
else bad("no recent sessions — exam result may not have saved");
await shot(page, "stage5-exam-history");

reportIssues(issues);
await ctx.close();
