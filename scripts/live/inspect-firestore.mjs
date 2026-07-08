// Ground-truth check: what has ACTUALLY been written to Firestore for the
// audit account? Uses the Admin SDK (bypasses security rules), so any gap
// between UI activity and these documents = a silent client-side save failure.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const env = readFileSync(join(ROOT, ".env.local"), "utf8");
const svcLine = env.split("\n").find((l) => l.startsWith("FIREBASE_SERVICE_ACCOUNT="));
const svc = JSON.parse(svcLine.slice("FIREBASE_SERVICE_ACCOUNT=".length));

const app = initializeApp({
  credential: cert({
    projectId: svc.project_id,
    clientEmail: svc.client_email,
    privateKey: svc.private_key,
  }),
});
const db = getFirestore(app);

const EMAIL = process.argv[2] || "smaudit1@example.com";
const user = await getAuth(app).getUserByEmail(EMAIL);
console.log("uid:", user.uid, "| email:", EMAIL);

const profile = await db.doc(`users/${user.uid}`).get();
if (!profile.exists) {
  console.log("!! NO PROFILE DOC");
} else {
  const p = profile.data();
  console.log("\n== profile ==");
  console.log({
    yearLevel: p.yearLevel,
    subjects: p.subjects,
    subjectLevels: p.subjectLevels,
    dailyGoal: p.dailyGoal,
    xp: p.xp,
    streak: p.streak,
    questionsAnswered: p.questionsAnswered,
    correctCount: p.correctCount,
    onboarded: p.onboarded,
  });
}

for (const sub of ["attempts", "srs", "sessions", "days", "decks", "essays", "exams", "usage", "plans", "uploads"]) {
  const snap = await db.collection(`users/${user.uid}/${sub}`).limit(50).get();
  console.log(`\n== ${sub} (${snap.size}) ==`);
  snap.docs.slice(0, 5).forEach((d) => {
    const data = d.data();
    const summary = JSON.stringify(data).slice(0, 180);
    console.log(`  ${d.id}: ${summary}`);
  });
}
process.exit(0);
