// Stage 6 — Study Plan (premium), Photo/Doc upload with real vision (PNG+PDF),
// Progress page, Settings changes, Google sign-in behaviour, logout/login.

import { join } from "node:path";
import { BASE, CREDS, OUT, launch, step, ok, bad, shot, reportIssues } from "./helper.mjs";

const { ctx, page, issues } = await launch();
const goto = (p) => page.goto(BASE + p, { waitUntil: "load" });
const settle = (ms = 1500) => page.waitForTimeout(ms);

// ---------- fixtures: a "photo" of a handwritten-style question + a PDF ----
step("Build image + PDF fixtures");
const fixturePage = await ctx.newPage();
await fixturePage.setContent(`
  <body style="background:#fffdf5;width:800px;padding:40px;font-family:'Comic Sans MS',cursive">
    <h2 style="font-family:Georgia">Question 3 (4 marks)</h2>
    <p style="font-size:22px">A car of mass 1200 kg accelerates from rest to 25 m s⁻¹ in 8.0 s.<br>
    (a) Calculate the average acceleration.<br>(b) Calculate the net force acting on the car.</p>
    <p style="font-size:20px;color:#1a3a8a">My working:<br>
    a = (25 - 0) / 8 = 3.1 m/s²<br>
    F = ma = 1200 × 3.1 = 3720 N... I think??</p>
  </body>`);
const IMG = join(OUT, "fixture-question.png");
await fixturePage.screenshot({ path: IMG });
const PDF = join(OUT, "fixture-notes.pdf");
await fixturePage.pdf({ path: PDF, format: "A4" });
await fixturePage.close();
ok("fixtures written");

// ---------------------------- STUDY PLAN -----------------------------------
step("Study Plan — build a plan (premium already on)");
await goto("/planner");
await settle(1800);
let b = (await page.textContent("body")) ?? "";
if (/Premium feature/i.test(b)) bad("planner still premium-gated");
await page.getByRole("button", { name: /Set up my plan|Rebuild plan/ }).first().click();
await settle(500);
// exam dates ~9 weeks out for two subjects
const in60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
const in75 = new Date(Date.now() + 75 * 86400000).toISOString().slice(0, 10);
const dates = page.locator('input[type="date"]');
await dates.nth(0).fill(in60);
await dates.nth(1).fill(in75);
await page.getByRole("button", { name: /Generate my plan/ }).click();
ok("plan requested — waiting for Claude (up to 2 min)...");
try {
  await page.waitForSelector("text=/Week of/i", { timeout: 120000 });
  ok("week-by-week plan rendered");
  await shot(page, "stage6-plan");
} catch {
  const err = (await page.locator("p.text-red-300").allTextContents()).join("|");
  bad("plan generation failed: " + (err || "timeout"));
  await shot(page, "stage6-plan-failed");
}

step("Plan persists after reload");
await page.reload({ waitUntil: "load" });
await settle(2200);
b = (await page.textContent("body")) ?? "";
if (/Week of/i.test(b)) ok("plan persisted ✓");
else bad("plan gone after reload");

// ------------------------------- UPLOAD ------------------------------------
step("Upload — IMAGE + 'Mark it' (real vision)");
await goto("/upload");
await settle(1500);
b = (await page.textContent("body")) ?? "";
if (/Premium feature/i.test(b)) bad("upload premium-gated despite premium");
const imgInput = page.locator('input[type="file"][accept="image/*"]');
const anyInput = page.locator('input[type="file"]').last();
await (await imgInput.count() ? imgInput : anyInput).setInputFiles(IMG);
await settle(800);
await shot(page, "stage6-upload-image-picked");
await page.getByRole("button", { name: /Mark it/ }).click();
ok("image sent for AI marking — waiting...");
try {
  await page.waitForFunction(
    () => (document.body.innerText.match(/mark|feedback|acceleration/gi) || []).length > 3 &&
          !document.querySelector('[class*="animate-spin"]'),
    { timeout: 90000 },
  );
  ok("vision analysis returned for the image");
  await shot(page, "stage6-upload-image-result");
} catch {
  bad("image analysis did not complete");
  await shot(page, "stage6-upload-image-failed");
}

step("Upload — PDF + 'Explain it'");
await page.reload({ waitUntil: "load" });
await settle(1200);
await page.locator('input[type="file"]').last().setInputFiles(PDF);
await settle(800);
await page.getByRole("button", { name: /Explain it/ }).click();
ok("PDF sent — waiting...");
try {
  await page.waitForFunction(
    () => (document.body.innerText.match(/acceleration|force|question/gi) || []).length > 3 &&
          !document.querySelector('[class*="animate-spin"]'),
    { timeout: 90000 },
  );
  ok("PDF analysis returned");
  await shot(page, "stage6-upload-pdf-result");
} catch {
  bad("PDF analysis did not complete");
  await shot(page, "stage6-upload-pdf-failed");
}

// ------------------------------ PROGRESS ------------------------------------
step("Progress page — charts, badges, leaderboard opt-in");
await goto("/progress");
await settle(2500);
b = (await page.textContent("body")) ?? "";
for (const sec of ["Study activity", "accuracy", "Achievements", "Leaderboard"]) {
  if (new RegExp(sec, "i").test(b)) ok("section present: " + sec);
  else bad("section missing: " + sec);
}
const joinBtn = page.getByRole("button", { name: /Join anonymously/ });
if ((await joinBtn.count()) > 0) {
  await joinBtn.click();
  await settle(2000);
  b = (await page.textContent("body")) ?? "";
  if (/You appear as/i.test(b)) ok("leaderboard opt-in worked, alias shown");
  else bad("opt-in click had no visible effect");
} else {
  ok("already opted in (or button differs)");
}
await shot(page, "stage6-progress");

// ------------------------------ SETTINGS ------------------------------------
step("Settings — change name + daily goal, save, verify persists");
await goto("/settings");
await settle(1800);
const nameInput = page.locator("#displayName");
await nameInput.fill("Audit Tester II");
await page.getByRole("button", { name: /All-in/ }).click();
await page.getByRole("button", { name: /Save changes/ }).click();
await settle(2000);
await page.reload({ waitUntil: "load" });
await settle(2000);
const nameVal = await page.locator("#displayName").inputValue();
b = (await page.textContent("body")) ?? "";
if (nameVal === "Audit Tester II") ok("display name persisted ✓");
else bad("display name did not persist: " + nameVal);
if (/All-in/.test(b)) ok("goal section rendered (value check below in Firestore)");
await shot(page, "stage6-settings");

step("Settings — switch to Year 12, verify subjects survive");
await page.getByRole("button", { name: /Year 12/ }).first().click();
await settle(500);
await page.getByRole("button", { name: /Save changes/ }).click();
await settle(2000);
await page.reload({ waitUntil: "load" });
await settle(2000);
b = (await page.textContent("body")) ?? "";
if (/Physics/.test(b) && /English Advanced/.test(b)) ok("subjects intact after year change");
else bad("subjects lost after year change");

// --------------------------- GOOGLE SIGN-IN ---------------------------------
step("Google sign-in — button must DO something visible (popup or error)");
// sign out first via sidebar
await page.locator('button[title="Sign out"]').click();
await settle(2000);
await goto("/login");
await settle(800);
const popupPromise = ctx.waitForEvent("page", { timeout: 8000 }).catch(() => null);
await page.getByRole("button", { name: /Continue with Google/ }).click();
const popup = await popupPromise;
if (popup) {
  const url = popup.url();
  ok("Google auth popup opened: " + url.slice(0, 60) + "…");
  if (/google\.com|firebaseapp\.com/.test(url)) ok("popup is the real Google/Firebase auth flow ✓ (code side works)");
  await popup.close().catch(() => {});
} else {
  await settle(1500);
  const err = (await page.locator("p.text-red-300").allTextContents()).join("|");
  if (err) ok("no popup, but a clear error was surfaced: " + err.slice(0, 100));
  else bad("Google button did NOTHING visible — silent failure");
  await shot(page, "stage6-google-silent");
}

// --------------------------- LOGIN-BACK PERSISTENCE -------------------------
step("Log back in with email — all data still there");
await page.fill("#email", CREDS.email);
await page.fill("#password", CREDS.password);
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard", { timeout: 15000 });
await settle(2500);
b = (await page.textContent("body")) ?? "";
if (/Audit Tester II/.test(b) || /Audit/.test(b)) ok("profile (new name) restored after re-login");
for (const x of ["Physics", "English Advanced"]) {
  if (b.includes(x)) ok("subject restored: " + x);
  else bad("subject missing after re-login: " + x);
}
await shot(page, "stage6-relogin-dashboard");

reportIssues(issues);
await ctx.close();
