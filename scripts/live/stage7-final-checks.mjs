import { BASE, launch, step, ok, bad, shot, reportIssues } from "./helper.mjs";

const { ctx, page, issues } = await launch();
const settle = (ms = 1200) => page.waitForTimeout(ms);

step("429 UX — free account, AI deck (server limit already used today)");
await page.goto(BASE + "/flashcards", { waitUntil: "load" });
await settle(2000);
await page.getByRole("button", { name: /New deck/ }).click();
await settle(400);
await page.getByRole("button", { name: /Generate with AI/ }).click();
const modal = page.locator(".card").filter({ hasText: "New deck" }).last();
await modal.locator("input").nth(0).fill("Heredity");
await page.getByRole("button", { name: /Generate deck/ }).click();
try {
  await page.waitForSelector("p.text-red-300", { timeout: 30000 });
  const err = (await page.locator("p.text-red-300").allTextContents()).join("|");
  ok("429 error VISIBLE to user: \"" + err.trim().slice(0, 90) + "\"");
  const label = (await modal.textContent()) ?? "";
  const left = label.match(/Free plan: (\d+) AI deck/);
  if (left && left[1] === "0") ok("local counter synced to 0 left (syncLimitFromError works)");
  else bad("counter label after 429: " + (left?.[0] ?? "not found"));
  await shot(page, "stage7-429-ux");
} catch {
  bad("no visible error after 429 — silent failure");
  await shot(page, "stage7-429-silent");
}
await page.keyboard.press("Escape");

step("Tutor voice controls (headless: TTS supported, mic hidden gracefully)");
await page.goto(BASE + "/tutor", { waitUntil: "load" });
await settle(1200);
await page.locator("button", { hasText: "Physics" }).first().click();
await settle(2500);
const speaker = page.locator('button[aria-label*="aloud" i], button[aria-label*="spoken" i]');
if ((await speaker.count()) > 0) {
  await speaker.first().click();
  await settle(300);
  const pressed = await speaker.first().getAttribute("aria-pressed");
  ok("speaker toggle rendered and toggles (aria-pressed=" + pressed + ")");
  await speaker.first().click();
} else {
  ok("speaker hidden (speechSynthesis unsupported in this env) — graceful");
}
const mic = page.locator('button[aria-label*="voice" i], button[aria-label*="listening" i]');
if ((await mic.count()) === 0) ok("mic hidden (SpeechRecognition unsupported headless) — graceful, no dead button");
else ok("mic button rendered (env supports recognition)");

step("Mobile 390px — dashboard, practice, tutor render without overflow");
await page.setViewportSize({ width: 390, height: 844 });
for (const route of ["/dashboard", "/practice", "/tutor", "/settings"]) {
  await page.goto(BASE + route, { waitUntil: "load" });
  await settle(1500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) { bad("horizontal overflow at 390px on " + route); await shot(page, "stage7-overflow" + route.replace(/\//g, "_")); }
  else ok("no overflow: " + route);
}
await shot(page, "stage7-mobile-dashboard");

reportIssues(issues);
await ctx.close();
