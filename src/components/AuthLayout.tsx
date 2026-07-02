import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { CheckIcon } from "@/components/icons";

const POINTS = [
  "Exam-style questions across all 10 HSC subjects",
  "An AI tutor that guides you to the answer",
  "Essay feedback marked against NESA bands",
];

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="relative hidden overflow-hidden border-r border-white/5 bg-ink-900/40 p-10 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 50% at 30% 10%, rgba(124,101,241,0.22), transparent 60%)",
          }}
        />
        <Logo />
        <div className="relative max-w-md">
          <h2 className="font-display text-3xl font-bold leading-tight text-white">
            Everything you need to walk into the exam room ready.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-ink-200">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500/20 text-brand-300 ring-1 ring-inset ring-brand-500/30">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-ink-500">
          Trusted study companion for the NSW HSC.
        </p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-400">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
