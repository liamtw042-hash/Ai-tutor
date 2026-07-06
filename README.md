# StudyMate HSC

**AI tutoring for the NSW HSC, built on the study loop that actually works:**
active recall + SM-2 spaced repetition + a daily habit — plus a Socratic AI
tutor, AI-generated practice, essay marking against NESA bands, timed
past-paper mode and personalised study plans.

Built with **React + Vite + TypeScript + Tailwind + Framer Motion**,
**Firebase** (auth + Firestore), and the **Claude API** (via Vercel serverless
functions).

---

## Features

### The learning engine
- **Spaced repetition (SM-2)** — every practice question and flashcard is
  scheduled on a real SM-2 curve. Wrong answers come back tomorrow; nailed ones
  space out to weeks. A daily **Review** queue surfaces exactly what to revise.
- **Mastery tracking** — concept-level mastery per topic per subject:
  recency-weighted accuracy, discounted by coverage. Weak topics are surfaced
  on the dashboard as "focus areas".
- **Practice** — seeded HSC-style bank (50 questions across 10 subjects) with
  instant feedback and worked solutions, **plus AI-generated questions** on any
  syllabus topic, in authentic NESA style.
- **Flashcards** — hand-made or AI-generated decks per subject/topic. Study
  with **flip**, **write**, and **match** modes; flip/write feed the SR queue.

### The habit loop
- **Daily goal** with progress ring (questions + reviews per day, set at
  onboarding).
- **Streaks** (Sydney-midnight rollover), **XP + levels**, **achievement
  badges**, GitHub-style **study heatmap**.
- **Anonymous opt-in leaderboard** (alias only, leave anytime).

### The AI coach
- **Socratic AI Tutor** — guides with questions, refuses to just hand over
  answers, and *knows your weak topics* from real attempt data. Talk to it
  hands-free with **voice input & spoken replies** (Web Speech API, with a
  graceful text-only fallback where unsupported).
- **Essay feedback** — marked holistically against NESA band descriptors, with
  a band estimate per criterion (thesis, evidence, analysis, expression) and
  band history over time.
- **Study plans (Premium)** — enter exam dates + weekly hours; AI builds a
  week-by-week countdown weighted toward weak topics, shifting to past papers
  near exams.
- **Exam mode (Premium)** — timed past-paper-style sessions, AI-marked, with a
  full per-question breakdown.
- **Progress analytics** — accuracy trends, topic breakdowns, essay bands —
  real data with honest empty states (basic free, detailed = Premium).

### Freemium
Free: 15 questions/day, unlimited reviews, 10 tutor messages/day, 1 essay/day,
1 AI generation + 1 AI deck/day, all gamification.
Premium ($9.99/mo, demo toggle): unlimited everything + exam mode + study plans
+ detailed analytics.

### Subjects
Mathematics Advanced · Mathematics Extension 1 · English Advanced ·
English Standard · Biology · Chemistry · Physics · Modern History ·
Economics · Business Studies

---

## Architecture

```
api/                 Vercel serverless functions (Claude proxy — key stays server-side)
  _lib.ts            Shared Anthropic client + JSON helpers (MODEL, override via ANTHROPIC_MODEL)
  tutor.ts           Socratic tutor chat (weak-topic aware)
  mark.ts            Marks written practice responses against criteria
  essay.ts           Essay marking against NESA band descriptors
  generate.ts        AI question generation (HSC style)
  flashcards.ts      AI flashcard deck generation
  plan.ts            Personalised study plan generation
src/
  data/              Subjects + seed question bank
  lib/               firebase, auth, firestore, sm2, xp, badges, mastery, usage, dates, claude
  components/        UI kit (incl. ProgressRing, Modal, Heatmap), app shell, icons
  pages/             Landing, auth, Onboarding, Dashboard, Review, Practice,
                     Flashcards, Tutor, Essay, Exam, Planner, Progress
firestore.rules      Owner-only rules + opt-in leaderboard
scripts/             Optional Firestore question-bank seeder
```

### Firestore data model (all under `users/{uid}`, owner-only)

- profile doc — subjects, streak/bestStreak, XP, dailyGoal, badges, premium
- `attempts/` — every question attempt (feeds mastery + analytics)
- `srs/` — SM-2 items (snapshotted content, ease/interval/reps/due)
- `days/{yyyy-mm-dd}` — per-day counters (goal ring, heatmap)
- `decks/{id}/cards/` — flashcard decks
- `exams/` — past-paper session results
- `essays/` — essay feedback history
- `plans/current` — active study plan
- `sessions/` — tutor chats

Plus world-readable-to-signed-in `questions/` (seed bank) and the opt-in
`leaderboard/{uid}` collection (alias + xp only).

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

> Without Firebase keys the app runs in **demo mode**: you can browse the UI
> and question bank; auth and saved progress are disabled.

### 3. Firebase setup

1. Create a Firebase project and a **Web app**.
2. Enable **Authentication → Email/Password** and **Google**.
3. Create a **Cloud Firestore** database.
4. Deploy the security rules in [`firestore.rules`](firestore.rules).
5. Firestore may prompt for a composite index the first time tutor session
   history is queried (`sessions` where `subjectId` + orderBy `updatedAt`) —
   accept the console link if it appears.

### 4. Run

```bash
npm run dev        # Vite dev server (UI only; /api needs Vercel — see below)
npm run build      # tsc --noEmit && vite build  (zero errors)
npm run typecheck  # tsc --noEmit
```

The `/api/*` AI endpoints are Vercel serverless functions. To run them locally:

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

## Notes

- Freemium counters live in `localStorage` for this starter; enforce them
  server-side (e.g. a `usage/{uid}/{day}` Firestore doc) before charging real
  money.
- The leaderboard is opt-in and stores only an alias, XP, level and streak.
- Not affiliated with or endorsed by NESA. Questions are original,
  syllabus-aligned items.
