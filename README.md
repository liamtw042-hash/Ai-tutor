# StudyMate HSC

**AI tutoring for the NSW HSC.** Exam-style practice, a Socratic AI tutor, and
essay feedback marked against NESA band descriptors — for the 10 major HSC
subjects.

Built with **React + Vite + TypeScript + Tailwind**, **Firebase** (auth +
Firestore), and the **Claude API** (via Vercel serverless functions).

![Dark, indigo-accented study app](public/favicon.svg)

---

## Features

- **Landing page** — HSC-specific hero, features, and free-vs-premium pricing.
- **Auth** — Firebase email/password + Google sign-in, with subject onboarding.
- **Dashboard** — subject cards, study streak, accuracy, weak topics, recent
  activity.
- **Practice** (`/practice`) — real HSC-style questions by subject & topic.
  Multiple choice with instant feedback; short-answer and extended-response
  marked by AI against NESA criteria. Weak topics are tracked automatically.
- **AI Tutor** (`/tutor`) — a chat tutor that uses the **Socratic method** to
  guide you to the answer, remembers the conversation, and offers suggested
  questions per subject.
- **Essay Feedback** (`/essay`) — paste a response, pick subject and question
  type, and get structured marking (thesis, evidence, analysis, expression) plus
  a band estimate and prioritised next steps.
- **Freemium** — Free: 10 practice questions, 5 tutor messages, 2 essay reviews
  per day. Premium ($9.99/mo): unlimited everything + analytics + past-paper
  mode.

### Subjects

Mathematics Advanced · Mathematics Extension 1 · English Advanced ·
English Standard · Biology · Chemistry · Physics · Modern History ·
Economics · Business Studies

The app ships with **50 HSC-style questions** (5 per subject) in
`src/data/questions.ts`, aligned to NESA syllabus outcomes.

---

## Architecture

```
api/                 Vercel serverless functions (Claude proxy — key stays server-side)
  _lib.ts            Shared Anthropic client + JSON helpers (MODEL constant lives here)
  tutor.ts           Socratic tutor chat
  mark.ts            Marks written practice responses against criteria
  essay.ts           Structured essay/extended-response marking
src/
  data/              Subjects + seed question bank
  lib/               firebase, auth context, firestore helpers, usage limits, claude client
  components/        UI kit, app shell, auth layout, icons
  pages/             Landing, Login, Signup, Onboarding, Dashboard, Practice, Tutor, Essay
firestore.rules      Per-user security rules
scripts/             Optional Firestore question-bank seeder
```

The Claude model is set once in [`api/_lib.ts`](api/_lib.ts):
`MODEL = "claude-sonnet-4-6"`.

### Firestore data model

- `users/{uid}` — profile, subjects, streak, premium status, aggregate stats
- `users/{uid}/attempts` — question attempts and scores
- `users/{uid}/sessions` — tutor chat sessions
- `questions/{id}` — question bank (optional; the app also bundles it locally)

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env` and fill in:

```bash
# Firebase web config (safe to expose)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Claude API key — SERVER SIDE ONLY (never prefixed with VITE_)
ANTHROPIC_API_KEY=...
```

> Without Firebase keys the app runs in **demo mode**: you can browse the whole
> UI and question bank; auth and saved progress are disabled.

### 3. Firebase setup

1. Create a Firebase project and a **Web app**.
2. Enable **Authentication → Email/Password** and **Google**.
3. Create a **Cloud Firestore** database.
4. Deploy the security rules in [`firestore.rules`](firestore.rules).

### 4. Run

```bash
npm run dev        # Vite dev server (UI only; /api needs Vercel — see below)
npm run build      # tsc --noEmit && vite build  (zero errors)
npm run typecheck  # tsc --noEmit
```

The `/api/*` AI endpoints are Vercel serverless functions. To run them locally,
use the Vercel CLI:

```bash
npm i -g vercel
vercel dev
```

---

## Deploy (Vercel)

1. Import the repo into Vercel.
2. Add all `VITE_FIREBASE_*` vars **and** `ANTHROPIC_API_KEY` in
   Project → Settings → Environment Variables.
3. Deploy. `vercel.json` wires the SPA rewrite and Vite build; functions in
   `api/` are detected automatically.

---

## Seeding the question bank to Firestore (optional)

The app works without this — questions are bundled. To also store them in
Firestore:

```bash
npm run seed:build                    # regenerate scripts/questions.seed.json from source
npm i -D firebase-admin
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npm run seed:upload
```

---

## Notes

- Freemium counters live in `localStorage` for this starter; enforce them
  server-side (e.g. a `usage/{uid}/{day}` Firestore doc) before charging real
  money.
- Not affiliated with or endorsed by NESA. Questions are original, syllabus-aligned items.
