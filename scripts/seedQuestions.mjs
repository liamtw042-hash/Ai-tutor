// ---------------------------------------------------------------------------
// Seed the Firestore `questions` collection from scripts/questions.seed.json.
//
// The web app already ships with these questions bundled (src/data/questions.ts)
// so it works without this step. Run this only if you also want the question
// bank stored in Firestore (e.g. to manage it from the console).
//
// Usage:
//   1. npm i -D firebase-admin
//   2. Download a service-account key from the Firebase console and either set
//      GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
//      or pass it as the first CLI argument.
//   3. node scripts/seedQuestions.mjs [./serviceAccount.json]
//
// Regenerate questions.seed.json from the source of truth with:
//   npm run seed:build
// ---------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const admin = await import("firebase-admin").catch(() => {
    console.error(
      "\n✖ firebase-admin is not installed. Run:  npm i -D firebase-admin\n",
    );
    process.exit(1);
  });

  const keyPath = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    const serviceAccount = JSON.parse(readFileSync(resolve(keyPath), "utf8"));
    admin.default.initializeApp({
      credential: admin.default.credential.cert(serviceAccount),
    });
  } else {
    // Falls back to application default credentials.
    admin.default.initializeApp();
  }

  const db = admin.default.firestore();
  const questions = JSON.parse(
    readFileSync(resolve(__dirname, "questions.seed.json"), "utf8"),
  );

  console.log(`Seeding ${questions.length} questions…`);
  let batch = db.batch();
  let ops = 0;
  for (const q of questions) {
    batch.set(db.collection("questions").doc(q.id), q, { merge: true });
    if (++ops % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log("✔ Done. Question bank uploaded to Firestore.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
