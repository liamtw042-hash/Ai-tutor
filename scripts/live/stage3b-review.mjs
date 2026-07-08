import { BASE, launch, step, ok, bad, shot, reportIssues } from "./helper.mjs";
const { ctx, page, issues } = await launch();
const settle = (ms) => page.waitForTimeout(ms);

step("Review — wait properly for load to resolve");
await page.goto(BASE + "/review", { waitUntil: "load" });
try {
  await page.waitForSelector("text=/Show answer|Nothing due|Review complete/i", { timeout: 30000 });
  const t = Date.now();
  ok("review resolved");
} catch {
  bad("review STILL stuck on spinner after 30s");
  await shot(page, "stage3b-stuck");
  await ctx.close();
  process.exit(1);
}
const body = (await page.textContent("body")) ?? "";
if (body.includes("Nothing due")) { bad("shows Nothing due — but 3 items are due today"); await shot(page, "stage3b-nothing-due"); }
else ok("queue rendered: " + (body.match(/\d+ left[^·]*/)?.[0] ?? "?"));
await shot(page, "stage3b-queue");

step("Grade one Good (check interval preview)");
await page.getByRole("button", { name: /Show answer/ }).click();
await settle(400);
const good = page.getByRole("button", { name: /Good/ });
ok("preview: " + ((await good.textContent()) ?? "").replace(/\s+/g, " "));
await good.click();
await settle(1000);

step("Grade one Again then clear queue");
let cleared = 0;
for (let i = 0; i < 10; i++) {
  const show = page.getByRole("button", { name: /Show answer/ });
  if ((await show.count()) === 0) break;
  await show.click();
  await settle(300);
  const btn = i === 0 ? page.getByRole("button", { name: /Again/ }) : page.getByRole("button", { name: /Good/ });
  await btn.click();
  await settle(800);
  cleared++;
}
const done = (await page.textContent("body")) ?? "";
if (/Review complete/i.test(done)) ok(`completion screen reached after ${cleared} more grades, XP shown`);
else bad("no completion screen; state: " + done.slice(0, 100));
await shot(page, "stage3b-complete");
reportIssues(issues);
await ctx.close();
