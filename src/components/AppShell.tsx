import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { isPremium } from "@/lib/premium";
import { Badge, Button, Progress, cn } from "@/components/ui";
import { levelProgress, levelTitle } from "@/lib/xp";
import {
  BrainIcon,
  CardsIcon,
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  ClockIcon,
  DocIcon,
  FlameIcon,
  GridIcon,
  HomeIcon,
  LockIcon,
  LogoutIcon,
  PenIcon,
  SettingsIcon,
  SparkIcon,
  UploadIcon,
  XIcon,
} from "@/components/icons";

interface NavItem {
  to: string;
  label: string;
  icon: (p: { className?: string }) => JSX.Element;
  premium?: boolean;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Study",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: HomeIcon },
      { to: "/review", label: "Review", icon: BrainIcon },
      { to: "/practice", label: "Practice", icon: PenIcon },
      { to: "/flashcards", label: "Flashcards", icon: CardsIcon },
    ],
  },
  {
    title: "AI Coach",
    items: [
      { to: "/tutor", label: "AI Tutor", icon: ChatIcon },
      { to: "/upload", label: "Photo & Docs", icon: UploadIcon, premium: true },
      { to: "/essay", label: "Essay Feedback", icon: DocIcon },
    ],
  },
  {
    title: "Level Up",
    items: [
      { to: "/exam", label: "Exam Mode", icon: ClockIcon, premium: true },
      { to: "/planner", label: "Study Plan", icon: CalendarIcon, premium: true },
      { to: "/progress", label: "Progress", icon: ChartIcon },
    ],
  },
  {
    title: "Account",
    items: [{ to: "/settings", label: "Settings", icon: SettingsIcon }],
  },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useAuth();
  return (
    <nav className="flex flex-col gap-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            {section.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.items.map(({ to, label, icon: Icon, premium }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-brand-500/15 text-white ring-1 ring-inset ring-brand-500/30"
                      : "text-ink-300 hover:bg-white/5 hover:text-ink-100",
                  )
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{label}</span>
                {premium && !isPremium(profile) && (
                  <LockIcon className="h-3.5 w-3.5 text-ink-500" />
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function StreakXpStrip({ compact }: { compact?: boolean }) {
  const { profile } = useAuth();
  if (!profile) return null;
  const lp = levelProgress(profile.xp ?? 0);
  return (
    <div className={cn("flex items-center gap-2", compact && "gap-1.5")}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset",
          (profile.streak ?? 0) > 0
            ? "bg-amber-500/12 text-amber-300 ring-amber-500/25"
            : "bg-white/5 text-ink-400 ring-white/10",
        )}
        title={`${profile.streak} day streak`}
      >
        <FlameIcon className="h-3.5 w-3.5" />
        {profile.streak ?? 0}
      </span>
      <span
        className="inline-flex items-center gap-1 rounded-full bg-brand-500/12 px-2.5 py-1 text-xs font-bold text-brand-200 ring-1 ring-inset ring-brand-500/25"
        title={`${profile.xp ?? 0} XP — ${levelTitle(lp.level)}`}
      >
        <SparkIcon className="h-3.5 w-3.5" />
        Lv {lp.level}
      </span>
    </div>
  );
}

function LevelCard() {
  const { profile } = useAuth();
  if (!profile) return null;
  const lp = levelProgress(profile.xp ?? 0);
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink-100">Level {lp.level}</span>
        <span className="text-ink-400">
          {lp.into}/{lp.span} XP
        </span>
      </div>
      <Progress value={lp.pct} className="mt-2 h-1.5" />
      <p className="mt-1.5 text-[11px] text-ink-400">{levelTitle(lp.level)}</p>
    </div>
  );
}

function UpgradeCard() {
  const { profile, togglePremium } = useAuth();
  if (isPremium(profile)) {
    return (
      <div className="rounded-2xl border border-brand-500/25 bg-brand-500/10 p-4">
        <Badge tone="brand">
          <SparkIcon className="h-3.5 w-3.5" /> Premium
        </Badge>
        <p className="mt-2 text-xs text-ink-300">
          Unlimited practice, tutoring, exam mode and study plans unlocked.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-brand-500/15 to-transparent p-4">
      <p className="text-sm font-semibold text-white">Go Premium</p>
      <p className="mt-1 text-xs text-ink-300">
        Unlimited AI, past-paper mode, study plans & analytics.
      </p>
      <Button
        variant="primary"
        className="mt-3 w-full text-xs"
        onClick={togglePremium}
      >
        Upgrade — $20/mo
      </Button>
      <p className="mt-1.5 text-center text-[10px] text-ink-500">
        Demo: toggles instantly, no card required
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = (profile?.displayName || "S")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-white/5 bg-ink-900/40 p-4 lg:flex">
        <div>
          <div className="flex items-center justify-between px-2 py-2">
            <Logo />
          </div>
          <div className="mt-2 px-2">
            <StreakXpStrip />
          </div>
          <div className="mt-5">
            <NavItems />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <LevelCard />
          <UpgradeCard />
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              {initials}
            </div>
            <Link to="/settings" className="min-w-0 flex-1" title="Settings">
              <p className="truncate text-sm font-medium text-ink-100 hover:text-white">
                {profile?.displayName || "Student"}
              </p>
              <p className="truncate text-xs text-ink-400">
                {isPremium(profile) ? "Premium plan" : "Free plan"}
              </p>
            </Link>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="rounded-lg p-1.5 text-ink-400 hover:bg-white/10 hover:text-ink-100"
            >
              <LogoutIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-ink-950/80 px-4 py-3 backdrop-blur lg:hidden">
          <Logo size={28} />
          <div className="flex items-center gap-2">
            <StreakXpStrip compact />
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="btn-ghost px-3 py-2"
              aria-label="Menu"
            >
              {mobileOpen ? (
                <XIcon className="h-5 w-5" />
              ) : (
                <GridIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </header>
        {mobileOpen && (
          <div className="border-b border-white/5 bg-ink-900/95 p-4 lg:hidden">
            <NavItems onNavigate={() => setMobileOpen(false)} />
            <div className="mt-4 space-y-3">
              <LevelCard />
              <Button variant="ghost" className="w-full" onClick={handleSignOut}>
                <LogoutIcon className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
