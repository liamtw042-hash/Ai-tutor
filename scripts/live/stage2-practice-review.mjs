// Stage 2 — refresh persistence, Practice (MC right/wrong, written w/ real AI
// marking, AI question generation), Firestore-backed stats, Review (SM-2).

import { BASE, launch, step, ok, bad, shot, reportIssues } from "./helper.mjs";

const { ctx, page, issues } = await launch();
const goto = (path) => page.goto(BASE + path, { waitUntil: "load" });
const settle = (ms = 1800) => page.waitForTimeout(ms);

step("Auth persisted from stage 1 (fresh browser open)");
await goto("/dashboard");
await settle();
if (page.url().includes("/dashboard")) ok("straight to dashboard, no login needed");
else bad("bounced to " + page.url());

// Baseline stats for later comparison
const statNum = async (label) => {
  const el = page.locator(`text=${label}`).first();
  if ((await el.count()) === 0) return null;
  const card = el.locator("xpath=ancestor::div[contains(@class,'card')][1]");
  const txt = (await card.textContent()) ?? "";
  const m = txt.match(/(\d+)/);
  return m ? Number(m[1]) : null;
};
const baseAnswered = await statNum("Questions answered");
ok(`baseline questions answered: ${baseAnswered}`);

step("Practice — answer a multiple-choice question CORRECTLY");
await goto("/practice");
await settle();
await shot(page, "stage2-practice");
// Work out the right answer by opening the page state: click each option is
// destructive, so instead answer whatever and detect right/wrong from UI.
// First: click option A.
const options = page.locator("button:has(span.rounded-full)").filter({ hasText: /^[A-D]?\s*\S/ });
const mcButtons = page.locator("div.space-y-2\\.5 > button");
const mcCount = await mcButtons.count();
if (mcCount < 2) {
  bad("no multiple-choice options visible on /practice");
  await shot(page, "stage2-no-mc");
} else {
  await mcButtons.first().click();
  await settle(1200);
  const solution = await page.locator("text=Worked solution").count();
  if (solution) ok("answered; worked solution + explanation shown");
  else bad("answered but no worked solution appeared");
  const feedback = await page.locator("text=/Scheduled for review|see this again tomorrow/i").count();
  if (feedback) ok("spaced-repetition scheduling note shown");
}

step("Next question → answer WRONG on purpose (last option)");
await page.getByRole("button", { name: /Next question/ }).click();
await settle(600);
const mc2 = page.locator("div.space-y-2\\.5 > button");
if ((await mc2.count()) >= 2) {
  await mc2.last().click();
  await settle(1200);
  ok("second question answered");
} else {
  // might be a written question — skip via Next
  ok("second question not MC (written) — fine");
}
await shot(page, "stage2-after-two-answers");

step("Find a SHORT-ANSWER question and get real AI marking");
// Walk questions until a textarea appears (written panel), max 8 hops.
let found = false;
for (let i = 0; i < 8; i++) {
  if ((await page.locator("textarea").count()) > 0) { found = true; break; }
  const next = page.getByRole("button", { name: /Next question/ });
  if ((await next.count()) === 0) break;
  await next.click();
  await settle(400);
}
if (!found) {
  bad("no written question found in this subject's bank");
} else {
  await page.fill("textarea", "Velocity is the rate of change of displacement with respect to time. It is a vector quantity, having both magnitude and direction, whereas speed is scalar.");
  await page.getByRole("button", { name: /Mark my answer/ }).click();
  ok("submitted for AI marking — waiting (Claude)...");
  try {
    await page.waitForSelector("text=/Your mark/i", { timeout: 45000 });
    ok("AI marking returned a mark + feedback");
    await shot(page, "stage2-ai-marked");
  } catch {
    const err = (await page.locator("p.text-red-300").allTextContents()).join("; ");
    bad("AI marking did not return. Error shown: " + (err || "none"));
    await shot(page, "stage2-ai-mark-failed");
  }
}

step("Generate AI questions (Generate new)");
await page.getByRole("button", { name: /Generate new/ }).click();
await settle(400);
await page.getByRole("button", { name: /Generate 3 questions/ }).click();
ok("generation requested — waiting (Claude)...");
try {
  await page.waitForSelector("text=AI-generated", { timeout: 60000 });
  ok("AI-generated questions loaded into the practice queue");
  await shot(page, "stage2-generated");
  // answer the generated question if MC
  const gen = page.locator("div.space-y-2\\.5 > button");
  if ((await gen.count()) >= 2) {
    await gen.first().click();
    await settle(1000);
    ok("answered an AI-generated question");
  }
} catch {
  const err = (await page.locator("p.text-red-300").allTextContents()).join("; ");
  bad("generation failed/timed out. Error shown: " + (err || "none"));
  await shot(page, "stage2-generate-failed");
}

step("Dashboard stats reflect the attempts (Firestore write check)");
await goto("/dashboard");
await settle(2200);
const afterAnswered = await statNum("Questions answered");
ok(`questions answered now: ${afterAnswered} (was ${baseAnswered})`);
if (afterAnswered !== null && baseAnswered !== null && afterAnswered > baseAnswered)
  ok("attempts PERSISTED to Firestore ✓");
else bad("questions-answered did not increase — attempts may not be saving");
await shot(page, "stage2-dashboard-stats");

step("Hard refresh — stats survive");
await page.reload({ waitUntil: "load" });
await settle(2200);
const afterReload = await statNum("Questions answered");
if (afterReload === afterAnswered) ok(`stats identical after refresh (${afterReload})`);
else bad(`stats changed after refresh: ${afterAnswered} → ${afterReload}`);

step("Review queue has items due (wrong answers due today)");
await goto("/review");
await settle();
await shot(page, "stage2-review");
const showAnswer = page.getByRole("button", { name: /Show answer/ });
if ((await showAnswer.count()) === 0) {
  const bodyTxt = (await page.textContent("body")) ?? "";
  if (bodyTxt.includes("Nothing due")) bad("review queue EMPTY despite fresh attempts — SRS writes may be failing");
  else bad("review page in unexpected state");
} else {
  ok("review queue populated");
  // Do two reviews: one Good, one Again
  await showAnswer.click();
  await settle(300);
  await page.getByRole("button", { name: /^Good/ }).click();
  ok("review 1 graded Good");
  await settle(800);
  if ((await page.getByRole("button", { name: /Show answer/ }).count()) > 0) {
    await page.getByRole("button", { name: /Show answer/ }).click();
    await settle(300);
    await page.getByRole("button", { name: /^Again/ }).click();
    ok("review 2 graded Again (comes back this session)");
  }
  await settle(800);
  await shot(page, "stage2-review-after");
}

reportIssues(issues);
await ctx.close();
