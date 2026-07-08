// Stage 4 — Essay feedback (real AI, saved history) and Flashcards
// (manual deck, AI-generated deck, flip/write/match study modes).

import { BASE, launch, step, ok, bad, shot, reportIssues } from "./helper.mjs";

const { ctx, page, issues } = await launch();
const goto = (p) => page.goto(BASE + p, { waitUntil: "load" });
const settle = (ms = 1200) => page.waitForTimeout(ms);

const ESSAY = `The individual and collective human experiences in Kenneth Slessor's poetry reveal the paradoxes of memory and time. In "Five Bells", Slessor grapples with the inadequacy of memory to resurrect the dead, as the persona attempts to reconstruct Joe Lynch from fragmented recollections. The tolling of the bells becomes a motif for time's indifference to human grief. Slessor's use of water imagery — "the harbour floats in air" — blurs the boundary between the living world and remembered one, suggesting memory itself is fluid and unreliable. Ultimately the poem's elegiac tone concedes that language cannot fully recover lived experience, yet the act of writing becomes its own form of remembrance, an anomaly of the human condition: we memorialise precisely because we forget.`;

step("Essay — submit for AI marking");
await goto("/essay");
await settle();
await shot(page, "stage4-essay-page");
// Subject select: choose English Advanced
const selects = page.locator("select");
await selects.first().selectOption({ label: "English Advanced" }).catch(async () => {
  bad("could not select English Advanced in subject dropdown");
});
const textareas = page.locator("textarea");
const taCount = await textareas.count();
// last textarea = essay body (first may be optional question)
if (taCount >= 2) {
  await textareas.first().fill("How does Slessor represent individual and collective human experiences? (Common Module)");
}
await textareas.last().fill(ESSAY);
await page.getByRole("button", { name: /Mark my response/ }).click();
ok("submitted — waiting for AI marking...");
try {
  await page.waitForSelector("text=/Estimated band|Band/i", { timeout: 60000 });
  await settle(800);
  const fb = (await page.textContent("body")) ?? "";
  ok("marking returned; band shown");
  for (const crit of ["Thesis", "Evidence", "Analysis", "Expression"]) {
    if (fb.includes(crit)) ok(`criterion present: ${crit}`);
    else bad(`criterion missing: ${crit}`);
  }
  await shot(page, "stage4-essay-marked");
} catch {
  const err = (await page.locator("p.text-red-300").allTextContents()).join("; ");
  bad("essay marking failed: " + (err || "timeout"));
  await shot(page, "stage4-essay-failed");
}

step("Essay history — reload page, history strip shows the record");
await page.reload({ waitUntil: "load" });
await settle(2500);
const histBody = (await page.textContent("body")) ?? "";
if (/recent essays/i.test(histBody)) ok("essay history strip rendered after reload (persisted)");
else bad("no essay history after reload — record may not have saved");
await shot(page, "stage4-essay-history");

// ---------------------------------------------------------------------------
step("Flashcards — create MANUAL deck");
await goto("/flashcards");
await settle();
await page.getByRole("button", { name: /New deck/ }).click();
await settle(400);
await page.getByRole("button", { name: /Build manually/ }).click();
const modal = page.locator(".card").filter({ hasText: "New deck" }).last();
await modal.locator("select").selectOption({ label: "Physics" }).catch(() => bad("subject select failed in deck modal"));
await modal.locator('input[list="topic-suggestions"], input').nth(0).fill("Advanced Mechanics");
await page.getByRole("button", { name: /Create empty deck/ }).click();
await settle(2500);
let body = (await page.textContent("body")) ?? "";
if (/Advanced Mechanics/.test(body)) ok("manual deck created and opened");
else bad("manual deck did not open");
await shot(page, "stage4-deck-manual");

step("Add two cards manually");
const fronts = ["What is the formula for centripetal acceleration?", "State Newton's second law in vector form."];
const backs = ["a = v² / r, directed toward the centre of the circle.", "ΣF = ma — net force equals mass times acceleration."];
for (let i = 0; i < 2; i++) {
  await page.locator('textarea[placeholder*="Front"]').fill(fronts[i]);
  await page.locator('textarea[placeholder*="Back"]').fill(backs[i]);
  await page.getByRole("button", { name: /Add card/ }).click();
  await settle(1200);
}
body = (await page.textContent("body")) ?? "";
if (body.includes(fronts[0]) && body.includes(fronts[1])) ok("both cards added and listed");
else bad("cards missing from list after add");

step("Study FLIP mode (self-grade feeds SRS)");
await page.getByRole("button", { name: /^Flip/ }).click();
await settle(600);
for (let i = 0; i < 2; i++) {
  await page.getByRole("button", { name: /Show answer/ }).click();
  await settle(400);
  await page.getByRole("button", { name: /Got it/ }).click();
  await settle(800);
}
body = (await page.textContent("body")) ?? "";
if (/Deck complete/i.test(body)) ok("flip session completed with XP");
else bad("flip session did not complete");
await page.getByRole("button", { name: /Back to deck/ }).click();
await settle(600);

step("Study WRITE mode");
await page.getByRole("button", { name: /^Write/ }).click();
await settle(600);
for (let i = 0; i < 2; i++) {
  await page.locator('textarea[placeholder*="memory"]').fill("my attempt at the answer");
  await page.getByRole("button", { name: /Check my answer/ }).click();
  await settle(400);
  await page.getByRole("button", { name: /nailed it/ }).click();
  await settle(800);
}
body = (await page.textContent("body")) ?? "";
if (/Deck complete/i.test(body)) ok("write session completed");
else bad("write session did not complete");
await page.getByRole("button", { name: /Back to deck/ }).click();
await settle(600);

step("MATCH mode needs 3+ cards — add one more, then play");
await page.locator('textarea[placeholder*="Front"]').fill("Define impulse.");
await page.locator('textarea[placeholder*="Back"]').fill("Impulse = FΔt = Δp (change in momentum).");
await page.getByRole("button", { name: /Add card/ }).click();
await settle(1200);
await page.getByRole("button", { name: /^Match/ }).click();
await settle(800);
// Brute-force the match game: try tile pairs until all matched.
const tiles = page.locator("button.min-h-\\[92px\\]");
const n = await tiles.count();
ok(`match grid rendered with ${n} tiles`);
// naive O(n²) pairing
for (let a = 0; a < n; a++) {
  for (let b = 0; b < n; b++) {
    if (a === b) continue;
    const ta = tiles.nth(a);
    const tb = tiles.nth(b);
    if (!(await ta.isEnabled().catch(() => false))) break;
    if (!(await tb.isEnabled().catch(() => false))) continue;
    await ta.click().catch(() => {});
    await tb.click().catch(() => {});
    await page.waitForTimeout(500);
    if (/\ds/.test((await page.textContent("body")) ?? "") && (await page.getByRole("button", { name: /Back to deck/ }).count()) > 0) break;
  }
  if ((await page.getByRole("button", { name: /Back to deck/ }).count()) > 0) break;
}
body = (await page.textContent("body")) ?? "";
if ((await page.getByRole("button", { name: /Back to deck/ }).count()) > 0 && /pairs matched/i.test(body)) {
  ok("match game completed");
  await page.getByRole("button", { name: /Back to deck/ }).click();
  await settle(500);
} else {
  bad("match game did not reach completion");
  await shot(page, "stage4-match-stuck");
  await goto("/flashcards");
  await settle();
}

step("Create AI-GENERATED deck (real Claude)");
await goto("/flashcards");
await settle();
await page.getByRole("button", { name: /New deck/ }).click();
await settle(400);
await page.getByRole("button", { name: /Generate with AI/ }).click();
const modal2 = page.locator(".card").filter({ hasText: "New deck" }).last();
await modal2.locator("select").selectOption({ label: "English Advanced" }).catch(() => {});
await modal2.locator('input[list="topic-suggestions"], input').nth(0).fill("Common Module: Texts and Human Experiences");
await page.getByRole("button", { name: /Generate deck/ }).click();
ok("AI deck requested — waiting...");
try {
  await page.waitForSelector("text=/card\\b/i", { timeout: 90000 });
  await settle(2500);
  body = (await page.textContent("body")) ?? "";
  const m = body.match(/(\d+)\s+cards?/);
  if (m && Number(m[1]) >= 5) ok(`AI deck created with ${m[1]} cards`);
  else bad("AI deck created but card count unclear");
  await shot(page, "stage4-ai-deck");
} catch {
  const err = (await page.locator("p.text-red-300").allTextContents()).join("; ");
  bad("AI deck generation failed: " + (err || "timeout"));
  await shot(page, "stage4-ai-deck-failed");
}

step("Decks persist after reload");
await goto("/flashcards");
await settle(2500);
body = (await page.textContent("body")) ?? "";
if (/Advanced Mechanics/.test(body)) ok("manual deck persisted");
else bad("manual deck missing after reload");
if (/Human Experiences/.test(body)) ok("AI deck persisted");
else bad("AI deck missing after reload");
await shot(page, "stage4-decks-list");

reportIssues(issues);
await ctx.close();
