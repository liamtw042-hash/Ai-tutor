// Regenerate scripts/questions.seed.json from the app's source of truth
// (src/data/questions.ts) so the Firestore seeder never drifts from the app.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  resolve(__dirname, "../src/data/questions.ts"),
  "utf8",
);
const start = src.indexOf("= [");
const end = src.indexOf("];", start);
// The data array is valid JS object-literal syntax; evaluate it directly.
const QUESTIONS = eval("(" + src.slice(start + 2, end + 1) + ")");
writeFileSync(
  resolve(__dirname, "questions.seed.json"),
  JSON.stringify(QUESTIONS, null, 2),
);
console.log(`Wrote ${QUESTIONS.length} questions to questions.seed.json`);
