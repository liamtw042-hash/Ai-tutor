// Stage 1 — real signup, full onboarding (year level, subjects incl. an
// accelerated one, daily goal), landing on the dashboard.

import { BASE, CREDS, launch, step, ok, bad, shot, reportIssues } from "./helper.mjs";

const { ctx, page, issues } = await launch();

step("Landing page loads");
await page.goto(BASE + "/", { waitUntil: "networkidle" });
ok("title: " + (await page.title()));

step("Signup with email/password");
await page.goto(BASE + "/signup", { waitUntil: "networkidle" });
await page.fill("#name", CREDS.name);
await page.fill("#email", CREDS.email);
await page.fill("#password", CREDS.password);
await page.click('button[type="submit"]');
// Either we land on /onboarding (new account) or an "already exists" error
// shows (from a previous run) → then log in instead.
try {
  await page.waitForURL("**/onboarding", { timeout: 12000 });
  ok("new account created → onboarding");
} catch {
  const err = await page.locator("p.text-red-300").textContent().catch(() => "");
  if (err?.includes("already exists")) {
    ok("account exists from a prior run → logging in instead");
    await page.goto(BASE + "/login");
    await page.fill("#email", CREDS.email);
    await page.fill("#password", CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|onboarding/, { timeout: 12000 });
    // Re-run onboarding deliberately so this stage still tests it.
    await page.goto(BASE + "/onboarding", { waitUntil: "networkidle" });
  } else {
    bad("signup failed, no redirect. Visible error: " + err);
    await shot(page, "stage1-signup-failed");
    await ctx.close();
    process.exit(1);
  }
}
await shot(page, "stage1-onboarding-initial");

step("Pick Year 11");
await page.getByRole("button", { name: /Year 11/ }).click();
ok("year 11 selected");

step("Select subjects (incl. searching)");
const search = page.getByLabel("Search subjects");
for (const name of ["Physics", "English Advanced", "Mathematics Advanced"]) {
  await search.fill(name.toLowerCase().split(" ")[0]);
  await page.waitForTimeout(250);
  const cardBtn = page
    .locator("div.rounded-xl.border", { hasText: name })
    .locator("button")
    .first();
  await cardBtn.click();
  ok("selected: " + name);
}
await search.fill("");
await page.waitForTimeout(250);

step("Make Mathematics Advanced ACCELERATED (study at Yr 12)");
const mathCard = page.locator("div.rounded-xl.border", { hasText: "Mathematics Advanced" }).first();
const accelPill = mathCard.getByRole("button", { name: /Yr 12/ });
if ((await accelPill.count()) === 0) {
  bad("no accelerated level pill offered for Mathematics Advanced at base year 11");
  await shot(page, "stage1-no-accel-pill");
} else {
  await accelPill.first().click();
  ok("Mathematics Advanced set to Yr 12 (accelerated)");
}
await shot(page, "stage1-subjects-picked");

step("Set daily goal to Serious (20)");
await page.getByRole("button", { name: /Serious/ }).click();
ok("goal set");

step("Continue to dashboard");
await page.getByRole("button", { name: /Continue to dashboard/ }).click();
await page.waitForURL("**/dashboard", { timeout: 15000 });
await page.waitForTimeout(1500);
await shot(page, "stage1-dashboard");
ok("landed on dashboard");

step("Verify onboarding data visible on dashboard");
const body = await page.textContent("body");
for (const expect of ["Physics", "English Advanced", "Mathematics Advanced"]) {
  if (body?.includes(expect)) ok(`dashboard shows ${expect}`);
  else bad(`dashboard missing subject: ${expect}`);
}

step("Refresh — does everything persist?");
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const body2 = await page.textContent("body");
if (page.url().includes("/dashboard")) ok("still on dashboard after refresh (auth persisted)");
else bad("refresh bounced to " + page.url());
for (const expect of ["Physics", "Mathematics Advanced"]) {
  if (body2?.includes(expect)) ok(`after refresh, still shows ${expect}`);
  else bad(`after refresh, missing: ${expect}`);
}
await shot(page, "stage1-dashboard-after-refresh");

reportIssues(issues);
await ctx.close();
