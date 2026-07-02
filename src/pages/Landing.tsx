import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui";
import { SUBJECTS } from "@/data/subjects";
import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  ChatIcon,
  DocIcon,
  PenIcon,
  SparkIcon,
  TargetIcon,
} from "@/components/icons";
import { useAuth } from "@/lib/auth";

const FEATURES = [
  {
    icon: PenIcon,
    title: "Real HSC-style practice",
    body: "Bank of exam-style questions organised by subject and topic — multiple choice, short answer and extended response, with instant feedback.",
  },
  {
    icon: ChatIcon,
    title: "A tutor that asks, not tells",
    body: "Your AI tutor uses the Socratic method to guide you to the answer, so you actually understand it — not just copy it.",
  },
  {
    icon: DocIcon,
    title: "Essay marking against NESA bands",
    body: "Paste an extended response and get structured feedback on thesis, evidence, analysis and expression, scored against the marking criteria.",
  },
  {
    icon: TargetIcon,
    title: "Know your weak topics",
    body: "Every attempt is tracked so you can see exactly which syllabus areas need work before the exam.",
  },
];

const STEPS = [
  { n: "01", t: "Pick your subjects", d: "Choose from all 10 major HSC courses during a 30-second setup." },
  { n: "02", t: "Practise & ask", d: "Work through questions and chat to your tutor whenever you're stuck." },
  { n: "03", t: "Get exam-ready", d: "Track weak topics, refine essays, and walk in confident." },
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
            <div className="mb-5 flex justify-center animate-fade-in">
              <Badge tone="brand">
                <SparkIcon className="h-3.5 w-3.5" /> Built for the NSW HSC —
                aligned to NESA syllabuses
              </Badge>
            </div>
            <h1 className="animate-fade-up font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Ace the HSC with a tutor
              <br />
              that works{" "}
              <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent">
                the way you do
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-lg text-ink-300 [animation-delay:80ms]">
              StudyMate HSC gives NSW students exam-style practice, an AI tutor
              that guides instead of spoon-feeds, and essay feedback marked
              against real NESA criteria. Study smarter for every Band 6.
            </p>
            <div className="mt-9 flex animate-fade-up flex-col items-center justify-center gap-3 [animation-delay:160ms] sm:flex-row">
              <Link to={goto} className="btn-primary px-6 py-3 text-base">
                Start studying free <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <a href="#features" className="btn-ghost px-6 py-3 text-base">
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-ink-500">
              Free forever plan · No credit card · 10 subjects
            </p>
          </div>

          {/* subject marquee */}
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

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-300">
            Everything in one place
          </div>
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Four tools that actually move your marks
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="card group p-6 transition hover:border-brand-500/30"
            >
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/25">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-white/5 p-6">
              <div className="font-display text-3xl font-bold text-brand-500/60">
                {s.n}
              </div>
              <h3 className="mt-3 font-semibold text-white">{s.t}</h3>
              <p className="mt-1.5 text-sm text-ink-300">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-300">
            Pricing
          </div>
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Start free. Upgrade when you're serious.
          </h2>
        </div>
        <div className="grid items-start gap-5 md:grid-cols-2">
          {/* Free */}
          <div className="card p-7">
            <h3 className="text-lg font-semibold text-white">Free</h3>
            <p className="mt-1 text-sm text-ink-400">
              Everything you need to get moving.
            </p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold text-white">$0</span>
              <span className="text-ink-400">/forever</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "10 practice questions per day",
                "5 AI tutor messages per day",
                "Basic essay feedback",
                "All 10 subjects & topic tracking",
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
          <div className="card relative overflow-hidden border-brand-500/40 p-7 shadow-glow">
            <div className="absolute right-5 top-5">
              <Badge tone="brand">
                <BoltIcon className="h-3.5 w-3.5" /> Most popular
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-white">Premium</h3>
            <p className="mt-1 text-sm text-ink-400">
              For students going all-in on a Band 6.
            </p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold text-white">
                $9.99
              </span>
              <span className="text-ink-400">/month</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Unlimited practice questions",
                "Unlimited AI tutor messages",
                "Detailed essay marking & rewrites",
                "Advanced analytics & weak-topic insights",
                "Past paper exam mode",
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
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Your HSC won't study for itself.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-300">
            Join StudyMate and turn revision into real marks — one question at a
            time.
          </p>
          <Link
            to={goto}
            className="btn-primary mx-auto mt-7 w-fit px-6 py-3 text-base"
          >
            Create your free account <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo size={26} />
          <p className="text-sm text-ink-500">
            © {new Date().getFullYear()} StudyMate HSC · Made for NSW students.
            Not affiliated with NESA.
          </p>
        </div>
      </footer>
    </div>
  );
}
