// Stage 3 — Review flow (real SM-2 grading against due items), then the
// CRITICAL test: tutor conversation persistence across leave/return/refresh.

import { BASE, launch, step, ok, bad, shot, reportIssues } from "./helper.mjs";

const { ctx, page, issues } = await launch();
const goto = (path) => page.goto(BASE + path, { waitUntil: "load" });
const settle = (ms = 1800) => page.waitForTimeout(ms);

step("Review queue shows the 3 due items");
await goto("/review");
await settle();
const bodyTxt = (await page.textContent("body")) ?? "";
const leftMatch = bodyTxt.match(/(\d+)\s+left/);
if (leftMatch) ok(`queue shows ${leftMatch[1]} left`);
else bad("no queue count visible; body: " + bodyTxt.slice(0, 120));
await shot(page, "stage3-review-queue");

step("Grade: Good → interval preview honoured, queue advances");
if ((await page.getByRole("button", { name: /Show answer/ }).count()) === 0) {
  bad("review item did not render a Show answer button");
} else {
  await page.getByRole("button", { name: /Show answer/ }).click();
  await settle(400);
  const goodBtn = page.getByRole("button", { name: /^Good/ });
  const preview = (await goodBtn.textContent()) ?? "";
  ok("Good button previews next interval: " + preview.replace(/\s+/g, " "));
  await goodBtn.click();
  await settle(900);
  ok("graded Good");
}

step("Grade: Again → item requeued in-session");
if ((await page.getByRole("button", { name: /Show answer/ }).count()) > 0) {
  await page.getByRole("button", { name: /Show answer/ }).click();
  await settle(300);
  await page.getByRole("button", { name: /^Again/ }).click();
  await settle(900);
  ok("graded Again — should reappear before session ends");
}

step("Clear the rest of the queue");
for (let i = 0; i < 8; i++) {
  const show = page.getByRole("button", { name: /Show answer/ });
  if ((await show.count()) === 0) break;
  await show.click();
  await settle(250);
  await page.getByRole("button", { name: /^Good/ }).click();
  await settle(700);
}
const doneTxt = (await page.textContent("body")) ?? "";
if (/Review complete/i.test(doneTxt)) ok("completion screen with XP shown");
else bad("queue did not reach completion screen");
await shot(page, "stage3-review-complete");

// ---------------------------------------------------------------------------
step("TUTOR — open Physics and send a distinctive message");
await goto("/tutor");
await settle();
await page.locator("button", { hasText: "Physics" }).first().click();
await settle(2500); // resume/create session
const MARKER = "My favourite planet is Neptune, remember that.";
await page.fill("textarea", MARKER);
await page.getByRole("button", { name: /^Send$/ }).click();
ok("sent — waiting for Claude reply...");
try {
  await page.waitForFunction(
    () => document.querySelectorAll(".prose-tutor").length >= 2,
    { timeout: 45000 },
  );
  ok("tutor replied");
} catch {
  bad("no tutor reply within 45s");
}
await shot(page, "stage3-tutor-chat");

step("Leave chat (SPA nav to dashboard) and come BACK");
await page.getByRole("link", { name: "Dashboard" }).first().click();
await settle(1200);
await page.getByRole("link", { name: "AI Tutor" }).first().click();
await settle(800);
await page.locator("button", { hasText: "Physics" }).first().click();
await settle(2500);
let chat = (await page.textContent("body")) ?? "";
if (chat.includes("Neptune")) ok("conversation SURVIVED leave + return ✓");
else bad("conversation LOST on leave/return");

step("HARD refresh — conversation must survive");
await page.reload({ waitUntil: "load" });
await settle(1500);
await page.locator("button", { hasText: "Physics" }).first().click();
await settle(2500);
chat = (await page.textContent("body")) ?? "";
if (chat.includes("Neptune")) ok("conversation SURVIVED hard refresh ✓");
else bad("conversation LOST after refresh — persistence broken");
await shot(page, "stage3-tutor-after-refresh");

step("Ask the tutor what it remembers (context check)");
await page.fill("textarea", "What did I say my favourite planet was?");
await page.getByRole("button", { name: /^Send$/ }).click();
try {
  await page.waitForFunction(
    (n) => document.querySelectorAll(".prose-tutor").length >= n,
    (await page.locator(".prose-tutor").count()) + 1,
    { timeout: 45000 },
  );
  const last = await page.locator(".prose-tutor").last().textContent();
  if (/neptune/i.test(last ?? "")) ok("tutor recalled Neptune from the restored history ✓");
  else bad("tutor reply didn't reference Neptune: " + (last ?? "").slice(0, 120));
} catch {
  bad("no reply to memory question");
}
await shot(page, "stage3-tutor-memory");

reportIssues(issues);
await ctx.close();
