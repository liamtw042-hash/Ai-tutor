import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui";
import { SUBJECTS } from "@/data/subjects";
import { DISCLAIMERS, NESA_LINKS } from "@/data/nesa";
import {
  ArrowRightIcon,
  BoltIcon,
  BrainIcon,
  CalendarIcon,
  CardsIcon,
  ChartIcon,
  ChatIcon,
  CheckIcon,
  ClockIcon,
  DocIcon,
  FlameIcon,
  PenIcon,
  SparkIcon,
} from "@/components/icons";
import { useAuth } from "@/lib/auth";

const FEATURES = [
  {
    icon: BrainIcon,
    title: "Spaced repetition that actually works",
    body: "A real SM-2 engine schedules every question and flashcard for the moment before you'd forget it. Apps with true spaced repetition hit ~89% retention vs ~74% without — that's the gap between Band 4 and Band 6.",
  },
  {
    icon: PenIcon,
    title: "HSC-style practice, endless supply",
    body: "A curated bank of exam-style questions per subject — plus AI that writes fresh, NESA-authentic questions on any syllabus topic, on demand.",
  },
  {
    icon: ChatIcon,
    title: "A tutor that asks, not tells",
    body: "The AI tutor knows your weak topics and uses the Socratic method — guiding you to the answer with questions, the way a great $90/hr tutor does.",
  },
  {
    icon: CardsIcon,
    title: "Flashcards, made or generated",
    body: "Build decks yourself or generate them from any topic in seconds. Study with flip, write and match modes — all feeding the same memory engine.",
  },
  {
    icon: DocIcon,
    title: "Essay marking against NESA bands",
    body: "Structured feedback on thesis, evidence, analysis and expression — each criterion placed on the band scale, with your scores tracked over time.",
  },
  {
    icon: ClockIcon,
    title: "Past-paper mode under real pressure",
    body: "Timed exam sessions marked by AI against NESA criteria, so the real thing feels familiar instead of terrifying.",
  },
  {
    icon: CalendarIcon,
    title: "A study plan built around your exams",
    body: "Enter your exam dates and available hours — get a week-by-week schedule that weights your weak topics and switches to past papers as exams close in.",
  },
  {
    icon: ChartIcon,
    title: "Progress you can actually see",
    body: "Streaks, XP, mastery per topic, accuracy trends and a study heatmap — real data from your work, never inflated numbers.",
  },
];

const LOOP = [
  {
    icon: FlameIcon,
    t: "Show up",
    d: "A daily goal and streak make 20 minutes a day the default, not the exception.",
  },
  {
    icon: BrainIcon,
    t: "Recall, don't re-read",
    d: "Everything is active recall — questions and flashcards, never passive highlighting.",
  },
  {
    icon: BoltIcon,
    t: "Review on schedule",
    d: "Spaced repetition resurfaces exactly what you're about to forget. Ten minutes clears it.",
  },
  {
    icon: ChartIcon,
    t: "Attack weak spots",
    d: "Your dashboard always knows the topics costing you marks — and points your next session at them.",
  },
];

export default function Landing() {
  const { user } = useAuth();
  const goto = user ? "/dashboard" : "/signup";

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <a href="#pricing" className="btn-ghost hidden sm:inline-flex">
              Pricing
            </a>
            <Link to="/login" className="btn-ghost hidden sm:inline-flex">
              Log in
            </Link>
            <Link to={goto} className="btn-primary">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              className="mb-5 flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Badge tone="brand">
                <SparkIcon className="h-3.5 w-3.5" /> For NSW students, Years 10–12
                — aligned to NESA syllabuses
              </Badge>
            </motion.div>
            <motion.h1
              className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              The tutor that remembers
              <br />
              <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent">
                what you forget
              </span>
            </motion.h1>
            <motion.p
              className="mx-auto mt-6 max-w-2xl text-lg text-ink-300"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
            >
              Private tutors cost $50–90 an hour and see you once a week.
              StudyMate combines spaced repetition, endless HSC-style practice
              and a Socratic AI tutor that knows your weak topics — every day,
              for less than a single tutoring session a month.
            </motion.p>
            <motion.div
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
            >
              <Link to={goto} className="btn-primary px-6 py-3 text-base">
                Start studying free <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <a href="#method" className="btn-ghost px-6 py-3 text-base">
                Why it works
              </a>
            </motion.div>
            <p className="mt-4 text-sm text-ink-500">
              Free forever plan · No credit card · Years 10–12 · 10 subjects
            </p>
          </div>

          {/* subject chips */}
          <div className="mt-16 flex flex-wrap justify-center gap-2.5">
            {SUBJECTS.map((s) => (
              <span
                key={s.id}
                className="chip"
                style={{ borderColor: `${s.gradient[0]}33` }}
              >
                <span aria-hidden>{s.icon}</span>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* The method */}
      <section id="method" className="border-y border-white/5 bg-ink-900/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-10 text-center">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
              The science, not the vibes
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Built on the loop that makes studying stick
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-ink-300">
              Re-reading notes feels productive and does almost nothing. Active
              recall + spaced repetition + a daily habit is what the memory
              research actually supports — so that's the whole product.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LOOP.map(({ icon: Icon, t, d }, i) => (
              <div key={t} className="relative rounded-2xl border border-white/5 bg-ink-900/50 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/25">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-display text-2xl font-bold text-brand-500/50">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-white">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
            Everything in one place
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Eight tools that move your marks
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="card group p-6 transition hover:border-white/15"
            >
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/25">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Honest social proof */}
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-white/5 bg-ink-900/50 p-6 text-center sm:p-8">
          <p className="text-sm leading-relaxed text-ink-300">
            <span className="font-semibold text-white">Straight up:</span>{" "}
            StudyMate is new and pre-launch, and we're not going to invent fake
            testimonials to pretend otherwise. The learning science it's built
            on — the testing effect, SM-2 spaced repetition, Socratic tutoring —
            has decades of evidence behind it. Try the free plan, judge it on
            your own marks, and tell us what to build next.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
            Pricing
          </div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Start free. Upgrade when you're serious.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-300">
            A whole month of Premium costs less than half an hour with a private
            tutor — and far less than Edrolo. Cancel anytime.
          </p>
        </div>
        <div className="grid items-start gap-5 md:grid-cols-2">
          {/* Free */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white">Free</h3>
            <p className="mt-1 text-sm text-ink-400">
              The full study loop, every day.
            </p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold text-white">$0</span>
              <span className="text-ink-400">/forever</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "15 practice questions per day",
                "Unlimited spaced-repetition reviews",
                "10 AI tutor messages per day",
                "1 essay review per day",
                "Flashcard decks + all study modes",
                "Streaks, XP, badges & daily goals",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-ink-200">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to={goto} className="btn-ghost mt-7 w-full">
              Get started
            </Link>
          </div>

          {/* Premium */}
          <div className="card relative overflow-hidden border-brand-500/40 p-6">
            <div className="absolute right-5 top-5">
              <Badge tone="brand">
                <BoltIcon className="h-3.5 w-3.5" /> Serious mode
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-white">Premium</h3>
            <p className="mt-1 text-sm text-ink-400">
              For students going all-in on a Band 6.
            </p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold text-white">
                $20
              </span>
              <span className="text-ink-400">/month AUD</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Unlimited practice, tutoring & essay marking",
                "Unlimited AI question & flashcard generation",
                "Snap a photo of your work — AI reads & marks it",
                "Timed past-paper exam mode, AI-marked",
                "Personalised study plan to your exam dates",
                "Full progress analytics",
                "Everything in Free, uncapped",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-ink-100">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to={goto} className="btn-primary mt-7 w-full">
              Go Premium
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-600/20 via-ink-900 to-ink-900 p-10 text-center sm:p-14">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Your exams won't study for themselves.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-300">
            Twenty minutes a day, aimed at exactly the right topics. Start the
            streak tonight.
          </p>
          <Link
            to={goto}
            className="btn-primary mx-auto mt-7 w-fit px-6 py-3 text-base"
          >
            Create your free account <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Official NESA resources */}
      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <div className="rounded-2xl border border-white/5 bg-ink-900/40 p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold text-white">
            Go straight to the source
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-400">
            StudyMate is a study aid — the official NSW syllabuses, past papers
            and marking guidelines are free and always the final word. Bookmark
            these:
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {NESA_LINKS.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-white/15 hover:bg-white/5"
              >
                <p className="text-sm font-semibold text-brand-200">
                  {l.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-400">
                  {l.description}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <Logo size={26} />
            <p className="text-sm text-ink-500">
              © {new Date().getFullYear()} StudyMate · Made for NSW students,
              Years 10–12. Not affiliated with NESA.
            </p>
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-ink-600">
            {DISCLAIMERS.general}
          </p>
        </div>
      </footer>
    </div>
  );
}
